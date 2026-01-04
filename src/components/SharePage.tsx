import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ItemFormDialog } from "./ItemFormDialog";
import * as m from "@/paraglide/messages";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5,
			refetchOnWindowFocus: false,
		},
	},
});

interface SharePageProps {
	url?: string;
	title?: string;
	text?: string;
	isIOS: boolean;
}

function extractFirstUrl(text?: string): string | undefined {
	if (!text) return undefined;
	// Match URLs including those with special chars
	const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;
	const match = text.match(urlRegex);
	return match?.[0];
}

interface ParsedShareData {
	url?: string;
	name?: string;
	price?: string;
	notes?: string;
}

function parseShareText(text?: string): ParsedShareData {
	if (!text) return {};

	const result: ParsedShareData = {};

	// Extract URL
	const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;
	const urlMatch = text.match(urlRegex);
	if (urlMatch) {
		result.url = urlMatch[0];
	}

	// Remove URL from text
	const withoutUrl = text.replace(urlRegex, "").trim();

	// Try to extract price (supports $, €, £, C$, etc.)
	const priceRegex = /([A-Z]{0,2}\$|€|£|¥)\s*(\d+[.,]\d{2})/i;
	const priceMatch = withoutUrl.match(priceRegex);
	if (priceMatch) {
		// Convert to just the number for the price field
		result.price = priceMatch[2].replace(",", ".");
	}

	// Get product name - text after price separator or first line
	let nameText = withoutUrl;

	// Remove price from text
	nameText = nameText.replace(priceRegex, "").trim();

	// Remove common separators and prefixes
	nameText = nameText
		.replace(/^\|+\s*/, "") // Remove leading |
		.replace(/^(check out|look at|see|found|sharing|i just found this on \w+):?\s*/i, "")
		.replace(/[!]+$/, "")
		.split("\n")[0] // Get first line
		.trim();

	if (nameText) {
		result.name = nameText;
	}

	return result;
}

export function SharePage({ url, title, text, isIOS }: SharePageProps) {
	const [dialogOpen, setDialogOpen] = useState(true);

	// Parse shared text for URL, name, price
	const parsed = parseShareText(text);

	// Use explicit params first, fall back to parsed values
	const shareUrl = url || parsed.url;
	const shareName = title || parsed.name || "";
	const sharePrice = parsed.price || "";

	if (isIOS) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
				<h1 className="text-2xl font-bold">{m.share_notSupported?.() || "Share Target Not Supported"}</h1>
				<p className="text-muted-foreground text-center max-w-md">
					{m.share_iosMessage?.() || "iOS PWAs don't support web share targets yet. Open the app from your home screen and use Quick Add instead."}
				</p>
			</div>
		);
	}

	const handleOpenChange = (open: boolean) => {
		setDialogOpen(open);
		if (!open) {
			// Redirect to wishlist when dialog closes
			window.location.href = "/wishlist";
		}
	};

	return (
		<QueryClientProvider client={queryClient}>
			<div className="flex items-center justify-center min-h-screen">
				<ItemFormDialog
					open={dialogOpen}
					onOpenChange={handleOpenChange}
					item={null}
					defaultValues={{
						url: shareUrl || "",
						name: shareName,
						price: sharePrice,
					}}
				/>
			</div>
		</QueryClientProvider>
	);
}
