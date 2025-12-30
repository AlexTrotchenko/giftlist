import type { APIContext } from "astro";

/**
 * GET /api/images/:key - Serve an image from R2
 * This route proxies images from R2, working in both dev (local storage) and production.
 */
export async function GET(context: APIContext) {
	const { key } = context.params;

	if (!key) {
		return new Response("Not found", { status: 404 });
	}

	const r2 = context.locals.runtime.env.R2;

	const object = await r2.get(key);
	if (!object) {
		return new Response("Not found", { status: 404 });
	}

	const headers = new Headers();
	headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
	headers.set("Cache-Control", "public, max-age=31536000, immutable");
	headers.set("ETag", object.httpEtag);

	return new Response(object.body, { headers });
}
