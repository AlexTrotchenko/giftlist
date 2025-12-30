import { z } from "zod";

/**
 * Schema for creating a new wishlist item
 */
export const createItemSchema = z.object({
	name: z.string().min(1, "Name is required").max(255, "Name too long"),
	url: z.string().url("Invalid URL").max(2048).nullable().optional(),
	price: z
		.number()
		.int("Price must be an integer (cents)")
		.min(0, "Price cannot be negative")
		.nullable()
		.optional(),
	notes: z.string().max(1000, "Notes too long").nullable().optional(),
	imageUrl: z.string().url("Invalid image URL").max(2048).nullable().optional(),
});

/**
 * Schema for updating an existing wishlist item
 * All fields are optional for partial updates
 */
export const updateItemSchema = z.object({
	name: z
		.string()
		.min(1, "Name is required")
		.max(255, "Name too long")
		.optional(),
	url: z.string().url("Invalid URL").max(2048).nullable().optional(),
	price: z
		.number()
		.int("Price must be an integer (cents)")
		.min(0, "Price cannot be negative")
		.nullable()
		.optional(),
	notes: z.string().max(1000, "Notes too long").nullable().optional(),
	imageUrl: z.string().url("Invalid image URL").max(2048).nullable().optional(),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
