import type { APIContext } from "astro";
import { and, eq } from "drizzle-orm";
import { ZodError } from "zod";
import { type ItemStatus, itemStatuses, items, users } from "@/db/schema";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { type CreateItemInput, createItemSchema } from "@/lib/validations/item";

/**
 * GET /api/items - List current user's items
 * Supports optional ?status=active|received|archived filter
 * If no status filter provided, returns all items (for backwards compatibility)
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

	// Parse optional status filter from query params
	const url = new URL(context.request.url);
	const statusParam = url.searchParams.get("status");

	// Validate status if provided
	let statusFilter: ItemStatus | undefined;
	if (statusParam) {
		if (!itemStatuses.includes(statusParam as ItemStatus)) {
			return new Response(
				JSON.stringify({
					error: "Invalid status filter",
					details: `Status must be one of: ${itemStatuses.join(", ")}`,
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}
		statusFilter = statusParam as ItemStatus;
	}

	// Build query with optional status filter
	const userItems = statusFilter
		? await db
				.select()
				.from(items)
				.where(and(eq(items.ownerId, user.id), eq(items.status, statusFilter)))
		: await db.select().from(items).where(eq(items.ownerId, user.id));

	return new Response(JSON.stringify(userItems), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}

/**
 * POST /api/items - Create a new item
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

	let body: unknown;
	try {
		body = await context.request.json();
	} catch {
		return new Response(JSON.stringify({ error: "Invalid JSON" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	let validatedData: CreateItemInput;
	try {
		validatedData = createItemSchema.parse(body);
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

	const [newItem] = await db
		.insert(items)
		.values({
			ownerId: user.id,
			name: validatedData.name,
			url: validatedData.url ?? null,
			price: validatedData.price ?? null,
			notes: validatedData.notes ?? null,
			imageUrl: validatedData.imageUrl ?? null,
			priority: validatedData.priority ?? null,
		})
		.returning();

	return new Response(JSON.stringify(newItem), {
		status: 201,
		headers: { "Content-Type": "application/json" },
	});
}
