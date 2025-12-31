import { z } from "zod";

/**
 * Schema for creating a new claim (full or partial)
 */
export const createClaimSchema = z.object({
	itemId: z.string().min(1, "Item ID is required"),
	// Amount in cents for partial claims. Omit or null for full claim.
	amount: z
		.number()
		.int("Amount must be an integer (cents)")
		.min(1, "Amount must be positive")
		.nullable()
		.optional(),
});

export type CreateClaimInput = z.infer<typeof createClaimSchema>;
