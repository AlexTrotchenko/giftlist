import { z } from "zod";
import { ValidationMessageKeys } from "@/i18n/zod-messages";

/**
 * Schema for adding recipients (groups) to an item
 */
export const addRecipientsSchema = z.object({
	groupIds: z
		.array(z.string().min(1, ValidationMessageKeys.groupIdRequired))
		.min(1, ValidationMessageKeys.atLeastOneGroupRequired),
});

/**
 * Schema for removing recipients (groups) from an item
 */
export const removeRecipientsSchema = z.object({
	groupIds: z
		.array(z.string().min(1, ValidationMessageKeys.groupIdRequired))
		.min(1, ValidationMessageKeys.atLeastOneGroupRequired),
});

export type AddRecipientsInput = z.infer<typeof addRecipientsSchema>;
export type RemoveRecipientsInput = z.infer<typeof removeRecipientsSchema>;
