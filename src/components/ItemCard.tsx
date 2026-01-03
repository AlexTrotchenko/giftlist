import { ExternalLink, Pencil, Trash2, Users } from "lucide-react";
import type { ItemResponse } from "@/db/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useItemRecipients } from "@/hooks/useItemRecipients";
import * as m from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { formatPrice } from "@/i18n/formatting";

interface ItemCardProps {
	item: ItemResponse;
	onEdit: (item: ItemResponse) => void;
	onDelete: (item: ItemResponse) => void;
}

export function ItemCard({ item, onEdit, onDelete }: ItemCardProps) {
	const { data: recipients = [] } = useItemRecipients(item.id);
	const locale = getLocale();

	return (
		<Card className="group overflow-hidden transition-shadow hover:shadow-md">
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
						<span className="text-sm text-muted-foreground">{m.common_noImage()}</span>
					</div>
				)}
			</div>

			<CardHeader className="pb-2">
				<div className="flex items-start justify-between gap-2">
					<CardTitle className="line-clamp-2 text-base">{item.name}</CardTitle>
					{item.price !== null && (
						<span className="shrink-0 font-semibold text-primary">
							{formatPrice(item.price, locale)}
						</span>
					)}
				</div>
			</CardHeader>

			<CardContent className="flex-1 space-y-2 py-0">
				{item.notes && (
					<p className="line-clamp-2 text-sm text-muted-foreground">
						{item.notes}
					</p>
				)}
				{recipients.length > 0 && (
					<div className="flex flex-wrap items-center gap-1">
						<Users className="size-3.5 text-muted-foreground" />
						{recipients.map((recipient) => (
							<Badge
								key={recipient.id}
								variant="secondary"
								className="text-xs"
							>
								{recipient.group.name}
							</Badge>
						))}
					</div>
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
						{m.common_viewProduct()}
					</a>
				) : (
					<span />
				)}
				<div className="flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						onClick={() => onEdit(item)}
						aria-label={m.item_editAriaLabel({ name: item.name })}
					>
						<Pencil className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
						onClick={() => onDelete(item)}
						aria-label={m.item_deleteAriaLabel({ name: item.name })}
					>
						<Trash2 className="size-4" />
					</Button>
				</div>
			</CardFooter>
		</Card>
	);
}
