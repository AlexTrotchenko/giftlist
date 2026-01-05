import type { APIContext } from "astro";
import { count, eq, and, gt } from "drizzle-orm";
import { notifications, invitations, users } from "@/db/schema";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";

export interface NotificationCenterCountsResponse {
	notifications: number;
	invitations: number;
	total: number;
}

/**
 * GET /api/notification-center/counts - Get combined counts for notification center badge
 *
 * Returns: { notifications: number, invitations: number, total: number }
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

	// Run both counts in parallel
	const now = new Date();
	const [notificationResult, invitationResult] = await Promise.all([
		db
			.select({ count: count() })
			.from(notifications)
			.where(
				and(eq(notifications.userId, user.id), eq(notifications.read, false)),
			),
		db
			.select({ count: count() })
			.from(invitations)
			.where(
				and(
					eq(invitations.inviteeEmail, user.email),
					eq(invitations.status, "pending"),
					gt(invitations.expiresAt, now),
				),
			),
	]);

	const notificationCount = notificationResult[0]?.count ?? 0;
	const invitationCount = invitationResult[0]?.count ?? 0;

	const response: NotificationCenterCountsResponse = {
		notifications: notificationCount,
		invitations: invitationCount,
		total: notificationCount + invitationCount,
	};

	return new Response(JSON.stringify(response), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}
