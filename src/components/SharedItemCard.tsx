import { ExternalLink, User } from "lucide-react";
import type { SharedItem } from "@/hooks/useSharedItems";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

interface SharedItemCardProps {
	sharedItem: SharedItem;
}

function formatPrice(cents: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(cents / 100);
}

export function SharedItemCard({ sharedItem }: SharedItemCardProps) {
	const { item, owner, sharedVia } = sharedItem;

	return (
		<Card className="overflow-hidden transition-shadow hover:shadow-md">
			{/* Image or placeholder */}
			<div className="aspect-[4/3] w-full overflow-hidden bg-muted">
				{item.imageUrl ? (
					<img
						src={item.imageUrl}
						alt={item.name}
						loading="lazy"
						decoding="async"
						className="h-full w-full object-cover transition-opacity duration-300"
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center">
						<span className="text-sm text-muted-foreground">No image</span>
					</div>
				)}
			</div>

			<CardHeader className="pb-2">
				<div className="flex items-start justify-between gap-2">
					<CardTitle className="line-clamp-2 text-base">{item.name}</CardTitle>
					{item.price !== null && (
						<span className="shrink-0 font-semibold text-primary">
							{formatPrice(item.price)}
						</span>
					)}
				</div>
				{/* Owner info */}
				<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
					<User className="size-3" />
					<span>{owner.name || owner.email}</span>
				</div>
			</CardHeader>

			<CardContent className="flex-1 py-0">
				{item.notes && (
					<p className="line-clamp-2 text-sm text-muted-foreground">
						{item.notes}
					</p>
				)}
				{/* Shared via groups */}
				<div className="mt-2 flex flex-wrap gap-1">
					{sharedVia.map((group) => (
						<span
							key={group.groupId}
							className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
						>
							{group.groupName}
						</span>
					))}
				</div>
			</CardContent>

			<CardFooter className="pt-4">
				{item.url ? (
					<a
						href={item.url}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1 text-sm text-primary transition-colors hover:text-primary/80"
					>
						<ExternalLink className="size-3.5" />
						View product
					</a>
				) : (
					<span />
				)}
			</CardFooter>
		</Card>
	);
}
