/// <reference path="../../worker-configuration.d.ts" />

/**
 * Scheduled job for claim expiration management
 *
 * This module runs daily (9 AM UTC) via Cloudflare Cron Trigger to:
 * 1. Send reminder notifications for claims expiring within 3 days
 * 2. Auto-release expired claims
 * 3. Notify users when their claims are released
 */

import { and, eq, gt, isNotNull, lt, ne } from "drizzle-orm";
import { claims, groupMembers, itemRecipients, items, users } from "@/db/schema";
import { createDb, type Database } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

interface ClaimWithDetails {
	claimId: string;
	claimUserId: string;
	itemId: string;
	itemName: string;
	ownerId: string;
	expiresAt: Date;
}

/**
 * Send reminder notifications for claims expiring soon (within 3 days)
 */
async function sendExpiringReminders(db: Database): Promise<number> {
	const now = new Date();
	const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

	// Find claims that expire within 3 days but haven't expired yet
	const expiringClaims = await db
		.select({
			claimId: claims.id,
			claimUserId: claims.userId,
			itemId: claims.itemId,
			itemName: items.name,
			ownerId: items.ownerId,
			expiresAt: claims.expiresAt,
		})
		.from(claims)
		.innerJoin(items, eq(claims.itemId, items.id))
		.where(
			and(
				isNotNull(claims.expiresAt),
				gt(claims.expiresAt, now),
				lt(claims.expiresAt, threeDaysFromNow),
			),
		);

	let remindersSent = 0;

	for (const claim of expiringClaims as ClaimWithDetails[]) {
		const daysLeft = Math.ceil(
			(claim.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
		);

		const result = await createNotification(db, {
			userId: claim.claimUserId,
			type: "reminder",
			title: "Claim Expiring Soon",
			body:
				daysLeft === 1
					? `Your claim on "${claim.itemName}" expires tomorrow`
					: `Your claim on "${claim.itemName}" expires in ${daysLeft} days`,
			data: {
				itemId: claim.itemId,
				itemName: claim.itemName,
				expiresAt: claim.expiresAt.toISOString(),
				daysLeft,
			},
		});

		if (result.success) {
			remindersSent++;
		}
	}

	return remindersSent;
}

/**
 * Release expired claims and notify affected users
 */
async function releaseExpiredClaims(db: Database): Promise<number> {
	const now = new Date();

	// Find all expired claims
	const expiredClaims = await db
		.select({
			claimId: claims.id,
			claimUserId: claims.userId,
			itemId: claims.itemId,
			itemName: items.name,
			ownerId: items.ownerId,
			expiresAt: claims.expiresAt,
		})
		.from(claims)
		.innerJoin(items, eq(claims.itemId, items.id))
		.where(and(isNotNull(claims.expiresAt), lt(claims.expiresAt, now)));

	let releasedCount = 0;

	for (const claim of expiredClaims as ClaimWithDetails[]) {
		// Delete the expired claim
		await db.delete(claims).where(eq(claims.id, claim.claimId));
		releasedCount++;

		// Notify the claimer that their claim expired
		await createNotification(db, {
			userId: claim.claimUserId,
			type: "claim_released",
			title: "Claim Expired",
			body: `Your claim on "${claim.itemName}" has expired and been released`,
			data: {
				itemId: claim.itemId,
				itemName: claim.itemName,
				reason: "expired",
			},
		});

		// Notify other recipients that the item is now available
		// (excluding the owner who should never see claim info, and the expired claimer)
		const recipients = await db
			.selectDistinct({ userId: groupMembers.userId })
			.from(itemRecipients)
			.innerJoin(groupMembers, eq(itemRecipients.groupId, groupMembers.groupId))
			.where(
				and(
					eq(itemRecipients.itemId, claim.itemId),
					ne(groupMembers.userId, claim.ownerId), // Never notify owner
					ne(groupMembers.userId, claim.claimUserId), // Already notified above
				),
			);

		// Send "item available" notifications asynchronously
		await Promise.all(
			recipients.map((r) =>
				createNotification(db, {
					userId: r.userId,
					type: "claim_released",
					title: "Item Available",
					body: `"${claim.itemName}" is available again`,
					data: { itemId: claim.itemId, itemName: claim.itemName },
				}),
			),
		);
	}

	return releasedCount;
}

/**
 * Main scheduled handler for claim expiration processing
 */
export async function handleClaimExpiration(env: { DB: D1Database }): Promise<{
	remindersSent: number;
	claimsReleased: number;
}> {
	const db = createDb(env.DB);

	console.log("[expiration-check] Starting claim expiration check...");

	// Send reminders for claims expiring soon
	const remindersSent = await sendExpiringReminders(db);
	console.log(`[expiration-check] Sent ${remindersSent} expiring claim reminders`);

	// Release expired claims
	const claimsReleased = await releaseExpiredClaims(db);
	console.log(`[expiration-check] Released ${claimsReleased} expired claims`);

	console.log("[expiration-check] Claim expiration check complete");

	return { remindersSent, claimsReleased };
}
