import { z } from "zod";

/**
 * Schema for creating a new group
 */
export const createGroupSchema = z.object({
	name: z.string().min(1, "Name is required").max(100, "Name too long"),
	description: z.string().max(500, "Description too long").nullable().optional(),
});

/**
 * Schema for updating an existing group
 * All fields are optional for partial updates
 */
export const updateGroupSchema = z.object({
	name: z.string().min(1, "Name is required").max(100, "Name too long").optional(),
	description: z.string().max(500, "Description too long").nullable().optional(),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
