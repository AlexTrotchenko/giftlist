import type { APIContext } from "astro";
import { eq } from "drizzle-orm";
import { ZodError } from "zod";
import { items, users } from "@/db/schema";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { type CreateItemInput, createItemSchema } from "@/lib/validations/item";

/**
 * GET /api/items - List current user's items
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

	const userItems = await db
		.select()
		.from(items)
		.where(eq(items.ownerId, user.id));

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
