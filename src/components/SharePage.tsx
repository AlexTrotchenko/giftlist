import { useState } from "react";
import { ItemFormDialog } from "./ItemFormDialog";
import * as m from "@/paraglide/messages";

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

function extractDescriptionWithoutUrl(text?: string): string {
	if (!text) return "";
	// Remove URLs from text to get clean description
	const withoutUrls = text.replace(/(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi, "").trim();
	// Get first line and clean up
	const firstLine = withoutUrls.split("\n")[0].trim();
	// Remove common share prefixes
	return firstLine
		.replace(/^(check out|look at|see|found|sharing):?\s*/i, "")
		.replace(/[!]+$/, "")
		.trim();
}

export function SharePage({ url, title, text, isIOS }: SharePageProps) {
	const [dialogOpen, setDialogOpen] = useState(true);

	// Extract URL: prefer explicit url param, then extract from text
	const shareUrl = url || extractFirstUrl(text);
	const shareTitle = title;
	// Get description without the URL in it
	const shareDescription = extractDescriptionWithoutUrl(text);

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
		<div className="flex items-center justify-center min-h-screen">
			<ItemFormDialog
				open={dialogOpen}
				onOpenChange={handleOpenChange}
				item={null}
				defaultValues={{
					url: shareUrl || "",
					name: shareTitle || "",
					notes: shareDescription || "",
				}}
			/>
		</div>
	);
}
