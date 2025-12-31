/**
 * Notification service - provides helpers for creating notifications and sending invitation emails
 *
 * This module provides a factory function for creating notification helpers that work with
 * the database and email services. Uses the same factory pattern as email.ts and db.ts.
 *
 * Usage in Astro pages/endpoints:
 * ```ts
 * import { createNotificationService } from "@/lib/notifications";
 * import { createDb } from "@/lib/db";
 * import { createEmailClient } from "@/lib/email";
 *
 * const db = createDb(Astro.locals.runtime.env.DB);
 * const email = createEmailClient(Astro.locals.runtime.env.RESEND_API_KEY);
 * const notificationService = createNotificationService(db, email);
 *
 * // Create an in-app notification
 * const notification = await notificationService.createNotification({
 *   userId: user.id,
 *   type: "group_invitation",
 *   title: "You've been invited!",
 *   body: "John invited you to join Family Wishlist",
 *   data: { groupId: "abc123", inviterId: "xyz789" },
 * });
 *
 * // Send invitation with both notification and email
 * const result = await notificationService.sendInvitationEmail({
 *   userId: user.id,
 *   inviteeEmail: "user@example.com",
 *   inviterName: "John Doe",
 *   groupName: "Family Wishlist",
 *   inviteUrl: "https://example.com/invite/abc123",
 * });
 *
 * // Notify inviter when invitation is accepted
 * await notificationService.notifyInvitationAccepted({
 *   inviterId: invitation.inviterId,
 *   accepterName: "Jane Doe",
 *   groupName: "Family Wishlist",
 *   groupId: "abc123",
 * });
 *
 * // Notify all group members when someone joins
 * await notificationService.notifyMemberJoined({
 *   memberUserIds: existingMemberIds,
 *   newMemberName: "Jane Doe",
 *   groupName: "Family Wishlist",
 *   groupId: "abc123",
 * });
 *
 * // Notify all group members when someone leaves
 * await notificationService.notifyMemberLeft({
 *   memberUserIds: remainingMemberIds,
 *   leftMemberName: "Jane Doe",
 *   groupName: "Family Wishlist",
 *   groupId: "abc123",
 * });
 * ```
 */

import { notifications } from "@/db/schema";
import type { Notification } from "@/db/types";
import type { Database } from "@/lib/db";
import type { EmailClient, SendEmailResult } from "@/lib/email";

/** Notification types used throughout the application */
export type NotificationType =
	| "group_invitation"
	| "invitation_accepted"
	| "item_purchased"
	| "item_added"
	| "item_deleted"
	| "claim_released"
	| "member_joined"
	| "member_left"
	| "reminder";

/** Input for creating a new notification */
export interface CreateNotificationInput {
	userId: string;
	type: NotificationType | string;
	title: string;
	body: string;
	data?: Record<string, unknown>;
}

/** Result from creating a notification */
export interface CreateNotificationResult {
	success: boolean;
	notification?: Notification;
	error?: string;
}

/** Input for sending an invitation email with notification */
export interface SendInvitationEmailInput {
	/** The internal user ID to create the notification for (optional - may not exist yet for new users) */
	userId?: string;
	inviteeEmail: string;
	inviterName: string;
	groupName: string;
	inviteUrl: string;
	/** Additional data to store in the notification */
	data?: Record<string, unknown>;
}

/** Combined result from sending invitation email and creating notification */
export interface SendInvitationEmailResult {
	emailResult: SendEmailResult;
	notificationResult?: CreateNotificationResult;
}

/** Input for notifying when an invitation is accepted */
export interface InvitationAcceptedInput {
	/** User ID of the person who sent the invitation */
	inviterId: string;
	/** Name of the user who accepted */
	accepterName: string;
	/** Name of the group joined */
	groupName: string;
	/** Group ID for deep linking */
	groupId: string;
}

/** Input for notifying group members about a new member */
export interface MemberJoinedInput {
	/** User IDs of existing group members to notify (excluding the new member) */
	memberUserIds: string[];
	/** Name of the new member */
	newMemberName: string;
	/** Name of the group */
	groupName: string;
	/** Group ID for deep linking */
	groupId: string;
}

/** Input for notifying group members about a member leaving */
export interface MemberLeftInput {
	/** User IDs of remaining group members to notify */
	memberUserIds: string[];
	/** Name of the member who left */
	leftMemberName: string;
	/** Name of the group */
	groupName: string;
	/** Group ID for deep linking */
	groupId: string;
}

/** Input for notifying claimers when their claims are released */
export interface ClaimsReleasedInput {
	/** Array of claim info with user ID and item name */
	claims: Array<{
		userId: string;
		itemName: string;
		itemId: string;
	}>;
	/** Reason the claim was released */
	reason: "owner_joined_group" | "item_unshared" | "group_deleted";
	/** Name of the group involved */
	groupName: string;
}

/** Notification service interface */
export interface NotificationService {
	createNotification(
		input: CreateNotificationInput,
	): Promise<CreateNotificationResult>;
	sendInvitationEmail(
		input: SendInvitationEmailInput,
	): Promise<SendInvitationEmailResult>;
	notifyInvitationAccepted(
		input: InvitationAcceptedInput,
	): Promise<CreateNotificationResult>;
	notifyMemberJoined(
		input: MemberJoinedInput,
	): Promise<CreateNotificationResult[]>;
	notifyMemberLeft(input: MemberLeftInput): Promise<CreateNotificationResult[]>;
	notifyClaimsReleased(
		input: ClaimsReleasedInput,
	): Promise<CreateNotificationResult[]>;
}

/**
 * Creates a notification service configured with database and email clients.
 *
 * @param db - Database instance from createDb()
 * @param emailClient - Email client instance from createEmailClient()
 * @returns Configured NotificationService instance
 */
export function createNotificationService(
	db: Database,
	emailClient: EmailClient,
): NotificationService {
	return {
		async createNotification(
			input: CreateNotificationInput,
		): Promise<CreateNotificationResult> {
			const { userId, type, title, body, data } = input;

			try {
				const [notification] = await db
					.insert(notifications)
					.values({
						userId,
						type,
						title,
						body,
						data: data ?? null,
					})
					.returning();

				return { success: true, notification };
			} catch (err) {
				const message = err instanceof Error ? err.message : "Unknown error";
				console.error("Failed to create notification:", message);
				return { success: false, error: message };
			}
		},

		async sendInvitationEmail(
			input: SendInvitationEmailInput,
		): Promise<SendInvitationEmailResult> {
			const { userId, inviteeEmail, inviterName, groupName, inviteUrl, data } =
				input;

			// Send the email (skip if no email client configured or in dev without verified domain)
			let emailResult: SendEmailResult;
			try {
				emailResult = await emailClient.sendInvitation({
					to: inviteeEmail,
					inviterName,
					groupName,
					inviteUrl,
				});
				// Log but don't fail if email fails - notifications still work
				if (!emailResult.success) {
					console.warn("Email send failed (non-fatal):", emailResult.error);
				}
			} catch (err) {
				console.warn("Email send skipped:", err instanceof Error ? err.message : err);
				emailResult = { success: false, error: "Email skipped in dev" };
			}

			// If userId is provided, also create an in-app notification
			let notificationResult: CreateNotificationResult | undefined;
			if (userId) {
				notificationResult = await this.createNotification({
					userId,
					type: "group_invitation",
					title: `Invitation to ${groupName}`,
					body: `${inviterName} invited you to join "${groupName}"`,
					data: {
						groupName,
						inviterName,
						inviteUrl,
						...data,
					},
				});
			}

			return { emailResult, notificationResult };
		},

		async notifyInvitationAccepted(
			input: InvitationAcceptedInput,
		): Promise<CreateNotificationResult> {
			const { inviterId, accepterName, groupName, groupId } = input;

			return this.createNotification({
				userId: inviterId,
				type: "invitation_accepted",
				title: "Invitation Accepted",
				body: `${accepterName} accepted your invitation to join "${groupName}"`,
				data: { groupId, accepterName, groupName },
			});
		},

		async notifyMemberJoined(
			input: MemberJoinedInput,
		): Promise<CreateNotificationResult[]> {
			const { memberUserIds, newMemberName, groupName, groupId } = input;

			const results = await Promise.all(
				memberUserIds.map((userId) =>
					this.createNotification({
						userId,
						type: "member_joined",
						title: "New Group Member",
						body: `${newMemberName} joined "${groupName}"`,
						data: { groupId, newMemberName, groupName },
					}),
				),
			);

			return results;
		},

		async notifyMemberLeft(
			input: MemberLeftInput,
		): Promise<CreateNotificationResult[]> {
			const { memberUserIds, leftMemberName, groupName, groupId } = input;

			const results = await Promise.all(
				memberUserIds.map((userId) =>
					this.createNotification({
						userId,
						type: "member_left",
						title: "Member Left Group",
						body: `${leftMemberName} left "${groupName}"`,
						data: { groupId, leftMemberName, groupName },
					}),
				),
			);

			return results;
		},

		async notifyClaimsReleased(
			input: ClaimsReleasedInput,
		): Promise<CreateNotificationResult[]> {
			const { claims: claimInfos, reason, groupName } = input;

			const reasonMessages: Record<typeof reason, string> = {
				owner_joined_group: `The item owner joined "${groupName}"`,
				item_unshared: `The item was unshared from "${groupName}"`,
				group_deleted: `The group "${groupName}" was deleted`,
			};

			const results = await Promise.all(
				claimInfos.map(({ userId, itemName, itemId }) =>
					this.createNotification({
						userId,
						type: "claim_released",
						title: "Claim Released",
						body: `Your claim on "${itemName}" has been released. ${reasonMessages[reason]}.`,
						data: { itemId, itemName, groupName, reason },
					}),
				),
			);

			return results;
		},
	};
}

/**
 * Standalone helper to create a notification without needing the full service.
 * Useful when you only need to create notifications without email functionality.
 *
 * @param db - Database instance from createDb()
 * @param input - Notification input data
 * @returns Result with success status and created notification
 */
export async function createNotification(
	db: Database,
	input: CreateNotificationInput,
): Promise<CreateNotificationResult> {
	const { userId, type, title, body, data } = input;

	try {
		const [notification] = await db
			.insert(notifications)
			.values({
				userId,
				type,
				title,
				body,
				data: data ?? null,
			})
			.returning();

		return { success: true, notification };
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		console.error("Failed to create notification:", message);
		return { success: false, error: message };
	}
}
