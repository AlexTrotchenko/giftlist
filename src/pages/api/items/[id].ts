import type { APIContext } from "astro";
import { and, eq } from "drizzle-orm";
import { ZodError } from "zod";
import { items, users } from "@/db/schema";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { type UpdateItemInput, updateItemSchema } from "@/lib/validations/item";

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

	await db
		.delete(items)
		.where(and(eq(items.id, itemId), eq(items.ownerId, user.id)));

	return new Response(null, { status: 204 });
}
