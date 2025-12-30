import type { APIContext } from "astro";
import { desc, eq, lt } from "drizzle-orm";
import { notifications, users } from "@/db/schema";
import type { NotificationResponse } from "@/db/types";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * GET /api/notifications - List current user's notifications with cursor-based pagination
 *
 * Query params:
 * - cursor: string - ID of the last notification from previous page
 * - limit: number - Number of notifications to return (default: 20, max: 100)
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

	const url = new URL(context.request.url);
	const cursor = url.searchParams.get("cursor");
	const limitParam = url.searchParams.get("limit");
	const limit = Math.min(
		Math.max(1, Number.parseInt(limitParam ?? "", 10) || DEFAULT_LIMIT),
		MAX_LIMIT,
	);

	// Fetch limit + 1 to determine if there are more results (prefetch +1 pattern)
	const query = cursor
		? db
				.select()
				.from(notifications)
				.where(
					eq(notifications.userId, user.id) &&
						lt(notifications.id, cursor),
				)
				.orderBy(desc(notifications.createdAt), desc(notifications.id))
				.limit(limit + 1)
		: db
				.select()
				.from(notifications)
				.where(eq(notifications.userId, user.id))
				.orderBy(desc(notifications.createdAt), desc(notifications.id))
				.limit(limit + 1);

	const results = await query;
	const hasNext = results.length > limit;
	const data = results.slice(0, limit);
	const nextCursor = hasNext ? data[data.length - 1]?.id : null;

	// Convert to response format (dates to strings)
	const responseData: NotificationResponse[] = data.map((n) => ({
		...n,
		createdAt: n.createdAt?.toISOString() ?? null,
		updatedAt: n.updatedAt?.toISOString() ?? null,
	}));

	return new Response(
		JSON.stringify({
			data: responseData,
			pagination: {
				hasNext,
				nextCursor,
			},
		}),
		{
			status: 200,
			headers: { "Content-Type": "application/json" },
		},
	);
}
