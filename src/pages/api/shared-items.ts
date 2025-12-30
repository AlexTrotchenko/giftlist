import type { APIContext } from "astro";
import { and, eq, ne } from "drizzle-orm";
import { groupMembers, groups, itemRecipients, items, users } from "@/db/schema";
import type { ItemResponse } from "@/db/types";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";

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
		}
	>();

	for (const row of sharedItems) {
		const existing = itemMap.get(row.id);
		if (existing) {
			// Add this group to the list of groups sharing this item
			existing.sharedVia.push({
				groupId: row.groupId,
				groupName: row.groupName,
			});
		} else {
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
			});
		}
	}

	const response = Array.from(itemMap.values());

	return new Response(JSON.stringify({ data: response }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}
