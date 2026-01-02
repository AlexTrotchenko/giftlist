import { z } from "zod";
import { ValidationMessageKeys } from "@/i18n/zod-messages";

/**
 * Schema for creating a new invitation
 */
export const createInvitationSchema = z.object({
	email: z.string().email(ValidationMessageKeys.invalidEmail),
	role: z.enum(["member", "admin"]).optional().default("member"),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
