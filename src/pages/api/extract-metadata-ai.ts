import type { APIContext } from "astro";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import { getAuthAdapter } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { extractMetadata } from "@/lib/metadata/extractor";
import { createPerplexityClient } from "@/lib/perplexity";

// Private IP ranges for SSRF prevention (CIDR blocks)
const PRIVATE_IP_RANGES = [
	/^127\./, // 127.0.0.0/8 (loopback)
	/^10\./, // 10.0.0.0/8
	/^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
	/^192\.168\./, // 192.168.0.0/16
	/^169\.254\./, // 169.254.0.0/16 (link-local)
	/^::1$/, // IPv6 loopback
	/^fc00:/i, // IPv6 private
	/^fe80:/i, // IPv6 link-local
];

/**
 * Check if an IP address is private/reserved
 */
function isPrivateIP(host: string): boolean {
	// Remove port if present
	const hostOnly = host.split(":")[0];
	return PRIVATE_IP_RANGES.some((pattern) => pattern.test(hostOnly));
}

/**
 * Validate URL for SSRF vulnerabilities
 */
function validateUrlSecurity(urlStr: string): { valid: boolean; error?: string } {
	try {
		const url = new URL(urlStr);

		// Only allow http and https
		if (url.protocol !== "http:" && url.protocol !== "https:") {
			return { valid: false, error: "Only HTTP and HTTPS protocols are allowed" };
		}

		// Only allow standard ports
		if (url.port && ![80, 443].includes(parseInt(url.port))) {
			return { valid: false, error: "Only ports 80 and 443 are allowed" };
		}

		// Check for private IPs
		if (isPrivateIP(url.hostname)) {
			return { valid: false, error: "Access to private IP addresses is not allowed" };
		}

		return { valid: true };
	} catch {
		return { valid: false, error: "Invalid URL format" };
	}
}

/**
 * Parse price string to cents
 */
function parsePriceToCents(priceStr: string | null): number | null {
	if (!priceStr) return null;

	// Extract first number (with optional decimal)
	const match = priceStr.match(/[\d]+[.,]?\d*/);
	if (!match) return null;

	// Normalize: replace comma with dot for decimal
	const normalized = match[0].replace(",", ".");
	const value = parseFloat(normalized);

	return isNaN(value) ? null : Math.round(value * 100);
}

/**
 * POST /api/extract-metadata-ai - Extract metadata from a URL using AI (Perplexity)
 * Request body: { url: string }
 * Response: { title, description, imageUrl, price (cents), siteName }
 */
export async function POST(context: APIContext) {
	const db = createDb(context.locals.runtime.env.DB);
	const auth = getAuthAdapter(context.locals.runtime.env);

	// Authenticate
	const authUser = await auth.getCurrentUser(context.request, context.locals);
	if (!authUser) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Get internal user
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

	// Check if Perplexity API key is configured
	// Note: PERPLEXITY_API_KEY is stored as a secret in Cloudflare Workers
	const perplexityApiKey = (context.locals.runtime.env as { PERPLEXITY_API_KEY?: string }).PERPLEXITY_API_KEY;
	if (!perplexityApiKey) {
		return new Response(
			JSON.stringify({ error: "AI extraction is not configured" }),
			{
				status: 503,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	let body: unknown;
	try {
		body = await context.request.json();
	} catch {
		return new Response(JSON.stringify({ error: "Invalid JSON" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Accept either { url: string } or { query: string }
	const data = body as { url?: string; query?: string };
	const input = data.url || data.query;

	if (!input || typeof input !== "string" || input.length > 2048) {
		return new Response(
			JSON.stringify({ error: "Provide either 'url' or 'query' (max 2048 chars)" }),
			{ status: 400, headers: { "Content-Type": "application/json" } },
		);
	}

	// SSRF prevention: validate URL security (only if it looks like a URL)
	const isUrl = /^https?:\/\//i.test(input);
	if (isUrl) {
		const securityCheck = validateUrlSecurity(input);
		if (!securityCheck.valid) {
			return new Response(JSON.stringify({ error: securityCheck.error }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}
	}

	// Extract metadata using Perplexity AI
	const perplexity = createPerplexityClient(perplexityApiKey);
	const result = await perplexity.extractProduct(input);

	if (!result.success) {
		return new Response(JSON.stringify({ error: result.error }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	// If no image from Perplexity and we have a URL, try basic extraction
	let imageUrl = result.data?.image ?? null;
	if (!imageUrl && isUrl) {
		try {
			const metaResult = await extractMetadata(input);
			if (metaResult.success && metaResult.data?.image) {
				imageUrl = metaResult.data.image;
			}
		} catch {
			// Ignore fallback errors
		}
	}

	// Map extracted metadata to response format
	const response = {
		title: result.data?.name,
		description: result.data?.description,
		imageUrl,
		price: parsePriceToCents(result.data?.price ?? null),
		siteName: isUrl ? new URL(input).hostname : null,
	};

	return new Response(JSON.stringify(response), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}
