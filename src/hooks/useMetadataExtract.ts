import { useMutation } from "@tanstack/react-query";

export interface ExtractMetadataResponse {
	title?: string;
	description?: string;
	imageUrl?: string;
	price: number | null;
	siteName: string | null;
}

async function extractMetadata(url: string): Promise<ExtractMetadataResponse> {
	const response = await fetch("/api/extract-metadata", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ url }),
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.error || "Failed to extract metadata");
	}

	return response.json();
}

export function useMetadataExtract() {
	return useMutation({
		mutationFn: (url: string) => extractMetadata(url),
	});
}
