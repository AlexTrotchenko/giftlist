import type { APIContext } from "astro";
import { and, eq, ne } from "drizzle-orm";
import { claims, groupMembers, itemRecipients, items, users } from "@/db/schema";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

/**
 * DELETE /api/claims/[id] - Release (delete) a claim
 *
 * Users can only delete their own claims.
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

	// Get the item details for notification
	const item = await db
		.select()
		.from(items)
		.where(eq(items.id, existingClaim.itemId))
		.get();

	await db
		.delete(claims)
		.where(and(eq(claims.id, claimId), eq(claims.userId, user.id)));

	// Notify recipients that the item is available again (NEVER notify the owner)
	if (item) {
		const recipients = await db
			.selectDistinct({ userId: groupMembers.userId })
			.from(itemRecipients)
			.innerJoin(groupMembers, eq(itemRecipients.groupId, groupMembers.groupId))
			.where(
				and(
					eq(itemRecipients.itemId, item.id),
					ne(groupMembers.userId, item.ownerId), // Never notify owner
					ne(groupMembers.userId, user.id), // Don't notify the person who released
				),
			);

		// Send notifications asynchronously (don't block the response)
		if (recipients.length > 0) {
			Promise.all(
				recipients.map((r) =>
					createNotification(db, {
						userId: r.userId,
						type: "claim_released",
						title: "Item Available",
						body: `"${item.name}" is available again`,
						data: { itemId: item.id, itemName: item.name },
					}),
				),
			).catch((err) => console.error("Failed to send claim release notifications:", err));
		}
	}

	return new Response(null, { status: 204 });
}
