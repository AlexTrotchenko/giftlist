import type { APIContext } from "astro";
import { eq } from "drizzle-orm";
import { invitations, users } from "@/db/schema";
import type { InvitationResponse } from "@/db/types";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";

/**
 * POST /api/invitations/[token]/decline - Decline an invitation
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

	// Update the invitation status to declined
	const [updatedInvitation] = await db
		.update(invitations)
		.set({ status: "declined", updatedAt: new Date() })
		.where(eq(invitations.id, invitation.id))
		.returning();

	// Serialize dates for JSON response
	const responseData: InvitationResponse = {
		...updatedInvitation,
		createdAt: updatedInvitation.createdAt?.toISOString() ?? null,
		updatedAt: updatedInvitation.updatedAt?.toISOString() ?? null,
		expiresAt: updatedInvitation.expiresAt.toISOString(),
	};

	return new Response(JSON.stringify(responseData), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}
