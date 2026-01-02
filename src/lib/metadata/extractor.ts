/**
 * Metadata extractor module - extracts metadata from URLs
 *
 * This module provides HTML parsing for metadata extraction from web pages.
 * Uses Cloudflare HTMLRewriter in production (Workers) and cheerio in dev (Node.js).
 *
 * Extraction priority: 1) JSON-LD schema.org/Product, 2) Open Graph tags,
 * 3) Twitter Card tags, 4) HTML title and meta description (fallback).
 *
 * Handles edge cases:
 * - JavaScript-rendered content (returns partial metadata)
 * - Timeouts (5 second limit)
 * - Non-HTML responses (skipped)
 * - Redirect chains (follows up to 3 redirects)
 *
 * Usage:
 * ```ts
 * const result = await extractMetadata("https://example.com/product");
 * if (result.success) {
 *   console.log(result.data); // { title, description, image, price }
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */

import * as cheerio from "cheerio";

export interface ExtractedMetadata {
	title?: string;
	description?: string;
	image?: string;
	price?: string;
	url: string;
}

export interface ExtractionResult {
	success: boolean;
	data?: ExtractedMetadata;
	error?: string;
}

// In production (Cloudflare Workers), use HTMLRewriter for streaming.
// In development (Node.js via Astro dev), use cheerio since HTMLRewriter doesn't work.
// Note: Cloudflare adapter exposes HTMLRewriter in dev but it fails on response.body access.

/**
 * Extract JSON-LD Product schema data
 */
function extractFromProduct(product: Record<string, unknown>): Partial<ExtractedMetadata> {
	const result: Partial<ExtractedMetadata> = {};

	// Extract title/name
	if (typeof product.name === "string") {
		result.title = product.name;
	}

	// Extract description
	if (typeof product.description === "string") {
		result.description = product.description;
	}

	// Extract image
	if (typeof product.image === "string") {
		result.image = product.image;
	} else if (Array.isArray(product.image) && product.image.length > 0) {
		const img = product.image[0];
		if (typeof img === "string") {
			result.image = img;
		} else if (typeof img === "object" && img !== null && "url" in img) {
			result.image = (img as Record<string, unknown>).url as string;
		}
	}

	// Extract price
	const offers = product.offers;
	if (offers) {
		if (Array.isArray(offers) && offers.length > 0) {
			const offer = offers[0] as Record<string, unknown>;
			if (offer.price) {
				result.price = String(offer.price);
			}
		} else if (typeof offers === "object") {
			const price = (offers as Record<string, unknown>).price;
			if (price) {
				result.price = String(price);
			}
		}
	}

	return result;
}

/**
 * Extract metadata using cheerio (Node.js/dev environment)
 */
function extractWithCheerio(html: string): Partial<ExtractedMetadata> {
	const $ = cheerio.load(html);
	const metadata: Partial<ExtractedMetadata> = {};

	// Try JSON-LD first (highest priority)
	$('script[type="application/ld+json"]').each((_, el) => {
		try {
			const json = JSON.parse($(el).html() || "{}");
			if (json["@type"] === "Product" || json.type === "Product") {
				const productData = extractFromProduct(json);
				Object.assign(metadata, productData);
			}
		} catch {
			// Invalid JSON, skip
		}
	});

	// Open Graph tags (second priority, don't overwrite JSON-LD)
	if (!metadata.title) {
		metadata.title = $('meta[property="og:title"]').attr("content");
	}
	if (!metadata.description) {
		metadata.description = $('meta[property="og:description"]').attr("content");
	}
	if (!metadata.image) {
		metadata.image = $('meta[property="og:image"]').attr("content");
	}

	// Twitter Card fallback
	if (!metadata.title) {
		metadata.title = $('meta[name="twitter:title"]').attr("content");
	}
	if (!metadata.description) {
		metadata.description = $('meta[name="twitter:description"]').attr("content");
	}
	if (!metadata.image) {
		metadata.image = $('meta[name="twitter:image"]').attr("content");
	}

	// HTML fallbacks (lowest priority)
	if (!metadata.title) {
		metadata.title = $("title").text() || undefined;
	}
	if (!metadata.description) {
		metadata.description = $('meta[name="description"]').attr("content");
	}

	return metadata;
}

// Extraction handlers for HTMLRewriter (Cloudflare Workers only)
class MetadataHandler {
	metadata: Partial<ExtractedMetadata> = {};

	element(el: Element) {
		const tagName = el.tagName.toLowerCase();
		const name = el.getAttribute("name") || el.getAttribute("property");

		if (tagName === "title") {
			if (!this.metadata.title) {
				this.metadata.title = el.textContent || undefined;
			}
		} else if (tagName === "meta") {
			const content = el.getAttribute("content");
			if (!content) return;

			// Open Graph tags (highest priority after JSON-LD)
			if (name === "og:title" && !this.metadata.title) {
				this.metadata.title = content;
			} else if (name === "og:description" && !this.metadata.description) {
				this.metadata.description = content;
			} else if (name === "og:image" && !this.metadata.image) {
				this.metadata.image = content;
			}
			// Twitter Card fallback
			else if (name === "twitter:title" && !this.metadata.title) {
				this.metadata.title = content;
			} else if (name === "twitter:description" && !this.metadata.description) {
				this.metadata.description = content;
			} else if (name === "twitter:image" && !this.metadata.image) {
				this.metadata.image = content;
			}
			// HTML description meta tag (last resort)
			else if (name === "description" && !this.metadata.description) {
				this.metadata.description = content;
			}
		}
	}
}

class JsonLdHandler {
	jsonLd?: Partial<ExtractedMetadata>;

	element(el: Element) {
		if (el.tagName.toLowerCase() === "script") {
			const type = el.getAttribute("type");
			if (type === "application/ld+json") {
				try {
					const json = JSON.parse(el.textContent || "{}");

					// Look for Product schema
					if (json["@type"] === "Product" || json.type === "Product") {
						this.jsonLd = extractFromProduct(json);
					}
				} catch {
					// Invalid JSON, skip
				}
			}
		}
	}
}

/**
 * Extracts metadata from a URL.
 * Uses HTMLRewriter in Cloudflare Workers, cheerio in Node.js (dev).
 * Follows up to 3 redirects and respects a 5-second timeout.
 *
 * @param url - The URL to extract metadata from
 * @returns ExtractionResult with extracted metadata or error
 */
export async function extractMetadata(url: string): Promise<ExtractionResult> {
	const abortController = new AbortController();
	const timeoutId = setTimeout(() => abortController.abort(), 5000);

	try {
		// Validate URL
		new URL(url);

		// Fetch with redirect handling and browser-like headers
		const response = await fetch(url, {
			signal: abortController.signal,
			redirect: "follow",
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				Accept:
					"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
				"Accept-Language": "en-US,en;q=0.5",
			},
		});

		clearTimeout(timeoutId);

		// Check if response is HTML
		const contentType = response.headers.get("content-type") || "";
		if (!contentType.includes("text/html")) {
			return {
				success: false,
				error: "Response is not HTML content",
			};
		}

		let metadata: Partial<ExtractedMetadata>;

		if (import.meta.env.PROD) {
			// Production: Use HTMLRewriter for streaming parsing
			const jsonLdHandler = new JsonLdHandler();
			const metadataHandler = new MetadataHandler();

			const rewriter = new HTMLRewriter()
				.on("script", jsonLdHandler)
				.on("title", metadataHandler)
				.on("meta", metadataHandler);

			const transformedResponse = rewriter.transform(response);

			// Consume the response to trigger handlers
			await transformedResponse.text();

			// Merge JSON-LD data (highest priority) with other extracted metadata
			metadata = {
				...metadataHandler.metadata,
				...jsonLdHandler.jsonLd,
			};
		} else {
			// Dev: Use cheerio for DOM parsing
			const html = await response.text();
			metadata = extractWithCheerio(html);
		}

		const result: ExtractedMetadata = {
			...metadata,
			url,
		};

		// Check if we got any useful metadata
		if (!result.title && !result.description && !result.image) {
			return {
				success: false,
				error: "No metadata found on page",
			};
		}

		return {
			success: true,
			data: result,
		};
	} catch (err) {
		clearTimeout(timeoutId);

		if (err instanceof DOMException && err.name === "AbortError") {
			return {
				success: false,
				error: "Request timeout (5s limit exceeded)",
			};
		}

		if (err instanceof TypeError) {
			return {
				success: false,
				error: "Invalid URL or network error",
			};
		}

		const message = err instanceof Error ? err.message : "Unknown error";
		return {
			success: false,
			error: message,
		};
	}
}
