import type { APIContext } from "astro";
import { eq } from "drizzle-orm";
import { ZodError } from "zod";
import { groupMembers, groups, users } from "@/db/schema";
import type { GroupResponse } from "@/db/types";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";
import {
	type CreateGroupInput,
	createGroupSchema,
} from "@/lib/validations/group";

/**
 * GET /api/groups - List groups the current user is a member of or owns
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

	// Get only groups where user is the owner (created by them)
	// Users should NOT see groups they were invited to
	const userGroups = await db
		.select()
		.from(groups)
		.where(eq(groups.ownerId, user.id));

	// Serialize dates to ISO strings for JSON response
	const responseData: GroupResponse[] = userGroups.map((g) => ({
		...g,
		createdAt: g.createdAt?.toISOString() ?? null,
		updatedAt: g.updatedAt?.toISOString() ?? null,
	}));

	return new Response(JSON.stringify(responseData), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}

/**
 * POST /api/groups - Create a new group
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

	let validatedData: CreateGroupInput;
	try {
		validatedData = createGroupSchema.parse(body);
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

	// Create the group
	const [newGroup] = await db
		.insert(groups)
		.values({
			ownerId: user.id,
			name: validatedData.name,
			description: validatedData.description ?? null,
		})
		.returning();

	// Add the creator as an owner member
	await db.insert(groupMembers).values({
		groupId: newGroup.id,
		userId: user.id,
		role: "owner",
	});

	// Serialize dates to ISO strings for JSON response
	const responseData: GroupResponse = {
		...newGroup,
		createdAt: newGroup.createdAt?.toISOString() ?? null,
		updatedAt: newGroup.updatedAt?.toISOString() ?? null,
	};

	return new Response(JSON.stringify(responseData), {
		status: 201,
		headers: { "Content-Type": "application/json" },
	});
}
