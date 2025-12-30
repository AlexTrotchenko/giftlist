import type { APIContext } from "astro";
import { count, eq, and } from "drizzle-orm";
import { notifications, users } from "@/db/schema";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";

/**
 * GET /api/notifications/unread-count - Get count of unread notifications
 *
 * Returns: { count: number }
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

	const [result] = await db
		.select({ count: count() })
		.from(notifications)
		.where(
			and(eq(notifications.userId, user.id), eq(notifications.read, false)),
		);

	return new Response(JSON.stringify({ count: result?.count ?? 0 }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}
