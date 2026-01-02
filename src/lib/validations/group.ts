import { z } from "zod";
import { ValidationMessageKeys } from "@/i18n/zod-messages";

/**
 * Schema for creating a new group
 */
export const createGroupSchema = z.object({
	name: z
		.string()
		.min(1, ValidationMessageKeys.nameRequired)
		.max(100, ValidationMessageKeys.nameTooLong),
	description: z
		.string()
		.max(500, ValidationMessageKeys.descriptionTooLong)
		.nullable()
		.optional(),
});

/**
 * Schema for updating an existing group
 * All fields are optional for partial updates
 */
export const updateGroupSchema = z.object({
	name: z
		.string()
		.min(1, ValidationMessageKeys.nameRequired)
		.max(100, ValidationMessageKeys.nameTooLong)
		.optional(),
	description: z
		.string()
		.max(500, ValidationMessageKeys.descriptionTooLong)
		.nullable()
		.optional(),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
