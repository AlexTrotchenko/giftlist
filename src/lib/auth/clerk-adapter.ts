import { createClerkClient } from "@clerk/backend";
import { Webhook } from "svix";
import type {
	AuthAdapter,
	AuthUser,
	WebhookEvent,
	WebhookEventType,
} from "./types";

/**
 * Clerk-specific types for webhook payloads
 */
interface ClerkUserData {
	id: string;
	email_addresses: Array<{
		email_address: string;
		id: string;
	}>;
	primary_email_address_id: string | null;
	first_name: string | null;
	last_name: string | null;
	image_url: string | null;
}

interface ClerkWebhookPayload {
	type: string;
	data: ClerkUserData;
}

/**
 * Extract primary email from Clerk user data
 */
function getPrimaryEmail(userData: ClerkUserData): string {
	const primaryEmailObj = userData.email_addresses.find(
		(e) => e.id === userData.primary_email_address_id,
	);
	return (
		primaryEmailObj?.email_address ??
		userData.email_addresses[0]?.email_address ??
		""
	);
}

/**
 * Build full name from first and last name
 */
function getFullName(
	firstName: string | null,
	lastName: string | null,
): string | null {
	if (!firstName && !lastName) return null;
	return [firstName, lastName].filter(Boolean).join(" ");
}

/**
 * Creates a Clerk auth adapter instance.
 *
 * @param secretKey - Clerk secret key (CLERK_SECRET_KEY)
 * @param webhookSecret - Clerk webhook signing secret (CLERK_WEBHOOK_SECRET)
 */
export function createClerkAdapter(
	secretKey: string,
	webhookSecret?: string,
): AuthAdapter {
	const clerk = createClerkClient({ secretKey });

	return {
		async getCurrentUser(
			_request: Request,
			locals: App.Locals,
		): Promise<AuthUser | null> {
			// Access auth from Astro locals (set by Clerk middleware)
			// The auth() function is attached to locals by @clerk/astro middleware
			const auth = (
				locals as { auth?: () => { userId: string | null } }
			).auth?.();

			if (!auth?.userId) {
				return null;
			}

			// Fetch full user details from Clerk
			const clerkUser = await clerk.users.getUser(auth.userId);

			const primaryEmail = clerkUser.emailAddresses.find(
				(e) => e.id === clerkUser.primaryEmailAddressId,
			);

			return {
				id: "", // Will be populated by the caller with our internal user ID
				providerId: clerkUser.id,
				email: primaryEmail?.emailAddress ?? "",
				name: getFullName(clerkUser.firstName, clerkUser.lastName),
				avatarUrl: clerkUser.imageUrl,
			};
		},

		async getUserById(providerId: string): Promise<AuthUser | null> {
			try {
				const clerkUser = await clerk.users.getUser(providerId);

				const primaryEmail = clerkUser.emailAddresses.find(
					(e) => e.id === clerkUser.primaryEmailAddressId,
				);

				return {
					id: "", // Will be populated by the caller with our internal user ID
					providerId: clerkUser.id,
					email: primaryEmail?.emailAddress ?? "",
					name: getFullName(clerkUser.firstName, clerkUser.lastName),
					avatarUrl: clerkUser.imageUrl,
				};
			} catch {
				return null;
			}
		},

		async verifyWebhook(request: Request): Promise<WebhookEvent> {
			if (!webhookSecret) {
				throw new Error("CLERK_WEBHOOK_SECRET is not configured");
			}

			const svix = new Webhook(webhookSecret);

			// Get required headers for verification
			const svixId = request.headers.get("svix-id");
			const svixTimestamp = request.headers.get("svix-timestamp");
			const svixSignature = request.headers.get("svix-signature");

			if (!svixId || !svixTimestamp || !svixSignature) {
				throw new Error("Missing svix headers for webhook verification");
			}

			const body = await request.text();

			// Verify the webhook signature
			const payload = svix.verify(body, {
				"svix-id": svixId,
				"svix-timestamp": svixTimestamp,
				"svix-signature": svixSignature,
			}) as ClerkWebhookPayload;

			// Map Clerk event types to our internal types
			const eventTypeMap: Record<string, WebhookEventType> = {
				"user.created": "user.created",
				"user.updated": "user.updated",
				"user.deleted": "user.deleted",
			};

			const eventType = eventTypeMap[payload.type];
			if (!eventType) {
				throw new Error(`Unsupported webhook event type: ${payload.type}`);
			}

			return {
				type: eventType,
				data: {
					providerId: payload.data.id,
					email: getPrimaryEmail(payload.data),
					name: getFullName(payload.data.first_name, payload.data.last_name),
					avatarUrl: payload.data.image_url,
				},
			};
		},
	};
}
