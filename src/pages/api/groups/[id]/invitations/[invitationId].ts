import type { APIContext } from "astro";
import { and, eq } from "drizzle-orm";
import { groupMembers, groups, invitations, users } from "@/db/schema";
import type { InvitationResponse } from "@/db/types";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";

/**
 * GET /api/groups/[id]/invitations/[invitationId] - Get a specific invitation
 * Only accessible by group owner or admins
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

	const groupId = context.params.id;
	const invitationId = context.params.invitationId;

	if (!groupId || !invitationId) {
		return new Response(
			JSON.stringify({ error: "Group ID and Invitation ID required" }),
			{
				status: 400,
				headers: { "Content-Type": "application/json" },
			},
		);
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

	// Check if user is owner or admin
	const membership = await db
		.select()
		.from(groupMembers)
		.where(
			and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id)),
		)
		.get();

	const canView =
		group.ownerId === user.id ||
		membership?.role === "owner" ||
		membership?.role === "admin";

	if (!canView) {
		return new Response(JSON.stringify({ error: "Forbidden" }), {
			status: 403,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Get the invitation
	const invitation = await db
		.select()
		.from(invitations)
		.where(
			and(
				eq(invitations.id, invitationId),
				eq(invitations.groupId, groupId),
			),
		)
		.get();

	if (!invitation) {
		return new Response(JSON.stringify({ error: "Invitation not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Serialize dates for JSON response
	const responseData: InvitationResponse = {
		...invitation,
		createdAt: invitation.createdAt?.toISOString() ?? null,
		updatedAt: invitation.updatedAt?.toISOString() ?? null,
		expiresAt: invitation.expiresAt.toISOString(),
	};

	return new Response(JSON.stringify(responseData), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}

/**
 * DELETE /api/groups/[id]/invitations/[invitationId] - Revoke an invitation
 * Only accessible by group owner or admins
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
	const invitationId = context.params.invitationId;

	if (!groupId || !invitationId) {
		return new Response(
			JSON.stringify({ error: "Group ID and Invitation ID required" }),
			{
				status: 400,
				headers: { "Content-Type": "application/json" },
			},
		);
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

	// Check if user is owner or admin
	const membership = await db
		.select()
		.from(groupMembers)
		.where(
			and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id)),
		)
		.get();

	const canRevoke =
		group.ownerId === user.id ||
		membership?.role === "owner" ||
		membership?.role === "admin";

	if (!canRevoke) {
		return new Response(
			JSON.stringify({ error: "Only owners and admins can revoke invitations" }),
			{
				status: 403,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	// Get the invitation
	const invitation = await db
		.select()
		.from(invitations)
		.where(
			and(
				eq(invitations.id, invitationId),
				eq(invitations.groupId, groupId),
			),
		)
		.get();

	if (!invitation) {
		return new Response(JSON.stringify({ error: "Invitation not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Only pending invitations can be revoked
	if (invitation.status !== "pending") {
		return new Response(
			JSON.stringify({
				error: `Cannot revoke invitation that has been ${invitation.status}`,
			}),
			{
				status: 409,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	// Delete the invitation
	await db.delete(invitations).where(eq(invitations.id, invitationId));

	return new Response(null, {
		status: 204,
	});
}
