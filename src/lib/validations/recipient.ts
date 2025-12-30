import { z } from "zod";

/**
 * Schema for adding recipients (groups) to an item
 */
export const addRecipientsSchema = z.object({
	groupIds: z
		.array(z.string().min(1, "Group ID is required"))
		.min(1, "At least one group ID is required"),
});

/**
 * Schema for removing recipients (groups) from an item
 */
export const removeRecipientsSchema = z.object({
	groupIds: z
		.array(z.string().min(1, "Group ID is required"))
		.min(1, "At least one group ID is required"),
});

export type AddRecipientsInput = z.infer<typeof addRecipientsSchema>;
export type RemoveRecipientsInput = z.infer<typeof removeRecipientsSchema>;
