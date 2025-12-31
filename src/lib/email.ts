/**
 * Email module - provides email sending via Resend
 *
 * This module exports a configured email client for sending transactional emails.
 * Uses Resend SDK which is Edge-ready and works with Cloudflare Workers.
 *
 * Usage in Astro pages/endpoints:
 * ```ts
 * import { createEmailClient } from "@/lib/email";
 *
 * const email = createEmailClient(Astro.locals.runtime.env.RESEND_API_KEY);
 * const result = await email.sendInvitation({
 *   to: "user@example.com",
 *   inviterName: "John Doe",
 *   groupName: "Family Wishlist",
 *   inviteUrl: "https://example.com/invite/abc123",
 * });
 * ```
 */

import { Resend } from "resend";

export interface SendEmailResult {
	success: boolean;
	id?: string;
	error?: string;
}

export interface InvitationEmailData {
	to: string;
	inviterName: string;
	groupName: string;
	inviteUrl: string;
}

export interface EmailClient {
	sendInvitation(data: InvitationEmailData): Promise<SendEmailResult>;
	sendRaw(params: {
		to: string | string[];
		subject: string;
		html: string;
		from?: string;
	}): Promise<SendEmailResult>;
}

// Use Resend's test address for dev, verified domain for production
const DEFAULT_FROM = import.meta.env.PROD
	? "Giftlist <noreply@giftlist.app>"
	: "Giftlist <onboarding@resend.dev>";

/**
 * Creates an email client configured with the Resend API key.
 *
 * @param apiKey - Resend API key from environment
 * @returns Configured EmailClient instance
 */
export function createEmailClient(apiKey: string): EmailClient {
	const resend = new Resend(apiKey);

	return {
		async sendInvitation(data: InvitationEmailData): Promise<SendEmailResult> {
			const { to, inviterName, groupName, inviteUrl } = data;

			const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited!</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>${inviterName}</strong> has invited you to join their group <strong>"${groupName}"</strong> on Giftlist.
    </p>

    <p style="font-size: 14px; color: #666; margin-bottom: 24px;">
      Giftlist makes it easy to share wishlists with friends and family, so everyone knows exactly what to get.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Accept Invitation
      </a>
    </div>

    <p style="font-size: 12px; color: #999; margin-top: 30px; text-align: center;">
      If the button doesn't work, copy and paste this link:<br>
      <a href="${inviteUrl}" style="color: #667eea; word-break: break-all;">${inviteUrl}</a>
    </p>
  </div>

  <p style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">
    You received this email because someone invited you to Giftlist.<br>
    If you didn't expect this invitation, you can safely ignore this email.
  </p>
</body>
</html>
`;

			try {
				const { data, error } = await resend.emails.send({
					from: DEFAULT_FROM,
					to,
					subject: `${inviterName} invited you to join "${groupName}" on Giftlist`,
					html,
				});

				if (error) {
					console.error("Resend error:", error);
					return { success: false, error: error.message };
				}

				return { success: true, id: data?.id };
			} catch (err) {
				const message = err instanceof Error ? err.message : "Unknown error";
				console.error("Email client error:", message);
				return { success: false, error: message };
			}
		},

		async sendRaw(params): Promise<SendEmailResult> {
			const { to, subject, html, from = DEFAULT_FROM } = params;

			try {
				const { data, error } = await resend.emails.send({
					from,
					to: Array.isArray(to) ? to : [to],
					subject,
					html,
				});

				if (error) {
					console.error("Resend error:", error);
					return { success: false, error: error.message };
				}

				return { success: true, id: data?.id };
			} catch (err) {
				const message = err instanceof Error ? err.message : "Unknown error";
				console.error("Email client error:", message);
				return { success: false, error: message };
			}
		},
	};
}
