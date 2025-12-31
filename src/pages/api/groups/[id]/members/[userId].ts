import type { APIContext } from "astro";
import { and, eq } from "drizzle-orm";
import { claims, groupMembers, groups, itemRecipients, items, users } from "@/db/schema";
import { getAuthAdapter } from "@/lib/auth";
import { createDb, safeInArray } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

/**
 * DELETE /api/groups/[id]/members/[userId] - Remove a member from a group
 *
 * Authorization rules:
 * - Group owner can remove any member (except themselves as owner)
 * - Group admin can remove regular members
 * - Any member can remove themselves (leave the group)
 */
export async function DELETE(context: APIContext) {
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

	const groupId = context.params.id;
	const targetUserId = context.params.userId;

	if (!groupId) {
		return new Response(JSON.stringify({ error: "Group ID required" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	if (!targetUserId) {
		return new Response(JSON.stringify({ error: "User ID required" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Get the group
	const group = await db
		.select()
		.from(groups)
		.where(eq(groups.id, groupId))
		.get();

	if (!group) {
		return new Response(JSON.stringify({ error: "Group not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Get the requesting user's membership
	const requesterMembership = await db
		.select()
		.from(groupMembers)
		.where(
			and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id)),
		)
		.get();

	const isOwner = group.ownerId === user.id;
	const isAdmin = requesterMembership?.role === "admin";
	const isSelfRemoval = user.id === targetUserId;

	// Check if requester has access to the group at all
	if (!isOwner && !requesterMembership) {
		return new Response(JSON.stringify({ error: "Group not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Get the target member's membership
	const targetMembership = await db
		.select()
		.from(groupMembers)
		.where(
			and(
				eq(groupMembers.groupId, groupId),
				eq(groupMembers.userId, targetUserId),
			),
		)
		.get();

	if (!targetMembership) {
		return new Response(JSON.stringify({ error: "Member not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Authorization checks
	// Cannot remove the owner from their own group
	if (targetMembership.role === "owner") {
		return new Response(
			JSON.stringify({ error: "Cannot remove the group owner" }),
			{
				status: 403,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	// Check if requester has permission to remove the target
	if (!isSelfRemoval) {
		// Only owner and admins can remove others
		if (!isOwner && !isAdmin) {
			return new Response(
				JSON.stringify({ error: "Not authorized to remove members" }),
				{
					status: 403,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// Admins cannot remove other admins (only owner can)
		if (isAdmin && !isOwner && targetMembership.role === "admin") {
			return new Response(
				JSON.stringify({ error: "Only the owner can remove admins" }),
				{
					status: 403,
					headers: { "Content-Type": "application/json" },
				},
			);
		}
	}

	// Release claims: Find items shared with this group and delete claims by the removed user
	// This prevents orphaned claims when a user loses access to items through group removal
	const itemsInGroup = await db
		.select({ itemId: itemRecipients.itemId })
		.from(itemRecipients)
		.where(eq(itemRecipients.groupId, groupId));

	// Collect claims to notify before deleting
	const claimsToNotify: Array<{ userId: string; itemId: string; itemName: string }> = [];

	if (itemsInGroup.length > 0) {
		const itemIds = itemsInGroup.map((i) => i.itemId);

		// Get the claims that will be deleted along with item names
		const affectedClaims = await db
			.select({
				userId: claims.userId,
				itemId: claims.itemId,
				itemName: items.name,
			})
			.from(claims)
			.innerJoin(items, eq(claims.itemId, items.id))
			.where(
				and(eq(claims.userId, targetUserId), safeInArray(claims.itemId, itemIds)),
			);

		claimsToNotify.push(...affectedClaims);

		await db
			.delete(claims)
			.where(
				and(eq(claims.userId, targetUserId), safeInArray(claims.itemId, itemIds)),
			);
	}

	// Delete the membership
	await db
		.delete(groupMembers)
		.where(
			and(
				eq(groupMembers.groupId, groupId),
				eq(groupMembers.userId, targetUserId),
			),
		);

	// Notify the removed user about their released claims
	if (claimsToNotify.length > 0) {
		Promise.all(
			claimsToNotify.map((claim) =>
				createNotification(db, {
					userId: claim.userId,
					type: "claim_released_access_lost",
					title: "Claim Released",
					body: `Your claim on "${claim.itemName}" has been released. You left "${group.name}".`,
					data: {
						itemId: claim.itemId,
						itemName: claim.itemName,
						groupName: group.name,
						reason: "removed_from_group",
					},
				}),
			),
		).catch((err) => console.error("Failed to send claim access lost notifications:", err));
	}

	return new Response(null, { status: 204 });
}
