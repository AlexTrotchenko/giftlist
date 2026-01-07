import { useMutation } from "@tanstack/react-query";
import type { ExtractMetadataResponse } from "./useMetadataExtract";

async function extractMetadataWithAi(url: string): Promise<ExtractMetadataResponse> {
	const response = await fetch("/api/extract-metadata-ai", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ url }),
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({ error: null })) as { error?: string };
		throw new Error(errorData.error || "Failed to extract metadata with AI");
	}

	return response.json();
}

export function useAiMetadataExtract() {
	return useMutation({
		mutationFn: (url: string) => extractMetadataWithAi(url),
	});
}
