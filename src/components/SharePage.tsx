import { useState } from "react";
import { QuickAddForm } from "./QuickAddForm";
import * as m from "@/paraglide/messages";

interface SharePageProps {
	url?: string;
	title?: string;
	text?: string;
	isIOS: boolean;
}

function extractFirstUrl(text?: string): string | undefined {
	if (!text) return undefined;
	const urlRegex = /(https?:\/\/[^\s]+)/;
	const match = text.match(urlRegex);
	return match?.[1];
}

export function SharePage({ url, title, text, isIOS }: SharePageProps) {
	const [dialogOpen, setDialogOpen] = useState(true);

	// Extract first valid URL from text param if url not provided
	const shareUrl = url || extractFirstUrl(text);
	const shareTitle = title;
	const shareDescription = text ? text.split("\n")[0] : "";

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

	return (
		<div className="flex items-center justify-center min-h-screen">
			<QuickAddForm
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onSuccess={() => {
					// Redirect to wishlist after successful save
					window.location.href = "/wishlist";
				}}
				prefillUrl={shareUrl}
				prefillTitle={shareTitle}
				prefillDescription={shareDescription}
			/>
		</div>
	);
}
