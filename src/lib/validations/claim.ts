import { z } from "zod";
import { ValidationMessageKeys } from "@/i18n/zod-messages";

/**
 * Schema for creating a new claim (full or partial)
 */
export const createClaimSchema = z.object({
	itemId: z.string().min(1, ValidationMessageKeys.itemIdRequired),
	// Amount in cents for partial claims. Omit or null for full claim.
	amount: z
		.number()
		.int(ValidationMessageKeys.amountMustBeInteger)
		.min(1, ValidationMessageKeys.amountMustBePositive)
		.nullable()
		.optional(),
});

export type CreateClaimInput = z.infer<typeof createClaimSchema>;
