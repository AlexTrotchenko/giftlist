import type { APIContext } from "astro";
import { and, eq } from "drizzle-orm";
import { claims, items, users } from "@/db/schema";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";

/**
 * POST /api/items/[id]/archive - Archive an item
 * Only the item owner can archive it.
 * Transitions: active -> archived (if no claims) OR received -> archived
 * Archived items are hidden from recipients but visible to owner in archive view.
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

	// Already archived
	if (item.status === "archived") {
		return new Response(
			JSON.stringify({
				error: "Item already archived",
			}),
			{
				status: 400,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	// If active, check for active claims (only allow archive if no active claims)
	if (item.status === "active") {
		const activeClaims = await db
			.select({ id: claims.id })
			.from(claims)
			.where(eq(claims.itemId, itemId))
			.limit(1);

		if (activeClaims.length > 0) {
			return new Response(
				JSON.stringify({
					error: "Cannot archive item with active claims",
					details:
						"Mark the item as received first, or have claimers release their claims",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}
	}

	// Update item status to archived
	const [updatedItem] = await db
		.update(items)
		.set({ status: "archived", updatedAt: new Date() })
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
