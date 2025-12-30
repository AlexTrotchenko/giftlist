import type { APIContext } from "astro";
import { and, eq } from "drizzle-orm";
import { ZodError } from "zod";
import { groupMembers, groups, users } from "@/db/schema";
import type { GroupResponse } from "@/db/types";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";
import {
	type UpdateGroupInput,
	updateGroupSchema,
} from "@/lib/validations/group";

/**
 * GET /api/groups/[id] - Get a single group (owner or member only)
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

	const groupId = context.params.id;
	if (!groupId) {
		return new Response(JSON.stringify({ error: "Group ID required" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Get the group
	const group = await db
		.select()
		.from(groups)
		.where(eq(groups.id, groupId))
		.get();

	if (!group) {
		return new Response(JSON.stringify({ error: "Group not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Check if user is owner or member
	const isOwner = group.ownerId === user.id;
	const membership = await db
		.select()
		.from(groupMembers)
		.where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id)))
		.get();

	if (!isOwner && !membership) {
		return new Response(JSON.stringify({ error: "Group not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Serialize dates to ISO strings for JSON response
	const responseData: GroupResponse = {
		...group,
		createdAt: group.createdAt?.toISOString() ?? null,
		updatedAt: group.updatedAt?.toISOString() ?? null,
	};

	return new Response(JSON.stringify(responseData), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}

/**
 * PUT /api/groups/[id] - Update a group (owner only)
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

	const groupId = context.params.id;
	if (!groupId) {
		return new Response(JSON.stringify({ error: "Group ID required" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Check if group exists and user is owner
	const existingGroup = await db
		.select()
		.from(groups)
		.where(and(eq(groups.id, groupId), eq(groups.ownerId, user.id)))
		.get();

	if (!existingGroup) {
		return new Response(JSON.stringify({ error: "Group not found" }), {
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

	let validatedData: UpdateGroupInput;
	try {
		validatedData = updateGroupSchema.parse(body);
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
	if (validatedData.description !== undefined)
		updateData.description = validatedData.description;

	const [updatedGroup] = await db
		.update(groups)
		.set(updateData)
		.where(and(eq(groups.id, groupId), eq(groups.ownerId, user.id)))
		.returning();

	// Serialize dates to ISO strings for JSON response
	const responseData: GroupResponse = {
		...updatedGroup,
		createdAt: updatedGroup.createdAt?.toISOString() ?? null,
		updatedAt: updatedGroup.updatedAt?.toISOString() ?? null,
	};

	return new Response(JSON.stringify(responseData), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}

/**
 * DELETE /api/groups/[id] - Delete a group (owner only)
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

	const groupId = context.params.id;
	if (!groupId) {
		return new Response(JSON.stringify({ error: "Group ID required" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Check if group exists and user is owner
	const existingGroup = await db
		.select()
		.from(groups)
		.where(and(eq(groups.id, groupId), eq(groups.ownerId, user.id)))
		.get();

	if (!existingGroup) {
		return new Response(JSON.stringify({ error: "Group not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Delete the group (group_members will cascade delete due to onDelete: "cascade")
	await db
		.delete(groups)
		.where(and(eq(groups.id, groupId), eq(groups.ownerId, user.id)));

	return new Response(null, { status: 204 });
}
