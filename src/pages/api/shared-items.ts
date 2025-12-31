import type { APIContext } from "astro";
import { and, eq, ne } from "drizzle-orm";
import {
	claims,
	groupMembers,
	groups,
	itemRecipients,
	items,
	users,
} from "@/db/schema";
import type { ClaimWithUserResponse, ItemResponse } from "@/db/types";
import { getAuthAdapter } from "@/lib/auth";
import { createDb, safeInArray } from "@/lib/db";

/**
 * GET /api/shared-items - List items shared with the current user
 * Returns items that have been shared with groups the user is a member of,
 * excluding items owned by the user themselves.
 */
export async function GET(context: APIContext) {
	const db = createDb(context.locals.runtime.env.DB);
	const auth = getAuthAdapter(context.locals.runtime.env);

	const authUser = await auth.getCurrentUser(context.request, context.locals);
	if (!authUser) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	const user = await db
		.select()
		.from(users)
		.where(eq(users.clerkId, authUser.providerId))
		.get();

	if (!user) {
		return new Response(JSON.stringify({ error: "User not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Query items shared with groups the user is a member of
	// Join: items -> itemRecipients -> groupMembers (filtered by current user)
	// Exclude items owned by the current user
	const sharedItems = await db
		.select({
			id: items.id,
			ownerId: items.ownerId,
			name: items.name,
			url: items.url,
			price: items.price,
			notes: items.notes,
			imageUrl: items.imageUrl,
			createdAt: items.createdAt,
			updatedAt: items.updatedAt,
			ownerName: users.name,
			ownerEmail: users.email,
			groupId: groups.id,
			groupName: groups.name,
		})
		.from(items)
		.innerJoin(itemRecipients, eq(items.id, itemRecipients.itemId))
		.innerJoin(groupMembers, eq(itemRecipients.groupId, groupMembers.groupId))
		.innerJoin(groups, eq(itemRecipients.groupId, groups.id))
		.innerJoin(users, eq(items.ownerId, users.id))
		.where(
			and(
				eq(groupMembers.userId, user.id),
				ne(items.ownerId, user.id), // Exclude user's own items
			),
		);

	// Deduplicate items that are shared with multiple groups the user belongs to
	// Group by item ID, collecting all groups the item is shared with
	const itemMap = new Map<
		string,
		{
			item: ItemResponse;
			owner: { id: string; name: string | null; email: string };
			sharedVia: { groupId: string; groupName: string }[];
			claims: ClaimWithUserResponse[];
			claimableAmount: number | null;
		}
	>();

	// Get unique item IDs to fetch claims
	const itemIds = [...new Set(sharedItems.map((row) => row.id))];

	// Fetch claims for all shared items with claimer user info
	// Claims are visible to recipients (non-owners) per visibility rules
	const itemClaims =
		itemIds.length > 0
			? await db
					.select({
						id: claims.id,
						itemId: claims.itemId,
						userId: claims.userId,
						amount: claims.amount,
						expiresAt: claims.expiresAt,
						createdAt: claims.createdAt,
						userName: users.name,
						userAvatarUrl: users.avatarUrl,
					})
					.from(claims)
					.innerJoin(users, eq(claims.userId, users.id))
					.where(safeInArray(claims.itemId, itemIds))
			: [];

	// Group claims by itemId for efficient lookup
	const claimsByItemId = new Map<string, typeof itemClaims>();
	for (const claim of itemClaims) {
		const existing = claimsByItemId.get(claim.itemId);
		if (existing) {
			existing.push(claim);
		} else {
			claimsByItemId.set(claim.itemId, [claim]);
		}
	}

	for (const row of sharedItems) {
		const existing = itemMap.get(row.id);
		if (existing) {
			// Add this group to the list of groups sharing this item
			existing.sharedVia.push({
				groupId: row.groupId,
				groupName: row.groupName,
			});
		} else {
			// Get claims for this item
			const rawClaims = claimsByItemId.get(row.id) ?? [];
			const formattedClaims: ClaimWithUserResponse[] = rawClaims.map((c) => ({
				id: c.id,
				itemId: c.itemId,
				userId: c.userId,
				amount: c.amount,
				expiresAt: c.expiresAt?.toISOString() ?? null,
				createdAt: c.createdAt?.toISOString() ?? null,
				user: {
					id: c.userId,
					name: c.userName,
					avatarUrl: c.userAvatarUrl,
				},
			}));

			// Calculate claimable amount for partial claims
			// If item has no price, claimableAmount is null
			// If fully claimed (any claim with amount=null), claimableAmount is 0
			// Otherwise, claimableAmount = price - sum of partial claim amounts
			let claimableAmount: number | null = null;
			if (row.price !== null) {
				const hasFullClaim = rawClaims.some((c) => c.amount === null);
				if (hasFullClaim) {
					claimableAmount = 0;
				} else {
					const claimedTotal = rawClaims.reduce(
						(sum, c) => sum + (c.amount ?? 0),
						0,
					);
					claimableAmount = Math.max(0, row.price - claimedTotal);
				}
			}

			itemMap.set(row.id, {
				item: {
					id: row.id,
					ownerId: row.ownerId,
					name: row.name,
					url: row.url,
					price: row.price,
					notes: row.notes,
					imageUrl: row.imageUrl,
					createdAt: row.createdAt?.toISOString() ?? null,
					updatedAt: row.updatedAt?.toISOString() ?? null,
				},
				owner: {
					id: row.ownerId,
					name: row.ownerName,
					email: row.ownerEmail,
				},
				sharedVia: [
					{
						groupId: row.groupId,
						groupName: row.groupName,
					},
				],
				claims: formattedClaims,
				claimableAmount,
			});
		}
	}

	const response = Array.from(itemMap.values());

	return new Response(JSON.stringify({ data: response }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}
