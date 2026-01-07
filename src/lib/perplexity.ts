/**
 * Perplexity AI module - provides product data extraction via Perplexity API
 *
 * This module exports a configured Perplexity client for extracting product
 * information from URLs using AI. Uses the sonar-pro model with structured JSON output.
 *
 * Usage in Astro pages/endpoints:
 * ```ts
 * import { createPerplexityClient } from "@/lib/perplexity";
 *
 * const perplexity = createPerplexityClient(Astro.locals.runtime.env.PERPLEXITY_API_KEY);
 * const result = await perplexity.extractProduct("https://example.com/product");
 * if (result.success) {
 *   console.log(result.data); // { name, price, image, description, currency }
 * }
 * ```
 */

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";
const MODEL = "sonar-pro";
const MAX_TOKENS = 1500;
const TEMPERATURE = 0.1;

export interface ProductExtractionResult {
	success: boolean;
	data?: {
		name: string;
		price: string | null;
		image: string | null;
		description: string | null;
		currency: string | null;
	};
	error?: string;
}

export interface PerplexityClient {
	extractProduct(input: string): Promise<ProductExtractionResult>;
}

const productSchema = {
	type: "object",
	properties: {
		name: { type: "string", description: "Product title" },
		price: { type: ["string", "null"], description: "Price as displayed, e.g. '$19.99' or '149 UAH'" },
		image: { type: ["string", "null"], description: "Direct image URL ending in .jpg, .jpeg, .png, .webp or .gif" },
		description: { type: ["string", "null"], description: "Brief 1-2 sentence description" },
		currency: { type: ["string", "null"], description: "Currency code (USD, EUR, UAH)" },
	},
	required: ["name"],
};

const systemPrompt = `You are a product data extractor. Search online and extract product information. Return valid JSON matching the schema.`;

/**
 * Check if input looks like a URL
 */
function isUrl(input: string): boolean {
	return /^https?:\/\//i.test(input) || /^www\./i.test(input);
}

/**
 * Creates a Perplexity client configured with the API key.
 *
 * @param apiKey - Perplexity API key from environment
 * @returns Configured PerplexityClient instance
 */
export function createPerplexityClient(apiKey: string): PerplexityClient {
	return {
		async extractProduct(input: string): Promise<ProductExtractionResult> {
			try {
				const isUrlInput = isUrl(input);
				const userMessage = isUrlInput
					? `Extract product data from this URL: ${input}`
					: `Search for this product and extract data from the first result: ${input}`;

				// Only filter by domain if it's a URL
				const searchFilter = isUrlInput
					? { search_domain_filter: [new URL(input).hostname] }
					: {};

				const response = await fetch(PERPLEXITY_API_URL, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${apiKey}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						model: MODEL,
						messages: [
							{
								role: "system",
								content: systemPrompt,
							},
							{
								role: "user",
								content: userMessage,
							},
						],
						response_format: {
							type: "json_schema",
							json_schema: { schema: productSchema },
						},
						...searchFilter,
						max_tokens: MAX_TOKENS,
						temperature: TEMPERATURE,
					}),
				});

				if (!response.ok) {
					const errorText = await response.text();
					console.error("Perplexity API error:", response.status, errorText);

					// Handle rate limiting with specific message
					if (response.status === 429) {
						return {
							success: false,
							error: "AI extraction is temporarily unavailable. Please try again in a moment.",
						};
					}

					return {
						success: false,
						error: `AI extraction failed (${response.status})`,
					};
				}

				const data = await response.json() as {
					choices?: Array<{ message?: { content?: string } }>;
				};

				// Parse the structured output
				let content = data.choices?.[0]?.message?.content;
				if (!content) {
					return {
						success: false,
						error: "No content returned from AI",
					};
				}

				// sonar-pro may include <think> tags before JSON - strip them
				content = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

				// Extract JSON from response (may have extra text)
				const jsonMatch = content.match(/\{[\s\S]*\}/);
				if (!jsonMatch) {
					console.error("No JSON found in response:", content);
					return {
						success: false,
						error: "Could not parse AI response",
					};
				}

				// Parse the JSON response
				const product = JSON.parse(jsonMatch[0]);

				// Validate required field
				if (!product.name) {
					return {
						success: false,
						error: "Could not extract product name from page",
					};
				}

				return {
					success: true,
					data: {
						name: product.name,
						price: product.price || null,
						image: product.image || null,
						description: product.description || null,
						currency: product.currency || null,
					},
				};
			} catch (err) {
				const message = err instanceof Error ? err.message : "Unknown error";
				console.error("Perplexity client error:", message);

				// Handle JSON parse errors gracefully
				if (message.includes("JSON")) {
					return {
						success: false,
						error: "AI returned invalid response format",
					};
				}

				return {
					success: false,
					error: message,
				};
			}
		},
	};
}
