import { z } from "zod";

/**
 * Schema for creating a new invitation
 */
export const createInvitationSchema = z.object({
	email: z.string().email("Invalid email address"),
	role: z.enum(["member", "admin"]).optional().default("member"),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
