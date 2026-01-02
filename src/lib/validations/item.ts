import { z } from "zod";
import { ValidationMessageKeys } from "@/i18n/zod-messages";

const imageUrlSchema = z
	.string()
	.max(2048)
	.refine(
		(val) => {
			// Accept relative /api/images/ paths
			if (val.startsWith("/api/images/")) return true;
			// Accept full URLs
			try {
				new URL(val);
				return true;
			} catch {
				return false;
			}
		},
		{ message: ValidationMessageKeys.invalidImageUrl },
	);

/**
 * Schema for creating a new wishlist item
 */
export const createItemSchema = z.object({
	name: z
		.string()
		.min(1, ValidationMessageKeys.nameRequired)
		.max(255, ValidationMessageKeys.nameTooLong),
	url: z
		.string()
		.url(ValidationMessageKeys.invalidUrl)
		.max(2048)
		.nullable()
		.optional(),
	price: z
		.number()
		.int(ValidationMessageKeys.priceMustBeInteger)
		.min(0, ValidationMessageKeys.priceCannotBeNegative)
		.nullable()
		.optional(),
	notes: z
		.string()
		.max(1000, ValidationMessageKeys.notesTooLong)
		.nullable()
		.optional(),
	imageUrl: imageUrlSchema.nullable().optional(),
});

/**
 * Schema for updating an existing wishlist item
 * All fields are optional for partial updates
 */
export const updateItemSchema = z.object({
	name: z
		.string()
		.min(1, ValidationMessageKeys.nameRequired)
		.max(255, ValidationMessageKeys.nameTooLong)
		.optional(),
	url: z
		.string()
		.url(ValidationMessageKeys.invalidUrl)
		.max(2048)
		.nullable()
		.optional(),
	price: z
		.number()
		.int(ValidationMessageKeys.priceMustBeInteger)
		.min(0, ValidationMessageKeys.priceCannotBeNegative)
		.nullable()
		.optional(),
	notes: z
		.string()
		.max(1000, ValidationMessageKeys.notesTooLong)
		.nullable()
		.optional(),
	imageUrl: imageUrlSchema.nullable().optional(),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
