import type { APIContext } from "astro";
import { and, eq } from "drizzle-orm";
import { claims, users } from "@/db/schema";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";

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

	await db
		.delete(claims)
		.where(and(eq(claims.id, claimId), eq(claims.userId, user.id)));

	return new Response(null, { status: 204 });
}
