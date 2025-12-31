/**
 * Custom Cloudflare Worker entrypoint
 *
 * This module extends the Astro-generated worker to add a scheduled event handler
 * for cron triggers. It re-exports Astro's default handler and adds our scheduled handler.
 */

import { handleClaimExpiration } from "./scheduled/expiration-check";

// Re-export everything from Astro's default cloudflare entrypoint
// This includes the createExports function that Astro uses
export { createExports } from "@astrojs/cloudflare/entrypoints/server.js";

/**
 * Scheduled event handler for Cloudflare Cron Triggers
 *
 * Runs daily at 9 AM UTC (configured in wrangler.jsonc)
 * - Sends reminders for claims expiring within 3 days
 * - Auto-releases expired claims
 * - Notifies users when claims are released
 */
export async function scheduled(
	event: ScheduledEvent,
	env: { DB: D1Database },
	ctx: ExecutionContext,
): Promise<void> {
	console.log(
		`[scheduled] Cron trigger: ${event.cron} at ${new Date(event.scheduledTime).toISOString()}`,
	);

	// Use waitUntil to ensure the work completes even if the handler returns early
	ctx.waitUntil(
		(async () => {
			try {
				const result = await handleClaimExpiration(env);
				console.log(
					`[scheduled] Complete: ${result.remindersSent} reminders, ${result.claimsReleased} claims released`,
				);
			} catch (error) {
				console.error("[scheduled] Error:", error);
				throw error; // Re-throw to trigger Cloudflare's automatic retry
			}
		})(),
	);
}
