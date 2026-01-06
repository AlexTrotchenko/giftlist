import type { APIContext } from "astro";
import { and, eq } from "drizzle-orm";
import { ZodError } from "zod";
import { claims, groupMembers, groups, itemRecipients, items, users } from "@/db/schema";
import type { ItemRecipientResponse } from "@/db/types";
import { getAuthAdapter } from "@/lib/auth";
import { createDb, safeInArray } from "@/lib/db";
import {
	addRecipientsSchema,
	removeRecipientsSchema,
} from "@/lib/validations/recipient";

/**
 * GET /api/items/[id]/recipients - List all recipient groups for an item
 * Only the item owner can view recipients
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
		return new Response(JSON.stringify({ error: "Item ID is required" }), {
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

	// Get all recipients with group details
	const recipients = await db
		.select({
			id: itemRecipients.id,
			itemId: itemRecipients.itemId,
			groupId: itemRecipients.groupId,
			createdAt: itemRecipients.createdAt,
			groupName: groups.name,
		})
		.from(itemRecipients)
		.innerJoin(groups, eq(groups.id, itemRecipients.groupId))
		.where(eq(itemRecipients.itemId, itemId));

	const response = recipients.map((r) => ({
		id: r.id,
		itemId: r.itemId,
		groupId: r.groupId,
		createdAt: r.createdAt?.toISOString() ?? null,
		group: {
			id: r.groupId,
			name: r.groupName,
		},
	}));

	return new Response(JSON.stringify({ data: response }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}

/**
 * POST /api/items/[id]/recipients - Add recipient groups to an item
 * Only the item owner can add recipients
 * User must be a member of the groups being added
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
		return new Response(JSON.stringify({ error: "Item ID is required" }), {
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

	let body: unknown;
	try {
		body = await context.request.json();
	} catch {
		return new Response(JSON.stringify({ error: "Invalid JSON" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	let validatedData;
	try {
		validatedData = addRecipientsSchema.parse(body);
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

	// Verify user is a member of all requested groups
	const userMemberships = await db
		.select({ groupId: groupMembers.groupId })
		.from(groupMembers)
		.where(
			and(
				eq(groupMembers.userId, user.id),
				safeInArray(groupMembers.groupId, validatedData.groupIds),
			),
		);

	const memberGroupIds = new Set(userMemberships.map((m) => m.groupId));
	const unauthorizedGroups = validatedData.groupIds.filter(
		(id) => !memberGroupIds.has(id),
	);

	if (unauthorizedGroups.length > 0) {
		return new Response(
			JSON.stringify({
				error: "Not a member of all specified groups",
				details: { unauthorizedGroups },
			}),
			{
				status: 403,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	// Get existing recipients to avoid duplicates
	const existingRecipients = await db
		.select({ groupId: itemRecipients.groupId })
		.from(itemRecipients)
		.where(eq(itemRecipients.itemId, itemId));

	const existingGroupIds = new Set(existingRecipients.map((r) => r.groupId));
	const newGroupIds = validatedData.groupIds.filter(
		(id) => !existingGroupIds.has(id),
	);

	if (newGroupIds.length === 0) {
		return new Response(
			JSON.stringify({
				data: [],
				message: "All groups are already recipients",
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	// Insert new recipients
	const newRecipients = await db
		.insert(itemRecipients)
		.values(newGroupIds.map((groupId) => ({ itemId, groupId })))
		.returning();

	const response: ItemRecipientResponse[] = newRecipients.map((r) => ({
		id: r.id,
		itemId: r.itemId,
		groupId: r.groupId,
		createdAt: r.createdAt?.toISOString() ?? null,
	}));

	return new Response(
		JSON.stringify({
			data: response,
			message: `Added ${newRecipients.length} recipient(s)`,
		}),
		{
			status: 201,
			headers: { "Content-Type": "application/json" },
		},
	);
}

/**
 * DELETE /api/items/[id]/recipients - Remove recipient groups from an item
 * Only the item owner can remove recipients
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

	const itemId = context.params.id;
	if (!itemId) {
		return new Response(JSON.stringify({ error: "Item ID is required" }), {
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

	let body: unknown;
	try {
		body = await context.request.json();
	} catch {
		return new Response(JSON.stringify({ error: "Invalid JSON" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	let validatedData;
	try {
		validatedData = removeRecipientsSchema.parse(body);
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

	// Release claims: Find members of the groups being removed and delete their claims on this item
	// Must happen BEFORE recipient deletion since we need to identify affected users
	const membersInRemovedGroups = await db
		.select({ userId: groupMembers.userId })
		.from(groupMembers)
		.where(safeInArray(groupMembers.groupId, validatedData.groupIds));

	if (membersInRemovedGroups.length > 0) {
		const memberIds = membersInRemovedGroups.map((m) => m.userId);
		await db
			.delete(claims)
			.where(and(eq(claims.itemId, itemId), safeInArray(claims.userId, memberIds)));
	}

	// Delete specified recipients
	const deleted = await db
		.delete(itemRecipients)
		.where(
			and(
				eq(itemRecipients.itemId, itemId),
				safeInArray(itemRecipients.groupId, validatedData.groupIds),
			),
		)
		.returning({ id: itemRecipients.id });

	return new Response(
		JSON.stringify({
			data: { deleted: deleted.length },
			message: `Removed ${deleted.length} recipient(s)`,
		}),
		{
			status: 200,
			headers: { "Content-Type": "application/json" },
		},
	);
}
