import type { APIContext } from "astro";
import { and, eq } from "drizzle-orm";
import { notifications, users } from "@/db/schema";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";

/**
 * DELETE /api/notifications/[id] - Delete a single notification
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

	const notificationId = context.params.id;
	if (!notificationId) {
		return new Response(
			JSON.stringify({ error: "Notification ID is required" }),
			{
				status: 400,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	// Check if notification exists and belongs to user
	const existing = await db
		.select()
		.from(notifications)
		.where(
			and(
				eq(notifications.id, notificationId),
				eq(notifications.userId, user.id),
			),
		)
		.get();

	if (!existing) {
		return new Response(JSON.stringify({ error: "Notification not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	await db
		.delete(notifications)
		.where(
			and(
				eq(notifications.id, notificationId),
				eq(notifications.userId, user.id),
			),
		);

	return new Response(null, { status: 204 });
}
