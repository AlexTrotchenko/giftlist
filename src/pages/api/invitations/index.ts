import type { APIContext } from "astro";
import { and, eq, gt } from "drizzle-orm";
import { groups, invitations, users } from "@/db/schema";
import type { InvitationResponse } from "@/db/types";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";

export type InvitationWithGroup = InvitationResponse & {
	group: {
		id: string;
		name: string;
		description: string | null;
	};
	inviter: {
		id: string;
		name: string | null;
		email: string;
	};
};

/**
 * GET /api/invitations - List pending invitations for the current user
 * Returns invitations sent to the user's email address
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

	// Get query params for filtering
	const url = new URL(context.request.url);
	const status = url.searchParams.get("status") ?? "pending";

	// Get invitations sent to the user's email
	const now = new Date();
	const userInvitations = await db
		.select({
			id: invitations.id,
			groupId: invitations.groupId,
			inviterId: invitations.inviterId,
			inviteeEmail: invitations.inviteeEmail,
			token: invitations.token,
			role: invitations.role,
			status: invitations.status,
			expiresAt: invitations.expiresAt,
			createdAt: invitations.createdAt,
			updatedAt: invitations.updatedAt,
			group: {
				id: groups.id,
				name: groups.name,
				description: groups.description,
			},
			inviter: {
				id: users.id,
				name: users.name,
				email: users.email,
			},
		})
		.from(invitations)
		.innerJoin(groups, eq(invitations.groupId, groups.id))
		.innerJoin(users, eq(invitations.inviterId, users.id))
		.where(
			and(
				eq(invitations.inviteeEmail, user.email),
				eq(invitations.status, status),
				gt(invitations.expiresAt, now),
			),
		);

	// Serialize dates for JSON response
	const responseData: InvitationWithGroup[] = userInvitations.map((inv) => ({
		id: inv.id,
		groupId: inv.groupId,
		inviterId: inv.inviterId,
		inviteeEmail: inv.inviteeEmail,
		token: inv.token,
		role: inv.role,
		status: inv.status,
		expiresAt: inv.expiresAt.toISOString(),
		createdAt: inv.createdAt?.toISOString() ?? null,
		updatedAt: inv.updatedAt?.toISOString() ?? null,
		group: inv.group,
		inviter: inv.inviter,
	}));

	return new Response(JSON.stringify(responseData), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}
