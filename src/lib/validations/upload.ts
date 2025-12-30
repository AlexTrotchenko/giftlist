import { z } from "zod";

export const ALLOWED_IMAGE_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
] as const;

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const uploadSchema = z.object({
	file: z.instanceof(File).refine(
		(file) => ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number]),
		{ message: "File must be JPEG, PNG, WebP, or GIF" }
	).refine(
		(file) => file.size <= MAX_FILE_SIZE,
		{ message: "File must be 5MB or less" }
	),
});

export type UploadInput = z.infer<typeof uploadSchema>;
