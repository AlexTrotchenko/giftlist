import type { APIContext } from "astro";
import { and, eq, isNotNull, isNull, ne, sum } from "drizzle-orm";
import { ZodError } from "zod";
import { claims, groupMembers, itemRecipients, items, users } from "@/db/schema";
import type { ClaimResponse, MyClaimResponse } from "@/db/types";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
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

	// Fetch user's claims with item and owner details
	const userClaims = await db
		.select({
			id: claims.id,
			itemId: claims.itemId,
			userId: claims.userId,
			amount: claims.amount,
			expiresAt: claims.expiresAt,
			createdAt: claims.createdAt,
			itemName: items.name,
			itemImageUrl: items.imageUrl,
			itemUrl: items.url,
			itemPrice: items.price,
			ownerId: users.id,
			ownerName: users.name,
			ownerAvatarUrl: users.avatarUrl,
		})
		.from(claims)
		.innerJoin(items, eq(claims.itemId, items.id))
		.innerJoin(users, eq(items.ownerId, users.id))
		.where(eq(claims.userId, user.id));

	const responseData: MyClaimResponse[] = userClaims.map((row) => ({
		id: row.id,
		itemId: row.itemId,
		userId: row.userId,
		amount: row.amount,
		createdAt: row.createdAt?.toISOString() ?? null,
		expiresAt: row.expiresAt?.toISOString() ?? null,
		item: {
			id: row.itemId,
			name: row.itemName,
			imageUrl: row.itemImageUrl,
			url: row.itemUrl,
			price: row.itemPrice,
		},
		owner: {
			id: row.ownerId,
			name: row.ownerName,
			avatarUrl: row.ownerAvatarUrl,
		},
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

	// For partial claims: validate amount doesn't exceed remaining claimable amount
	if (!isFullClaim) {
		// Partial claims require the item to have a price
		if (item.price === null) {
			return new Response(
				JSON.stringify({ error: "Partial claims are only allowed for items with a price" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// Check for any existing full claim (cannot add partial claims if fully claimed)
		const existingFullClaim = await db
			.select({ id: claims.id })
			.from(claims)
			.where(and(eq(claims.itemId, validatedData.itemId), isNull(claims.amount)))
			.get();

		if (existingFullClaim) {
			return new Response(
				JSON.stringify({ error: "This item has already been fully claimed" }),
				{
					status: 409,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// Calculate total claimed amount using SUM aggregation
		const [claimedResult] = await db
			.select({ totalClaimed: sum(claims.amount) })
			.from(claims)
			.where(and(eq(claims.itemId, validatedData.itemId), isNotNull(claims.amount)));

		const totalClaimed = Number(claimedResult?.totalClaimed ?? 0);
		const remainingAmount = item.price - totalClaimed;

		// Reject if claim would exceed item price
		if (validatedData.amount! > remainingAmount) {
			return new Response(
				JSON.stringify({
					error: "Claim amount exceeds remaining claimable amount",
					remainingAmount,
					requestedAmount: validatedData.amount,
				}),
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

	// Notify recipients that the item was claimed (NEVER notify the owner)
	// Get all recipients (group members who can see this item) except the owner and claimer
	const recipients = await db
		.selectDistinct({ userId: groupMembers.userId })
		.from(itemRecipients)
		.innerJoin(groupMembers, eq(itemRecipients.groupId, groupMembers.groupId))
		.where(
			and(
				eq(itemRecipients.itemId, validatedData.itemId),
				ne(groupMembers.userId, item.ownerId), // Never notify owner
				ne(groupMembers.userId, user.id), // Don't notify the claimer themselves
			),
		);

	// Send notifications asynchronously (don't block the response)
	if (recipients.length > 0) {
		Promise.all(
			recipients.map((r) =>
				createNotification(db, {
					userId: r.userId,
					type: "item_claimed",
					title: "Item Claimed",
					body: `"${item.name}" was claimed`,
					data: { itemId: item.id, itemName: item.name },
				}),
			),
		).catch((err) => console.error("Failed to send claim notifications:", err));
	}

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
