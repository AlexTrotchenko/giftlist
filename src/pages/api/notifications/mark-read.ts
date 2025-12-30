import type { APIContext } from "astro";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { ZodError } from "zod";
import { notifications, users } from "@/db/schema";
import type { NotificationResponse } from "@/db/types";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";

const markReadSchema = z.object({
	id: z.string().min(1, "Notification ID is required"),
});

/**
 * POST /api/notifications/mark-read - Mark a single notification as read
 *
 * Body: { id: string }
 * Returns: Updated notification
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

	let body: unknown;
	try {
		body = await context.request.json();
	} catch {
		return new Response(JSON.stringify({ error: "Invalid JSON" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	let validatedData: z.infer<typeof markReadSchema>;
	try {
		validatedData = markReadSchema.parse(body);
	} catch (error) {
		if (error instanceof ZodError) {
			return new Response(
				JSON.stringify({ error: "Validation error", details: error.errors }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}
		throw error;
	}

	const [updatedNotification] = await db
		.update(notifications)
		.set({
			read: true,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(notifications.id, validatedData.id),
				eq(notifications.userId, user.id),
			),
		)
		.returning();

	if (!updatedNotification) {
		return new Response(JSON.stringify({ error: "Notification not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	const response: NotificationResponse = {
		...updatedNotification,
		createdAt: updatedNotification.createdAt?.toISOString() ?? null,
		updatedAt: updatedNotification.updatedAt?.toISOString() ?? null,
	};

	return new Response(JSON.stringify(response), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}
