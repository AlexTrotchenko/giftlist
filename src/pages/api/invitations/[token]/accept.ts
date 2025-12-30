import type { APIContext } from "astro";
import { and, eq, ne } from "drizzle-orm";
import { groupMembers, groups, invitations, users } from "@/db/schema";
import type { GroupMemberResponse, GroupResponse } from "@/db/types";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { createEmailClient } from "@/lib/email";
import { createNotificationService } from "@/lib/notifications";

export type AcceptInvitationResponse = {
	group: GroupResponse;
	membership: GroupMemberResponse;
};

/**
 * POST /api/invitations/[token]/accept - Accept an invitation
 * User must be authenticated and the invitation must be sent to their email
 */
export async function POST(context: APIContext) {
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

	const token = context.params.token;
	if (!token) {
		return new Response(JSON.stringify({ error: "Token required" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Find the invitation by token
	const invitation = await db
		.select()
		.from(invitations)
		.where(eq(invitations.token, token))
		.get();

	if (!invitation) {
		return new Response(JSON.stringify({ error: "Invitation not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Verify the invitation is for this user's email
	if (invitation.inviteeEmail !== user.email) {
		return new Response(
			JSON.stringify({ error: "This invitation was not sent to your email" }),
			{
				status: 403,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	// Check invitation status
	if (invitation.status !== "pending") {
		return new Response(
			JSON.stringify({
				error: `Invitation has already been ${invitation.status}`,
			}),
			{
				status: 409,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	// Check if invitation has expired
	if (invitation.expiresAt < new Date()) {
		// Update status to expired
		await db
			.update(invitations)
			.set({ status: "expired", updatedAt: new Date() })
			.where(eq(invitations.id, invitation.id));

		return new Response(JSON.stringify({ error: "Invitation has expired" }), {
			status: 410,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Get the group
	const group = await db
		.select()
		.from(groups)
		.where(eq(groups.id, invitation.groupId))
		.get();

	if (!group) {
		return new Response(JSON.stringify({ error: "Group no longer exists" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Check if user is already a member
	const existingMembership = await db
		.select()
		.from(groupMembers)
		.where(
			and(
				eq(groupMembers.groupId, invitation.groupId),
				eq(groupMembers.userId, user.id),
			),
		)
		.get();

	if (existingMembership) {
		// Update invitation status and return existing membership
		await db
			.update(invitations)
			.set({ status: "accepted", updatedAt: new Date() })
			.where(eq(invitations.id, invitation.id));

		return new Response(
			JSON.stringify({ error: "You are already a member of this group" }),
			{
				status: 409,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	// Accept the invitation: update status and create membership
	await db
		.update(invitations)
		.set({ status: "accepted", updatedAt: new Date() })
		.where(eq(invitations.id, invitation.id));

	const [newMembership] = await db
		.insert(groupMembers)
		.values({
			groupId: invitation.groupId,
			userId: user.id,
			role: invitation.role,
		})
		.returning();

	// Send notifications
	const emailClient = createEmailClient(
		context.locals.runtime.env.RESEND_API_KEY,
	);
	const notificationService = createNotificationService(db, emailClient);

	// Notify the inviter that their invitation was accepted
	await notificationService.notifyInvitationAccepted({
		inviterId: invitation.inviterId,
		accepterName: user.name ?? user.email,
		groupName: group.name,
		groupId: group.id,
	});

	// Notify all existing members about the new member (except the new member and inviter)
	const existingMembers = await db
		.select({ userId: groupMembers.userId })
		.from(groupMembers)
		.where(
			and(
				eq(groupMembers.groupId, group.id),
				ne(groupMembers.userId, user.id),
				ne(groupMembers.userId, invitation.inviterId),
			),
		);

	if (existingMembers.length > 0) {
		await notificationService.notifyMemberJoined({
			memberUserIds: existingMembers.map((m) => m.userId),
			newMemberName: user.name ?? user.email,
			groupName: group.name,
			groupId: group.id,
		});
	}

	// Prepare response
	const responseData: AcceptInvitationResponse = {
		group: {
			...group,
			createdAt: group.createdAt?.toISOString() ?? null,
			updatedAt: group.updatedAt?.toISOString() ?? null,
		},
		membership: {
			...newMembership,
			joinedAt: newMembership.joinedAt?.toISOString() ?? null,
		},
	};

	return new Response(JSON.stringify(responseData), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}
