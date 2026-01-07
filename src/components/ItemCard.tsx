import { memo, useState } from "react";
import {
	Archive,
	ExternalLink,
	Gift,
	MoreVertical,
	Pencil,
	RotateCcw,
	Share2,
	Trash2,
	Users,
} from "lucide-react";
import { toast } from "sonner";
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { PriorityStars } from "@/components/PriorityStars";
import { RecipientsPicker } from "@/components/RecipientsPicker";
import { useItemRecipients, useSetItemRecipients } from "@/hooks/useItemRecipients";
import { useCreateGroup } from "@/hooks/useGroups";
import { useReceiveItem, useArchiveItem, useRestoreItem } from "@/hooks/useArchive";
import type { GroupResponse } from "@/db/types";
import * as m from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { formatPrice } from "@/i18n/formatting";

interface ItemCardProps {
	item: ItemResponse;
	groups: GroupResponse[];
	onEdit: (item: ItemResponse) => void;
	onDelete: (item: ItemResponse) => void;
}

export const ItemCard = memo(function ItemCard({ item, groups, onEdit, onDelete }: ItemCardProps) {
	const { data: recipients = [] } = useItemRecipients(item.id);
	const setItemRecipients = useSetItemRecipients();
	const createGroup = useCreateGroup();
	const receiveItem = useReceiveItem();
	const archiveItem = useArchiveItem();
	const restoreItem = useRestoreItem();
	const locale = getLocale();

	const [shareOpen, setShareOpen] = useState(false);
	const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

	const handleReceive = () => {
		toast.promise(receiveItem.mutateAsync(item.id), {
			loading: m.common_saving(),
			success: m.archive_receiveSuccess(),
			error: (err) => err.message || m.errors_genericError(),
		});
	};

	const handleArchive = () => {
		toast.promise(archiveItem.mutateAsync(item.id), {
			loading: m.common_saving(),
			success: m.archive_archiveSuccess(),
			error: (err) => err.message || m.errors_genericError(),
		});
	};

	const handleRestore = () => {
		toast.promise(restoreItem.mutateAsync(item.id), {
			loading: m.common_saving(),
			success: m.archive_restoreSuccess(),
			error: (err) => err.message || m.errors_genericError(),
		});
	};

	const isArchiveActionPending =
		receiveItem.isPending || archiveItem.isPending || restoreItem.isPending;

	const currentGroupIds = recipients.map((r) => r.groupId);

	const handleShareOpen = (open: boolean) => {
		if (open) {
			// Initialize with current recipients when opening
			setSelectedGroupIds(currentGroupIds);
		}
		setShareOpen(open);
	};

	const handleSelectedChange = (groupIds: string[]) => {
		setSelectedGroupIds(groupIds);

		// Immediately save changes
		const hasChanges =
			groupIds.length !== currentGroupIds.length ||
			groupIds.some((id) => !currentGroupIds.includes(id));

		if (hasChanges) {
			toast.promise(
				setItemRecipients.mutateAsync({
					itemId: item.id,
					groupIds,
					currentGroupIds,
				}),
				{
					loading: m.common_saving(),
					success: m.item_updateSuccess(),
					error: m.errors_failedToSave(),
				},
			);
		}
	};

	const handleCreateGroup = async (name: string) => {
		const newGroup = await createGroup.mutateAsync({ name });
		return newGroup;
	};

	return (
		<Card className="group overflow-hidden transition-shadow hover:shadow-md">
			{/* Image or placeholder */}
			<div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
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
				{/* Status badge for received/archived items */}
				{item.status === "received" && (
					<Badge
						variant="secondary"
						className="absolute left-2 top-2 gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
					>
						<Gift className="size-3" />
						{m.archive_statusReceived()}
					</Badge>
				)}
				{item.status === "archived" && (
					<Badge
						variant="secondary"
						className="absolute left-2 top-2 gap-1 bg-muted text-muted-foreground"
					>
						<Archive className="size-3" />
						{m.archive_statusArchived()}
					</Badge>
				)}
			</div>

			<CardHeader className="pb-2">
				<div className="flex items-start justify-between gap-2">
					<CardTitle className="line-clamp-2 text-base">{item.name}</CardTitle>
					<div className="flex shrink-0 items-center gap-2">
						<PriorityStars priority={item.priority} />
						{item.price !== null && (
							<span className="font-semibold text-primary">
								{formatPrice(item.price, locale)}
							</span>
						)}
					</div>
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
						onClick={() => onEdit(item)}
						aria-label={m.item_editAriaLabel({ name: item.name })}
					>
						<Pencil className="size-4" />
					</Button>
					<Popover open={shareOpen} onOpenChange={handleShareOpen}>
						<PopoverTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="relative"
								aria-label={m.item_shareAriaLabel({ name: item.name })}
							>
								<Share2 className="size-4" />
								{recipients.length > 0 && (
									<span
										className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground"
										aria-label={m.item_sharedWithCount({ count: recipients.length })}
									>
										{recipients.length}
									</span>
								)}
							</Button>
						</PopoverTrigger>
						<PopoverContent
							side="top"
							sideOffset={8}
							collisionPadding={16}
							className="w-72 p-3"
						>
							<RecipientsPicker
								groups={groups}
								selectedGroupIds={selectedGroupIds}
								onSelectedChange={handleSelectedChange}
								onCreateGroup={handleCreateGroup}
								isCreatingGroup={createGroup.isPending}
								disabled={setItemRecipients.isPending}
							/>
						</PopoverContent>
					</Popover>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								aria-label={m.archive_moreActions()}
								disabled={isArchiveActionPending}
							>
								<MoreVertical className="size-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" sideOffset={8}>
							{/* Active items can be marked as received or archived */}
							{item.status === "active" && (
								<>
									<DropdownMenuItem onClick={handleReceive}>
										<Gift className="mr-2 size-4 text-green-600" />
										{m.archive_markReceived()}
									</DropdownMenuItem>
									<DropdownMenuItem onClick={handleArchive}>
										<Archive className="mr-2 size-4" />
										{m.archive_archive()}
									</DropdownMenuItem>
								</>
							)}
							{/* Received items can be archived or restored */}
							{item.status === "received" && (
								<>
									<DropdownMenuItem onClick={handleArchive}>
										<Archive className="mr-2 size-4" />
										{m.archive_archive()}
									</DropdownMenuItem>
									<DropdownMenuItem onClick={handleRestore}>
										<RotateCcw className="mr-2 size-4" />
										{m.archive_restore()}
									</DropdownMenuItem>
								</>
							)}
							{/* Archived items can only be restored */}
							{item.status === "archived" && (
								<DropdownMenuItem onClick={handleRestore}>
									<RotateCcw className="mr-2 size-4" />
									{m.archive_restore()}
								</DropdownMenuItem>
							)}
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={() => onDelete(item)}
								className="text-destructive focus:bg-destructive/10 focus:text-destructive"
							>
								<Trash2 className="mr-2 size-4" />
								{m.common_delete()}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</CardFooter>
		</Card>
	);
});
