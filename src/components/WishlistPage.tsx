import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Filter, Gift, Plus, X } from "lucide-react";
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

// Filter types
type PriorityFilter = "all" | "1" | "2" | "3" | "4" | "5";
type PriceRangeFilter =
	| "all"
	| "under25"
	| "25to50"
	| "50to100"
	| "100to250"
	| "over250"
	| "noPrice";
type LinkFilter = "all" | "with" | "without";

interface WishlistFilters {
	priority: PriorityFilter;
	priceRange: PriceRangeFilter;
	link: LinkFilter;
}

const DEFAULT_FILTERS: WishlistFilters = {
	priority: "all",
	priceRange: "all",
	link: "all",
};

// Price range boundaries in cents
const PRICE_RANGES: Record<
	Exclude<PriceRangeFilter, "all" | "noPrice">,
	{ min: number; max: number }
> = {
	under25: { min: 0, max: 2499 },
	"25to50": { min: 2500, max: 5000 },
	"50to100": { min: 5001, max: 10000 },
	"100to250": { min: 10001, max: 25000 },
	over250: { min: 25001, max: Number.POSITIVE_INFINITY },
};

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

function FilteredEmptyState({ onClearFilters }: { onClearFilters: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center">
			<div className="mb-4 rounded-full bg-muted p-4">
				<Filter className="size-8 text-muted-foreground" />
			</div>
			<h2 className="mb-2 text-xl font-semibold">{m.wishlist_noFilteredItems()}</h2>
			<p className="mb-6 max-w-sm text-muted-foreground">
				{m.wishlist_noFilteredItemsDescription()}
			</p>
			<Button variant="outline" onClick={onClearFilters}>
				<X className="size-4" />
				{m.wishlist_clearFilters()}
			</Button>
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
	const [filters, setFilters] = useState<WishlistFilters>(DEFAULT_FILTERS);

	// Count active filters
	const activeFilterCount = useMemo(() => {
		let count = 0;
		if (filters.priority !== "all") count++;
		if (filters.priceRange !== "all") count++;
		if (filters.link !== "all") count++;
		return count;
	}, [filters]);

	// Check if any filters are active
	const hasActiveFilters = activeFilterCount > 0;

	// Clear all filters
	const clearFilters = useCallback(() => {
		setFilters(DEFAULT_FILTERS);
	}, []);

	// Filter items based on current filters
	const filteredItems = useMemo(() => {
		return items.filter((item) => {
			// Priority filter
			if (filters.priority !== "all") {
				const targetPriority = Number.parseInt(filters.priority, 10);
				if (item.priority !== targetPriority) return false;
			}

			// Price range filter
			if (filters.priceRange !== "all") {
				if (filters.priceRange === "noPrice") {
					if (item.price != null) return false;
				} else {
					if (item.price == null) return false;
					const range = PRICE_RANGES[filters.priceRange];
					if (item.price < range.min || item.price > range.max) return false;
				}
			}

			// Link filter
			if (filters.link !== "all") {
				const hasLink = item.url != null && item.url.trim() !== "";
				if (filters.link === "with" && !hasLink) return false;
				if (filters.link === "without" && hasLink) return false;
			}

			return true;
		});
	}, [items, filters]);

	// Sort filtered items based on selected sort option
	const sortedItems = useMemo(() => {
		const sorted = [...filteredItems];
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
	}, [filteredItems, sortBy]);

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

			{/* Filter controls */}
			<div className="mb-6 flex flex-wrap items-center gap-2">
				<Select
					value={filters.priority}
					onValueChange={(value) =>
						setFilters((f) => ({ ...f, priority: value as PriorityFilter }))
					}
				>
					<SelectTrigger className="w-full sm:w-[150px]">
						<SelectValue placeholder={m.wishlist_filterPriority()} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{m.wishlist_filterPriorityAll()}</SelectItem>
						<SelectItem value="5">{m.wishlist_filterPriorityStars({ count: "5" })}</SelectItem>
						<SelectItem value="4">{m.wishlist_filterPriorityStars({ count: "4" })}</SelectItem>
						<SelectItem value="3">{m.wishlist_filterPriorityStars({ count: "3" })}</SelectItem>
						<SelectItem value="2">{m.wishlist_filterPriorityStars({ count: "2" })}</SelectItem>
						<SelectItem value="1">{m.wishlist_filterPriorityStars({ count: "1" })}</SelectItem>
					</SelectContent>
				</Select>

				<Select
					value={filters.priceRange}
					onValueChange={(value) =>
						setFilters((f) => ({ ...f, priceRange: value as PriceRangeFilter }))
					}
				>
					<SelectTrigger className="w-full sm:w-[150px]">
						<SelectValue placeholder={m.wishlist_filterPrice()} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{m.wishlist_filterPriceAll()}</SelectItem>
						<SelectItem value="under25">{m.wishlist_filterPriceUnder25()}</SelectItem>
						<SelectItem value="25to50">{m.wishlist_filterPrice25to50()}</SelectItem>
						<SelectItem value="50to100">{m.wishlist_filterPrice50to100()}</SelectItem>
						<SelectItem value="100to250">{m.wishlist_filterPrice100to250()}</SelectItem>
						<SelectItem value="over250">{m.wishlist_filterPriceOver250()}</SelectItem>
						<SelectItem value="noPrice">{m.wishlist_filterPriceNoPrice()}</SelectItem>
					</SelectContent>
				</Select>

				<Select
					value={filters.link}
					onValueChange={(value) =>
						setFilters((f) => ({ ...f, link: value as LinkFilter }))
					}
				>
					<SelectTrigger className="w-full sm:w-[150px]">
						<SelectValue placeholder={m.wishlist_filterLink()} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{m.wishlist_filterLinkAll()}</SelectItem>
						<SelectItem value="with">{m.wishlist_filterLinkWith()}</SelectItem>
						<SelectItem value="without">{m.wishlist_filterLinkWithout()}</SelectItem>
					</SelectContent>
				</Select>

				{hasActiveFilters && (
					<Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
						<X className="size-3" />
						{m.wishlist_clearFilters()}
					</Button>
				)}
			</div>

			{sortedItems.length === 0 && hasActiveFilters ? (
				<FilteredEmptyState onClearFilters={clearFilters} />
			) : (
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
			)}

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
