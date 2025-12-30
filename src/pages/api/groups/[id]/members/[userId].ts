import type { APIContext } from "astro";
import { and, eq } from "drizzle-orm";
import { groupMembers, groups, users } from "@/db/schema";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";

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

	// Delete the membership
	await db
		.delete(groupMembers)
		.where(
			and(
				eq(groupMembers.groupId, groupId),
				eq(groupMembers.userId, targetUserId),
			),
		);

	return new Response(null, { status: 204 });
}
