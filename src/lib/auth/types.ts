/**
 * Represents an authenticated user in our system.
 * This is our internal representation, decoupled from any auth provider.
 */
export interface AuthUser {
	/** Our internal user ID (from the users table) */
	id: string;
	/** Provider's user ID (e.g., Clerk ID) */
	providerId: string;
	/** User's email address */
	email: string;
	/** User's display name */
	name: string | null;
	/** URL to user's avatar image */
	avatarUrl: string | null;
}

/**
 * Webhook event types supported by the auth adapter.
 */
export type WebhookEventType = "user.created" | "user.updated" | "user.deleted";

/**
 * Represents a verified webhook event from the auth provider.
 */
export interface WebhookEvent {
	type: WebhookEventType;
	data: {
		providerId: string;
		email: string;
		name: string | null;
		avatarUrl: string | null;
	};
}

/**
 * Auth adapter interface for abstracting authentication providers.
 * Implement this interface to support different auth providers (Clerk, Auth0, etc.)
 */
export interface AuthAdapter {
	/**
	 * Get the currently authenticated user from the request context.
	 * @param request - The incoming request
	 * @param locals - Astro locals containing runtime context
	 * @returns The authenticated user or null if not authenticated
	 */
	getCurrentUser(
		request: Request,
		locals: App.Locals,
	): Promise<AuthUser | null>;

	/**
	 * Get a user by their provider ID.
	 * @param providerId - The provider's user ID (e.g., Clerk ID)
	 * @returns The user or null if not found
	 */
	getUserById(providerId: string): Promise<AuthUser | null>;

	/**
	 * Verify and parse an incoming webhook from the auth provider.
	 * @param request - The incoming webhook request
	 * @returns The verified webhook event
	 * @throws Error if verification fails
	 */
	verifyWebhook(request: Request): Promise<WebhookEvent>;
}
