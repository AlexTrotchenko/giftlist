import type { APIContext } from "astro";
import { and, eq } from "drizzle-orm";
import { ZodError } from "zod";
import { claims, groupMembers, itemRecipients, items, users } from "@/db/schema";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { type UpdateItemInput, updateItemSchema } from "@/lib/validations/item";

/**
 * GET /api/items/[id] - Get an item (owner or recipient)
 * Owner can view their item directly.
 * Recipients can view the item if it's shared with a group they belong to.
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

	const itemId = context.params.id;
	if (!itemId) {
		return new Response(JSON.stringify({ error: "Item ID required" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	// First, try to get item as owner
	const ownedItem = await db
		.select()
		.from(items)
		.where(and(eq(items.id, itemId), eq(items.ownerId, user.id)))
		.get();

	if (ownedItem) {
		return new Response(
			JSON.stringify({
				...ownedItem,
				createdAt: ownedItem.createdAt?.toISOString() ?? null,
				updatedAt: ownedItem.updatedAt?.toISOString() ?? null,
				isOwner: true,
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	// If not owner, check if user is a recipient via group membership
	const sharedItem = await db
		.select({
			id: items.id,
			ownerId: items.ownerId,
			name: items.name,
			url: items.url,
			price: items.price,
			notes: items.notes,
			imageUrl: items.imageUrl,
			createdAt: items.createdAt,
			updatedAt: items.updatedAt,
		})
		.from(items)
		.innerJoin(itemRecipients, eq(items.id, itemRecipients.itemId))
		.innerJoin(groupMembers, eq(itemRecipients.groupId, groupMembers.groupId))
		.where(and(eq(items.id, itemId), eq(groupMembers.userId, user.id)))
		.get();

	if (sharedItem) {
		return new Response(
			JSON.stringify({
				...sharedItem,
				createdAt: sharedItem.createdAt?.toISOString() ?? null,
				updatedAt: sharedItem.updatedAt?.toISOString() ?? null,
				isOwner: false,
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	// Item not found or user has no access
	return new Response(JSON.stringify({ error: "Item not found" }), {
		status: 404,
		headers: { "Content-Type": "application/json" },
	});
}

/**
 * PUT /api/items/[id] - Update an item (owner only)
 */
export async function PUT(context: APIContext) {
	const db = createDb(context.locals.runtime.env.DB);
	const auth = getAuthAdapter(context.locals.runtime.env);

	const authUser = await auth.getCurrentUser(context.request, context.locals);
	if (!authUser) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Look up internal user by Clerk ID
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

	// Check if item exists and belongs to user
	const existingItem = await db
		.select()
		.from(items)
		.where(and(eq(items.id, itemId), eq(items.ownerId, user.id)))
		.get();

	if (!existingItem) {
		return new Response(JSON.stringify({ error: "Item not found" }), {
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

	let validatedData: UpdateItemInput;
	try {
		validatedData = updateItemSchema.parse(body);
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

	// Build update object with only provided fields
	const updateData: Record<string, unknown> = {
		updatedAt: new Date(),
	};

	if (validatedData.name !== undefined) updateData.name = validatedData.name;
	if (validatedData.url !== undefined) updateData.url = validatedData.url;
	if (validatedData.price !== undefined) updateData.price = validatedData.price;
	if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;
	if (validatedData.imageUrl !== undefined)
		updateData.imageUrl = validatedData.imageUrl;

	const [updatedItem] = await db
		.update(items)
		.set(updateData)
		.where(and(eq(items.id, itemId), eq(items.ownerId, user.id)))
		.returning();

	return new Response(JSON.stringify(updatedItem), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}

/**
 * DELETE /api/items/[id] - Delete an item (owner only)
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

	// Look up internal user by Clerk ID
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

	// Check if item exists and belongs to user
	const existingItem = await db
		.select()
		.from(items)
		.where(and(eq(items.id, itemId), eq(items.ownerId, user.id)))
		.get();

	if (!existingItem) {
		return new Response(JSON.stringify({ error: "Item not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Find all claims on this item and notify claimers before deletion
	const itemClaims = await db
		.select({ userId: claims.userId })
		.from(claims)
		.where(eq(claims.itemId, itemId));

	// Notify each claimer that their claimed item was deleted
	await Promise.all(
		itemClaims.map((claim) =>
			createNotification(db, {
				userId: claim.userId,
				type: "item_deleted",
				title: "Item Removed",
				body: `"${existingItem.name}" has been removed from a wishlist. Your claim has been released.`,
				data: { itemId, itemName: existingItem.name },
			}),
		),
	);

	// Delete the item (claims are cascade-deleted by FK constraint)
	await db
		.delete(items)
		.where(and(eq(items.id, itemId), eq(items.ownerId, user.id)));

	return new Response(null, { status: 204 });
}
