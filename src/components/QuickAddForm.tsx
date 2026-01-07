import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAiMetadataExtract } from "@/hooks/useAiMetadataExtract";
import * as m from "@/paraglide/messages";

export interface ExtractedData {
	url: string;
	name?: string;
	price?: string;
	notes?: string;
	imageUrl?: string | null;
}

interface QuickAddFormProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onExtractComplete: (data: ExtractedData) => void;
}

type Phase = "url-input" | "loading";

function formatPriceForInput(cents: number | null): string {
	if (cents === null) return "";
	return (cents / 100).toFixed(2);
}

export function QuickAddForm({
	open,
	onOpenChange,
	onExtractComplete,
}: QuickAddFormProps) {
	const [phase, setPhase] = useState<Phase>("url-input");
	const [url, setUrl] = useState("");

	const aiExtract = useAiMetadataExtract();

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen) {
			resetForm();
		}
		onOpenChange(isOpen);
	};

	const resetForm = () => {
		setPhase("url-input");
		setUrl("");
		aiExtract.reset();
	};

	const handleFetchMetadata = async () => {
		if (!url.trim()) return;

		setPhase("loading");

		try {
			const data = await aiExtract.mutateAsync(url);
			// Success: pass extracted data to parent
			handleOpenChange(false);
			onExtractComplete({
				url,
				name: data.title,
				price: data.price ? formatPriceForInput(data.price) : undefined,
				notes: data.description,
				imageUrl: data.imageUrl || null,
			});
		} catch {
			// Failure: still pass URL to parent so user can fill manually
			handleOpenChange(false);
			onExtractComplete({ url });
		}
	};

	const isLoading = aiExtract.isPending;

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-h-[85dvh] overflow-y-auto overscroll-contain sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{m.item_quickAdd()}</DialogTitle>
					<DialogDescription>
						{m.item_quickAddDescription()}
					</DialogDescription>
				</DialogHeader>

				{/* Phase: URL Input */}
				{phase === "url-input" && (
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="quick-url">
								{m.item_url()} <span className="text-destructive">*</span>
							</Label>
							<Input
								id="quick-url"
								type="url"
								value={url}
								onChange={(e) => setUrl(e.target.value)}
								placeholder={m.item_urlPlaceholder()}
								onKeyDown={(e) => {
									if (e.key === "Enter" && url.trim()) {
										handleFetchMetadata();
									}
								}}
								disabled={isLoading}
							/>
						</div>
					</div>
				)}

				{/* Phase: Loading Skeleton */}
				{phase === "loading" && (
					<div className="grid gap-4 py-4">
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Sparkles className="size-4 animate-pulse text-primary" />
							<span>{m.item_extractingWithAi()}</span>
						</div>
						<Card className="animate-pulse">
							<CardContent className="pt-6">
								<div className="aspect-video w-full rounded bg-muted" />
							</CardContent>
						</Card>
						<div className="space-y-2">
							<div className="h-5 w-3/4 rounded bg-muted" />
							<div className="h-4 w-1/2 rounded bg-muted" />
							<div className="h-4 w-2/3 rounded bg-muted" />
						</div>
					</div>
				)}

				{/* Footer for URL Input Phase */}
				{phase === "url-input" && (
					<DialogFooter className="gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => handleOpenChange(false)}
						>
							{m.common_cancel()}
						</Button>
						<Button
							onClick={handleFetchMetadata}
							disabled={!url.trim() || isLoading}
						>
							<Sparkles className="size-4" />
							{m.item_quickAdd()}
						</Button>
					</DialogFooter>
				)}
			</DialogContent>
		</Dialog>
	);
}
