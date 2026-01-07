import type { APIContext } from "astro";
import { and, eq } from "drizzle-orm";
import { claims, items, users } from "@/db/schema";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

/**
 * POST /api/items/[id]/receive - Mark item as received
 * Only the item owner can mark it as received.
 * Transitions: active -> received (or direct if item has purchased claims)
 * Notifies claimers that the owner confirmed receipt.
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

	// Only active items can be marked as received
	if (item.status !== "active") {
		return new Response(
			JSON.stringify({
				error: "Invalid state transition",
				details: `Cannot mark ${item.status} item as received`,
			}),
			{
				status: 400,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	// Update item status to received
	const [updatedItem] = await db
		.update(items)
		.set({ status: "received", updatedAt: new Date() })
		.where(eq(items.id, itemId))
		.returning();

	// Notify all claimers that the owner confirmed receipt
	const itemClaims = await db
		.select({ userId: claims.userId })
		.from(claims)
		.where(eq(claims.itemId, itemId));

	await Promise.all(
		itemClaims.map((claim) =>
			createNotification(db, {
				userId: claim.userId,
				type: "item_received",
				title: "Gift Received!",
				body: `The recipient confirmed they received "${item.name}"`,
				data: { itemId, itemName: item.name },
			}),
		),
	);

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
