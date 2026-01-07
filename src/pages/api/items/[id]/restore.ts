import type { APIContext } from "astro";
import { and, eq } from "drizzle-orm";
import { items, users } from "@/db/schema";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";

/**
 * POST /api/items/[id]/restore - Restore an archived item to active
 * Only the item owner can restore it.
 * Transitions: archived -> active OR received -> active
 * Restores the item to the wishlist making it visible to recipients again.
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

	const itemId = context.params.id;
	if (!itemId) {
		return new Response(JSON.stringify({ error: "Item ID required" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Verify item exists and user owns it
	const item = await db
		.select()
		.from(items)
		.where(and(eq(items.id, itemId), eq(items.ownerId, user.id)))
		.get();

	if (!item) {
		return new Response(JSON.stringify({ error: "Item not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Only archived or received items can be restored to active
	if (item.status === "active") {
		return new Response(
			JSON.stringify({
				error: "Item is already active",
			}),
			{
				status: 400,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	// Update item status to active
	const [updatedItem] = await db
		.update(items)
		.set({ status: "active", updatedAt: new Date() })
		.where(eq(items.id, itemId))
		.returning();

	return new Response(
		JSON.stringify({
			...updatedItem,
			createdAt: updatedItem.createdAt?.toISOString() ?? null,
			updatedAt: updatedItem.updatedAt?.toISOString() ?? null,
		}),
		{
			status: 200,
			headers: { "Content-Type": "application/json" },
		},
	);
}
