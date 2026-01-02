import { z } from "zod";
import { ValidationMessageKeys } from "@/i18n/zod-messages";

/**
 * Schema for URL metadata input validation
 */
export const metadataSchema = z.object({
	url: z
		.string()
		.url(ValidationMessageKeys.invalidUrl)
		.max(2048),
});

export type MetadataInput = z.infer<typeof metadataSchema>;
