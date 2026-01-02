import type { APIContext } from "astro";
import { ZodError } from "zod";
import { extractMetadata } from "@/lib/metadata/extractor";
import { metadataSchema } from "@/lib/validations/metadata";

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
 * POST /api/extract-metadata - Extract metadata from a URL
 * Request body: { url: string }
 * Response: { title, description, imageUrl, price (cents), siteName }
 */
export async function POST(context: APIContext) {
	let body: unknown;
	try {
		body = await context.request.json();
	} catch {
		return new Response(JSON.stringify({ error: "Invalid JSON" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Validate with schema
	let validatedData: { url: string };
	try {
		validatedData = metadataSchema.parse(body);
	} catch (error) {
		if (error instanceof ZodError) {
			return new Response(
				JSON.stringify({ error: "Validation error", details: error.errors }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}
		throw error;
	}

	// SSRF prevention: validate URL security
	const securityCheck = validateUrlSecurity(validatedData.url);
	if (!securityCheck.valid) {
		return new Response(JSON.stringify({ error: securityCheck.error }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Extract metadata
	const result = await extractMetadata(validatedData.url);

	if (!result.success) {
		return new Response(JSON.stringify({ error: result.error }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Map extracted metadata to response format
	const response = {
		title: result.data?.title,
		description: result.data?.description,
		imageUrl: result.data?.image,
		price: result.data?.price ? Math.round(parseFloat(result.data.price) * 100) : null,
		siteName: result.data?.url ? new URL(result.data.url).hostname : null,
	};

	return new Response(JSON.stringify(response), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}
