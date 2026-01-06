import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Gift, Plus } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ItemCard } from "@/components/ItemCard";
import { ItemFormDialog } from "@/components/ItemFormDialog";
import { QuickAddFAB } from "@/components/QuickAddFAB";
import { QuickAddForm, type ExtractedData } from "@/components/QuickAddForm";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useGroups } from "@/hooks/useGroups";
import { useDeleteItem, useItems } from "@/hooks/useItems";
import { useQuickAddShortcut } from "@/hooks/useQuickAddShortcut";
import { LocaleProvider, type Locale } from "@/i18n/LocaleContext";
import type { Item } from "@/lib/api";
import * as m from "@/paraglide/messages";

// Sort options combining key and direction for simpler UX
type SortOption =
	| "newest"
	| "oldest"
	| "price-high"
	| "price-low"
	| "name-az"
	| "name-za"
	| "priority-high"
	| "priority-low";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5,
			refetchOnWindowFocus: false,
		},
	},
});

interface WishlistPageProps {
	initialItems: Item[];
	locale: Locale;
}

function EmptyState({ onAddItem, onQuickAdd }: { onAddItem: () => void; onQuickAdd: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center">
			<div className="mb-4 rounded-full bg-muted p-4">
				<Gift className="size-8 text-muted-foreground" />
			</div>
			<h2 className="mb-2 text-xl font-semibold">{m.wishlist_emptyTitle()}</h2>
			<p className="mb-6 max-w-sm text-muted-foreground">
				{m.wishlist_emptyDescription()}
			</p>
			<div className="flex gap-2">
				<Button variant="outline" onClick={onQuickAdd}>
					<Plus className="size-4" />
					{m.item_quickAdd()}
				</Button>
				<Button onClick={onAddItem}>
					<Plus className="size-4" />
					{m.wishlist_addFirstItem()}
				</Button>
			</div>
		</div>
	);
}

function LoadingSkeleton() {
	return (
		<div className="container mx-auto max-w-screen-xl px-4 py-8">
			<div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="h-8 w-32 animate-pulse rounded bg-muted" />
				<div className="flex gap-2">
					<div className="h-9 w-24 animate-pulse rounded bg-muted" />
					<div className="h-9 w-24 animate-pulse rounded bg-muted" />
				</div>
			</div>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{[1, 2, 3].map((i) => (
					<div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
				))}
			</div>
		</div>
	);
}

function WishlistContent({ initialItems }: { initialItems: Item[] }) {
	const { data: items = [], isLoading } = useItems(initialItems);
	const { data: groups = [] } = useGroups();
	const deleteItem = useDeleteItem();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<Item | null>(null);
	const [quickAddOpen, setQuickAddOpen] = useState(false);
	const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
	const [deletingItem, setDeletingItem] = useState<Item | null>(null);
	const [sortBy, setSortBy] = useState<SortOption>("newest");

	// Sort items based on selected sort option
	const sortedItems = useMemo(() => {
		const sorted = [...items];
		return sorted.sort((a, b) => {
			switch (sortBy) {
				case "newest":
					return (
						new Date(b.createdAt ?? 0).getTime() -
						new Date(a.createdAt ?? 0).getTime()
					);
				case "oldest":
					return (
						new Date(a.createdAt ?? 0).getTime() -
						new Date(b.createdAt ?? 0).getTime()
					);
				case "price-high":
					// Items without price go to the end
					if (a.price == null && b.price == null) return 0;
					if (a.price == null) return 1;
					if (b.price == null) return -1;
					return b.price - a.price;
				case "price-low":
					// Items without price go to the end
					if (a.price == null && b.price == null) return 0;
					if (a.price == null) return 1;
					if (b.price == null) return -1;
					return a.price - b.price;
				case "name-az":
					return a.name.localeCompare(b.name);
				case "name-za":
					return b.name.localeCompare(a.name);
				case "priority-high":
					// Items without priority go to the end
					if (a.priority == null && b.priority == null) return 0;
					if (a.priority == null) return 1;
					if (b.priority == null) return -1;
					return b.priority - a.priority;
				case "priority-low":
					// Items without priority go to the end
					if (a.priority == null && b.priority == null) return 0;
					if (a.priority == null) return 1;
					if (b.priority == null) return -1;
					return a.priority - b.priority;
				default:
					return 0;
			}
		});
	}, [items, sortBy]);

	const handleAddItem = () => {
		setEditingItem(null);
		setExtractedData(null);
		setDialogOpen(true);
	};

	const handleEditItem = (item: Item) => {
		setEditingItem(item);
		setExtractedData(null);
		setDialogOpen(true);
	};

	const handleDeleteItem = (item: Item) => {
		setDeletingItem(item);
	};

	const confirmDeleteItem = () => {
		if (!deletingItem) return;
		toast.promise(deleteItem.mutateAsync(deletingItem.id), {
			loading: m.item_deletingItem(),
			success: m.item_deleteSuccess(),
			error: (err) => err.message || m.errors_failedToSave(),
		});
	};

	const handleExtractComplete = (data: ExtractedData) => {
		setExtractedData(data);
		setEditingItem(null);
		setDialogOpen(true);
	};

	const handleDialogClose = (open: boolean) => {
		setDialogOpen(open);
		if (!open) {
			setExtractedData(null);
		}
	};

	// Stable callback for keyboard shortcut
	const openQuickAdd = useCallback(() => {
		setQuickAddOpen(true);
	}, []);

	// Check if any dialog is open (to disable FAB and keyboard shortcut)
	const anyDialogOpen = dialogOpen || quickAddOpen || !!deletingItem;

	// Global keyboard shortcut: 'n' or 'a' to open quick add
	useQuickAddShortcut({
		onTrigger: openQuickAdd,
		disabled: anyDialogOpen,
	});

	if (isLoading && !initialItems.length) {
		return <LoadingSkeleton />;
	}

	if (items.length === 0) {
		return (
			<div className="container mx-auto max-w-screen-xl px-4 py-8">
				<EmptyState onAddItem={handleAddItem} onQuickAdd={openQuickAdd} />
				<ItemFormDialog
					open={dialogOpen}
					onOpenChange={handleDialogClose}
					item={editingItem}
					defaultValues={extractedData ?? undefined}
				/>
				<QuickAddForm
					open={quickAddOpen}
					onOpenChange={setQuickAddOpen}
					onExtractComplete={handleExtractComplete}
				/>
				<ConfirmDialog
					open={!!deletingItem}
					onOpenChange={(open) => !open && setDeletingItem(null)}
					title={m.wishlist_deleteConfirm({ name: deletingItem?.name ?? "" })}
					onConfirm={confirmDeleteItem}
					destructive
				/>
				<QuickAddFAB onClick={openQuickAdd} dialogOpen={anyDialogOpen} />
			</div>
		);
	}

	return (
		<div className="container mx-auto max-w-screen-xl px-4 py-8">
			<div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="text-2xl font-bold">{m.wishlist_title()}</h1>
				<div className="flex flex-wrap items-center gap-2">
					<Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
						<SelectTrigger className="w-full sm:w-[180px]">
							<SelectValue placeholder={m.wishlist_sortBy()} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="newest">{m.wishlist_sortNewest()}</SelectItem>
							<SelectItem value="oldest">{m.wishlist_sortOldest()}</SelectItem>
							<SelectItem value="price-high">{m.wishlist_sortPriceHigh()}</SelectItem>
							<SelectItem value="price-low">{m.wishlist_sortPriceLow()}</SelectItem>
							<SelectItem value="name-az">{m.wishlist_sortNameAZ()}</SelectItem>
							<SelectItem value="name-za">{m.wishlist_sortNameZA()}</SelectItem>
							<SelectItem value="priority-high">{m.wishlist_sortPriorityHigh()}</SelectItem>
							<SelectItem value="priority-low">{m.wishlist_sortPriorityLow()}</SelectItem>
						</SelectContent>
					</Select>
					<Button variant="outline" onClick={openQuickAdd}>
						<Plus className="size-4" />
						{m.item_quickAdd()}
					</Button>
					<Button onClick={handleAddItem}>
						<Plus className="size-4" />
						{m.wishlist_addItem()}
					</Button>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{sortedItems.map((item) => (
					<ItemCard
						key={item.id}
						item={item}
						groups={groups}
						onEdit={handleEditItem}
						onDelete={handleDeleteItem}
					/>
				))}
			</div>

			<ItemFormDialog
				open={dialogOpen}
				onOpenChange={handleDialogClose}
				item={editingItem}
				defaultValues={extractedData ?? undefined}
			/>
			<QuickAddForm
				open={quickAddOpen}
				onOpenChange={setQuickAddOpen}
				onExtractComplete={handleExtractComplete}
			/>
			<ConfirmDialog
				open={!!deletingItem}
				onOpenChange={(open) => !open && setDeletingItem(null)}
				title={m.wishlist_deleteConfirm({ name: deletingItem?.name ?? "" })}
				onConfirm={confirmDeleteItem}
				destructive
			/>
			<QuickAddFAB onClick={openQuickAdd} dialogOpen={anyDialogOpen} />
		</div>
	);
}

export function WishlistPage({ initialItems, locale }: WishlistPageProps) {
	return (
		<LocaleProvider initialLocale={locale}>
			<QueryClientProvider client={queryClient}>
				<WishlistContent initialItems={initialItems} />
			</QueryClientProvider>
		</LocaleProvider>
	);
}
