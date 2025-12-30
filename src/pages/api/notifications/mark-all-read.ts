import type { APIContext } from "astro";
import { and, eq } from "drizzle-orm";
import { notifications, users } from "@/db/schema";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";

/**
 * POST /api/notifications/mark-all-read - Mark all notifications as read
 *
 * Returns: { count: number } - number of notifications marked as read
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

	const result = await db
		.update(notifications)
		.set({
			read: true,
			updatedAt: new Date(),
		})
		.where(
			and(eq(notifications.userId, user.id), eq(notifications.read, false)),
		)
		.returning({ id: notifications.id });

	return new Response(JSON.stringify({ count: result.length }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}
