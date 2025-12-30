import type { APIContext } from "astro";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from "@/lib/validations/upload";

/**
 * POST /api/upload - Upload an image to R2
 * Accepts multipart/form-data with a "file" field
 * Returns the public URL of the uploaded image
 */
export async function POST(context: APIContext) {
	const db = createDb(context.locals.runtime.env.DB);
	const auth = getAuthAdapter(context.locals.runtime.env);
	const r2 = context.locals.runtime.env.R2;

	// Auth check
	const authUser = await auth.getCurrentUser(context.request, context.locals);
	if (!authUser) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Look up internal user by Clerk ID
	const user = await db
		.select()
		.from(users)
		.where(eq(users.clerkId, authUser.providerId))
		.get();

	if (!user) {
		return new Response(JSON.stringify({ error: "User not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Parse multipart form data
	let formData: FormData;
	try {
		formData = await context.request.formData();
	} catch {
		return new Response(JSON.stringify({ error: "Invalid form data" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const file = formData.get("file");
	if (!file || !(file instanceof File)) {
		return new Response(JSON.stringify({ error: "No file provided" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Validate file type
	if (!ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number])) {
		return new Response(
			JSON.stringify({ error: "File must be JPEG, PNG, WebP, or GIF" }),
			{
				status: 400,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	// Validate file size
	if (file.size > MAX_FILE_SIZE) {
		return new Response(
			JSON.stringify({ error: "File must be 5MB or less" }),
			{
				status: 400,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	// Generate unique filename with original extension
	const ext = file.name.split(".").pop() || getExtensionFromMime(file.type);
	const filename = `${nanoid()}.${ext}`;

	// Upload to R2
	try {
		await r2.put(filename, file, {
			httpMetadata: {
				contentType: file.type,
			},
		});
	} catch {
		return new Response(JSON.stringify({ error: "Upload failed" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Use API route to serve images - works in both dev (local R2) and production
	const url = `/api/images/${filename}`;

	return new Response(JSON.stringify({ url }), {
		status: 201,
		headers: { "Content-Type": "application/json" },
	});
}

function getExtensionFromMime(mimeType: string): string {
	const mimeToExt: Record<string, string> = {
		"image/jpeg": "jpg",
		"image/png": "png",
		"image/webp": "webp",
		"image/gif": "gif",
	};
	return mimeToExt[mimeType] || "bin";
}
