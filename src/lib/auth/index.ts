/**
 * Auth module - provides authentication abstraction layer
 *
 * This module exports a configured auth adapter instance and types.
 * The adapter abstracts the auth provider (Clerk) so it can be swapped
 * in the future without changing consumer code.
 *
 * Usage in Astro pages/endpoints:
 * ```ts
 * import { getAuthAdapter } from "@/lib/auth";
 *
 * const auth = getAuthAdapter(Astro.locals.runtime.env);
 * const user = await auth.getCurrentUser(Astro.request, Astro.locals);
 * ```
 */

import { createClerkAdapter } from "./clerk-adapter";

export { createClerkAdapter };
export type {
	AuthAdapter,
	AuthUser,
	WebhookEvent,
	WebhookEventType,
} from "./types";

/**
 * Environment variables required for auth
 */
interface AuthEnv {
	CLERK_SECRET_KEY: string;
	CLERK_WEBHOOK_SECRET?: string;
}

/**
 * Creates an auth adapter configured for the current environment.
 *
 * @param env - Environment bindings containing auth secrets
 * @returns Configured AuthAdapter instance
 */
export function getAuthAdapter(env: AuthEnv) {
	return createClerkAdapter(env.CLERK_SECRET_KEY, env.CLERK_WEBHOOK_SECRET);
}
