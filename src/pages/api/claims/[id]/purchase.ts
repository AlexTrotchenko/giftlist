import type { APIContext } from "astro";
import { and, eq, ne } from "drizzle-orm";
import { claims, groupMembers, itemRecipients, items, users } from "@/db/schema";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

/**
 * POST /api/claims/[id]/purchase - Mark a claim as purchased
 * Only the claimer can mark their own claim as purchased.
 * Sets purchasedAt timestamp and notifies other recipients.
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

	const claimId = context.params.id;
	if (!claimId) {
		return new Response(JSON.stringify({ error: "Claim ID required" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Check if claim exists and belongs to user
	const existingClaim = await db
		.select()
		.from(claims)
		.where(and(eq(claims.id, claimId), eq(claims.userId, user.id)))
		.get();

	if (!existingClaim) {
		return new Response(JSON.stringify({ error: "Claim not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Already purchased
	if (existingClaim.purchasedAt) {
		return new Response(
			JSON.stringify({
				error: "Claim already marked as purchased",
			}),
			{
				status: 400,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	// Update claim with purchased timestamp
	const [updatedClaim] = await db
		.update(claims)
		.set({ purchasedAt: new Date() })
		.where(eq(claims.id, claimId))
		.returning();

	// Get item details for notification
	const item = await db
		.select()
		.from(items)
		.where(eq(items.id, existingClaim.itemId))
		.get();

	// Notify other recipients that the item was purchased (NEVER notify the owner)
	if (item) {
		const recipients = await db
			.selectDistinct({ userId: groupMembers.userId })
			.from(itemRecipients)
			.innerJoin(groupMembers, eq(itemRecipients.groupId, groupMembers.groupId))
			.where(
				and(
					eq(itemRecipients.itemId, item.id),
					ne(groupMembers.userId, item.ownerId), // Never notify owner
					ne(groupMembers.userId, user.id), // Don't notify the purchaser
				),
			);

		// Send notifications asynchronously (don't block the response)
		if (recipients.length > 0) {
			Promise.all(
				recipients.map((r) =>
					createNotification(db, {
						userId: r.userId,
						type: "item_purchased",
						title: "Item Purchased",
						body: `"${item.name}" has been purchased`,
						data: { itemId: item.id, itemName: item.name },
					}),
				),
			).catch((err) =>
				console.error("Failed to send purchase notifications:", err),
			);
		}
	}

	return new Response(
		JSON.stringify({
			...updatedClaim,
			createdAt: updatedClaim.createdAt?.toISOString() ?? null,
			expiresAt: updatedClaim.expiresAt?.toISOString() ?? null,
			purchasedAt: updatedClaim.purchasedAt?.toISOString() ?? null,
		}),
		{
			status: 200,
			headers: { "Content-Type": "application/json" },
		},
	);
}

/**
 * DELETE /api/claims/[id]/purchase - Unmark a claim as purchased
 * Only the claimer can unmark their own claim.
 * Resets purchasedAt timestamp to null (rare case: changed mind after purchase).
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

	const claimId = context.params.id;
	if (!claimId) {
		return new Response(JSON.stringify({ error: "Claim ID required" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Check if claim exists and belongs to user
	const existingClaim = await db
		.select()
		.from(claims)
		.where(and(eq(claims.id, claimId), eq(claims.userId, user.id)))
		.get();

	if (!existingClaim) {
		return new Response(JSON.stringify({ error: "Claim not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Not purchased yet
	if (!existingClaim.purchasedAt) {
		return new Response(
			JSON.stringify({
				error: "Claim is not marked as purchased",
			}),
			{
				status: 400,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	// Update claim to remove purchased timestamp
	const [updatedClaim] = await db
		.update(claims)
		.set({ purchasedAt: null })
		.where(eq(claims.id, claimId))
		.returning();

	return new Response(
		JSON.stringify({
			...updatedClaim,
			createdAt: updatedClaim.createdAt?.toISOString() ?? null,
			expiresAt: updatedClaim.expiresAt?.toISOString() ?? null,
			purchasedAt: null,
		}),
		{
			status: 200,
			headers: { "Content-Type": "application/json" },
		},
	);
}
