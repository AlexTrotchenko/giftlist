import type { APIContext } from "astro";
import { and, eq, isNull } from "drizzle-orm";
import { ZodError } from "zod";
import { claims, groupMembers, itemRecipients, items, users } from "@/db/schema";
import type { ClaimResponse } from "@/db/types";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { type CreateClaimInput, createClaimSchema } from "@/lib/validations/claim";

const CLAIM_EXPIRATION_DAYS = 30;

/**
 * GET /api/claims - List current user's claims
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

	const userClaims = await db
		.select()
		.from(claims)
		.where(eq(claims.userId, user.id));

	const responseData: ClaimResponse[] = userClaims.map((claim) => ({
		...claim,
		createdAt: claim.createdAt?.toISOString() ?? null,
		expiresAt: claim.expiresAt?.toISOString() ?? null,
	}));

	return new Response(JSON.stringify(responseData), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}

/**
 * POST /api/claims - Create a new claim on an item
 *
 * Validation rules:
 * - User must be authenticated
 * - User must be a recipient of the item (member of a group the item is shared with)
 * - User must NOT be the item owner
 * - For full claims (amount=null): No existing full claim on the item
 * - Auto-sets 30-day expiration
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

	let validatedData: CreateClaimInput;
	try {
		validatedData = createClaimSchema.parse(body);
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

	// Get the item
	const item = await db
		.select()
		.from(items)
		.where(eq(items.id, validatedData.itemId))
		.get();

	if (!item) {
		return new Response(JSON.stringify({ error: "Item not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Check user is NOT the owner
	if (item.ownerId === user.id) {
		return new Response(
			JSON.stringify({ error: "Cannot claim your own item" }),
			{
				status: 403,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	// Check user is a recipient (member of a group the item is shared with)
	const isRecipient = await db
		.select({ id: itemRecipients.id })
		.from(itemRecipients)
		.innerJoin(groupMembers, eq(itemRecipients.groupId, groupMembers.groupId))
		.where(
			and(
				eq(itemRecipients.itemId, validatedData.itemId),
				eq(groupMembers.userId, user.id),
			),
		)
		.get();

	if (!isRecipient) {
		return new Response(
			JSON.stringify({ error: "You must be a recipient of this item to claim it" }),
			{
				status: 403,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	// Determine if this is a full claim (amount is null or undefined)
	const isFullClaim = validatedData.amount === null || validatedData.amount === undefined;

	// For full claims: check no existing full claim (first-come-first-served)
	if (isFullClaim) {
		const existingFullClaim = await db
			.select({ id: claims.id })
			.from(claims)
			.where(and(eq(claims.itemId, validatedData.itemId), isNull(claims.amount)))
			.get();

		if (existingFullClaim) {
			return new Response(
				JSON.stringify({ error: "This item has already been claimed" }),
				{
					status: 409,
					headers: { "Content-Type": "application/json" },
				},
			);
		}
	}

	// Calculate expiration date (30 days from now)
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + CLAIM_EXPIRATION_DAYS);

	// Create the claim
	const [newClaim] = await db
		.insert(claims)
		.values({
			itemId: validatedData.itemId,
			userId: user.id,
			amount: isFullClaim ? null : validatedData.amount,
			expiresAt,
		})
		.returning();

	const responseData: ClaimResponse = {
		...newClaim,
		createdAt: newClaim.createdAt?.toISOString() ?? null,
		expiresAt: newClaim.expiresAt?.toISOString() ?? null,
	};

	return new Response(JSON.stringify(responseData), {
		status: 201,
		headers: { "Content-Type": "application/json" },
	});
}
