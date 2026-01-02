import { z } from "zod";
import { ValidationMessageKeys } from "@/i18n/zod-messages";

export const ALLOWED_IMAGE_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
] as const;

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const uploadSchema = z.object({
	file: z
		.instanceof(File)
		.refine(
			(file) =>
				ALLOWED_IMAGE_TYPES.includes(
					file.type as (typeof ALLOWED_IMAGE_TYPES)[number],
				),
			{ message: ValidationMessageKeys.fileMustBeImage },
		)
		.refine((file) => file.size <= MAX_FILE_SIZE, {
			message: ValidationMessageKeys.fileTooLarge,
		}),
});

export type UploadInput = z.infer<typeof uploadSchema>;
