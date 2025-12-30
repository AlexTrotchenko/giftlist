import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

interface Item {
	id: string;
	ownerId: string;
	name: string;
	url: string | null;
	price: number | null;
	notes: string | null;
	imageUrl: string | null;
	createdAt: string | null;
	updatedAt: string | null;
}

interface ItemCardProps {
	item: Item;
	onEdit: (item: Item) => void;
	onDelete: (item: Item) => void;
}

function formatPrice(cents: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(cents / 100);
}

export function ItemCard({ item, onEdit, onDelete }: ItemCardProps) {
	return (
		<Card className="group overflow-hidden transition-shadow hover:shadow-md">
			{/* Image or placeholder */}
			{item.imageUrl ? (
				<img
					src={item.imageUrl}
					alt={item.name}
					className="h-40 w-full object-cover"
				/>
			) : (
				<div className="flex h-40 w-full items-center justify-center bg-muted">
					<span className="text-sm text-muted-foreground">No image</span>
				</div>
			)}

			<CardHeader className="pb-2">
				<div className="flex items-start justify-between gap-2">
					<CardTitle className="line-clamp-2 text-base">{item.name}</CardTitle>
					{item.price !== null && (
						<span className="shrink-0 font-semibold text-primary">
							{formatPrice(item.price)}
						</span>
					)}
				</div>
			</CardHeader>

			<CardContent className="flex-1 py-0">
				{item.notes && (
					<p className="line-clamp-2 text-sm text-muted-foreground">
						{item.notes}
					</p>
				)}
			</CardContent>

			<CardFooter className="justify-between gap-2 pt-4">
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
				<div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						onClick={() => onEdit(item)}
						aria-label={`Edit ${item.name}`}
					>
						<Pencil className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
						onClick={() => onDelete(item)}
						aria-label={`Delete ${item.name}`}
					>
						<Trash2 className="size-4" />
					</Button>
				</div>
			</CardFooter>
		</Card>
	);
}
