import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	ArrowUpDown,
	DollarSign,
	Filter,
	Gift,
	ShoppingCart,
	Star,
	User,
	X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { FilterSelect } from "@/components/FilterSelect";
import { GroupFilterBadges } from "@/components/GroupFilterBadges";
import { ItemFormDialog } from "@/components/ItemFormDialog";
import { MobileFiltersSheet } from "@/components/MobileFiltersSheet";
import { MyClaimsSection } from "@/components/MyClaimsSection";
import { QuickAddFAB } from "@/components/QuickAddFAB";
import { QuickAddForm, type ExtractedData } from "@/components/QuickAddForm";
import { SharedItemCard } from "@/components/SharedItemCard";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { SharedItem } from "@/hooks/useSharedItems";
import { useSharedItems } from "@/hooks/useSharedItems";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useQuickAddShortcut } from "@/hooks/useQuickAddShortcut";
import { useSortedSharedItems } from "@/hooks/useSortedItems";
import { LocaleProvider, type Locale } from "@/i18n/LocaleContext";
import {
	type PriceRangeFilter,
	type PriorityFilter,
	isPriceRangeFilter,
	isPriorityFilter,
	matchesPriceRange,
	matchesPriority,
} from "@/lib/filters";
import { type SharedSortOption, isSharedSortOption } from "@/lib/sorting";
import * as m from "@/paraglide/messages";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 0, // Always refetch on invalidation
			refetchOnWindowFocus: true,
		},
	},
});

interface SharedPageProps {
	initialItems: SharedItem[];
	currentUserId: string;
	locale: Locale;
}

const ALL_OWNERS = "all";

function isSelectedGroups(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((v) => typeof v === "string");
}

// Claim status filter (shared-page-specific)
type ClaimStatusFilter = "all" | "available" | "claimedByMe" | "claimedByOthers";
const CLAIM_STATUS_FILTERS: ClaimStatusFilter[] = [
	"all",
	"available",
	"claimedByMe",
	"claimedByOthers",
];

function isClaimStatusFilter(value: unknown): value is ClaimStatusFilter {
	return typeof value === "string" && CLAIM_STATUS_FILTERS.includes(value as ClaimStatusFilter);
}

interface SharedFilters {
	owner: string;
	priority: PriorityFilter;
	priceRange: PriceRangeFilter;
	claimStatus: ClaimStatusFilter;
}

const DEFAULT_FILTERS: SharedFilters = {
	owner: ALL_OWNERS,
	priority: "all",
	priceRange: "all",
	claimStatus: "all",
};

function isSharedFilters(value: unknown): value is SharedFilters {
	if (typeof value !== "object" || value === null) return false;
	const obj = value as Record<string, unknown>;
	return (
		typeof obj.owner === "string" &&
		isPriorityFilter(obj.priority) &&
		isPriceRangeFilter(obj.priceRange) &&
		isClaimStatusFilter(obj.claimStatus)
	);
}

function EmptyState() {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center">
			<div className="mb-4 rounded-full bg-muted p-4">
				<Gift className="size-8 text-muted-foreground" />
			</div>
			<h2 className="mb-2 text-xl font-semibold">{m.shared_emptyTitle()}</h2>
			<p className="max-w-sm text-muted-foreground">
				{m.shared_emptyDescription()}
			</p>
		</div>
	);
}

function GroupEmptyState({ groupName }: { groupName: string }) {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center">
			<div className="mb-4 rounded-full bg-muted p-4">
				<Gift className="size-8 text-muted-foreground" />
			</div>
			<h2 className="mb-2 text-xl font-semibold">{m.shared_noItemsInGroup()}</h2>
			<p className="max-w-sm text-muted-foreground">
				{m.shared_noItemsInGroupDescription({ groupName })}
			</p>
		</div>
	);
}

function FilteredEmptyState({ onClearFilters }: { onClearFilters: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center">
			<div className="mb-4 rounded-full bg-muted p-4">
				<Filter className="size-8 text-muted-foreground" />
			</div>
			<h2 className="mb-2 text-xl font-semibold">{m.shared_noFilteredItems()}</h2>
			<p className="mb-6 max-w-sm text-muted-foreground">
				{m.shared_noFilteredItemsDescription()}
			</p>
			<Button variant="outline" onClick={onClearFilters}>
				<X className="size-4" />
				{m.shared_clearFilters()}
			</Button>
		</div>
	);
}

function SharedContent({ initialItems, currentUserId }: Omit<SharedPageProps, "locale">) {
	const { data: items = [] } = useSharedItems(initialItems);
	const [selectedGroups, setSelectedGroups] = useLocalStorage<string[]>(
		"shared-groups",
		[],
		isSelectedGroups,
	);
	const [sortBy, setSortBy] = useLocalStorage<SharedSortOption>(
		"shared-sort",
		"newest",
		isSharedSortOption,
	);
	const [filters, setFilters, isFiltersHydrated] = useLocalStorage<SharedFilters>(
		"shared-filters",
		DEFAULT_FILTERS,
		isSharedFilters,
	);

	// Quick add state
	const [dialogOpen, setDialogOpen] = useState(false);
	const [quickAddOpen, setQuickAddOpen] = useState(false);
	const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);

	const handleExtractComplete = useCallback((data: ExtractedData) => {
		setExtractedData(data);
		setDialogOpen(true);
	}, []);

	const handleDialogClose = useCallback((open: boolean) => {
		setDialogOpen(open);
		if (!open) {
			setExtractedData(null);
		}
	}, []);

	const openQuickAdd = useCallback(() => {
		setQuickAddOpen(true);
	}, []);

	const anyDialogOpen = dialogOpen || quickAddOpen;

	useQuickAddShortcut({
		onTrigger: openQuickAdd,
		disabled: anyDialogOpen,
	});

	// Extract unique groups from all items
	const groups = useMemo(() => {
		const groupMap = new Map<string, string>();
		for (const item of items) {
			for (const group of item.sharedVia) {
				groupMap.set(group.groupId, group.groupName);
			}
		}
		return Array.from(groupMap.entries()).map(([id, name]) => ({
			id,
			name,
		}));
	}, [items]);

	// Extract unique owners from all items
	const owners = useMemo(() => {
		const ownerMap = new Map<string, string>();
		for (const item of items) {
			ownerMap.set(item.owner.id, item.owner.name ?? item.owner.email);
		}
		return Array.from(ownerMap.entries()).map(([id, name]) => ({
			id,
			name,
		}));
	}, [items]);

	// Count active filters (excluding group which has its own UI)
	const activeFilterCount = useMemo(() => {
		let count = 0;
		if (filters.owner !== ALL_OWNERS) count++;
		if (filters.priority !== "all") count++;
		if (filters.priceRange !== "all") count++;
		if (filters.claimStatus !== "all") count++;
		return count;
	}, [filters]);

	const hasActiveFilters = activeFilterCount > 0;

	// Clear all filters
	const clearFilters = useCallback(() => {
		setFilters(DEFAULT_FILTERS);
	}, [setFilters]);

	// Toggle group selection (multi-select)
	const toggleGroup = useCallback(
		(groupId: string) => {
			setSelectedGroups((prev) =>
				prev.includes(groupId)
					? prev.filter((id) => id !== groupId)
					: [...prev, groupId],
			);
		},
		[setSelectedGroups],
	);

	// Clear all group selections (show all)
	const clearGroups = useCallback(() => {
		setSelectedGroups([]);
	}, [setSelectedGroups]);

	// Filter items by selected groups and all filters
	const filteredItems = useMemo(() => {
		return items.filter((sharedItem) => {
			// Group filter (multi-select with OR logic)
			if (selectedGroups.length > 0) {
				if (!sharedItem.sharedVia.some((group) => selectedGroups.includes(group.groupId))) {
					return false;
				}
			}

			// Owner filter
			if (filters.owner !== ALL_OWNERS) {
				if (sharedItem.owner.id !== filters.owner) return false;
			}

			// Priority filter
			if (!matchesPriority(sharedItem.item.priority, filters.priority)) return false;

			// Price range filter
			if (!matchesPriceRange(sharedItem.item.price, filters.priceRange)) return false;

			// Claim status filter (shared-page-specific)
			if (filters.claimStatus !== "all") {
				const hasClaims = sharedItem.claims.length > 0;
				const isClaimedByMe = sharedItem.claims.some(
					(claim) => claim.userId === currentUserId,
				);
				const isFullyClaimed =
					sharedItem.claimableAmount === 0 ||
					sharedItem.claims.some((c) => c.amount === null);

				switch (filters.claimStatus) {
					case "available":
						if (isFullyClaimed) return false;
						break;
					case "claimedByMe":
						if (!isClaimedByMe) return false;
						break;
					case "claimedByOthers":
						if (!hasClaims || isClaimedByMe) return false;
						break;
				}
			}

			return true;
		});
	}, [items, selectedGroups, filters, currentUserId]);

	// Sort filtered items using shared hook
	const sortedItems = useSortedSharedItems(filteredItems, sortBy);

	// No items at all
	if (items.length === 0) {
		return (
			<div className="container mx-auto max-w-screen-xl px-4 py-8">
				<EmptyState />
				<ItemFormDialog
					open={dialogOpen}
					onOpenChange={handleDialogClose}
					item={null}
					defaultValues={extractedData ?? undefined}
				/>
				<QuickAddForm
					open={quickAddOpen}
					onOpenChange={setQuickAddOpen}
					onExtractComplete={handleExtractComplete}
				/>
				<QuickAddFAB onClick={openQuickAdd} dialogOpen={anyDialogOpen} />
			</div>
		);
	}

	// Get names of selected groups for empty state message
	const selectedGroupNames = selectedGroups
		.map((id) => groups.find((g) => g.id === id)?.name)
		.filter(Boolean)
		.join(", ");

	return (
		<div className="container mx-auto max-w-screen-xl px-4 py-8">
			{/* My Claims section - shows items user has claimed */}
			<MyClaimsSection />

			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold">{m.shared_title()}</h1>
				{/* Desktop: Sort dropdown - hidden on mobile (moved to sheet) */}
				<Select
					value={sortBy}
					onValueChange={(value) => setSortBy(value as SharedSortOption)}
				>
					<SelectTrigger className="hidden w-[180px] sm:flex">
						<ArrowUpDown className="mr-2 size-4 opacity-50" />
						<SelectValue placeholder={m.shared_sortBy()} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="newest">{m.shared_sortNewest()}</SelectItem>
						<SelectItem value="oldest">{m.shared_sortOldest()}</SelectItem>
						<SelectItem value="price-high">{m.shared_sortPriceHigh()}</SelectItem>
						<SelectItem value="price-low">{m.shared_sortPriceLow()}</SelectItem>
						<SelectItem value="name-az">{m.shared_sortNameAZ()}</SelectItem>
						<SelectItem value="name-za">{m.shared_sortNameZA()}</SelectItem>
						<SelectItem value="priority-high">{m.shared_sortPriorityHigh()}</SelectItem>
						<SelectItem value="priority-low">{m.shared_sortPriorityLow()}</SelectItem>
						<SelectItem value="owner-az">{m.shared_sortOwnerAZ()}</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Group filter badges with mobile filter button - scrollable row */}
			<GroupFilterBadges
				groups={groups}
				selectedGroups={selectedGroups}
				onToggleGroup={toggleGroup}
				onClearGroups={clearGroups}
				leadingElement={
					<MobileFiltersSheet
						activeFilterCount={activeFilterCount}
						hasActiveFilters={hasActiveFilters}
						isHydrated={isFiltersHydrated}
						onClearFilters={clearFilters}
						sortControl={
							<Select
								value={sortBy}
								onValueChange={(value) => setSortBy(value as SharedSortOption)}
							>
								<SelectTrigger className="w-full">
									<ArrowUpDown className="mr-2 size-4 opacity-50" />
									<SelectValue placeholder={m.shared_sortBy()} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="newest">{m.shared_sortNewest()}</SelectItem>
									<SelectItem value="oldest">{m.shared_sortOldest()}</SelectItem>
									<SelectItem value="price-high">{m.shared_sortPriceHigh()}</SelectItem>
									<SelectItem value="price-low">{m.shared_sortPriceLow()}</SelectItem>
									<SelectItem value="name-az">{m.shared_sortNameAZ()}</SelectItem>
									<SelectItem value="name-za">{m.shared_sortNameZA()}</SelectItem>
									<SelectItem value="priority-high">{m.shared_sortPriorityHigh()}</SelectItem>
									<SelectItem value="priority-low">{m.shared_sortPriorityLow()}</SelectItem>
									<SelectItem value="owner-az">{m.shared_sortOwnerAZ()}</SelectItem>
								</SelectContent>
							</Select>
						}
					>
					{owners.length > 1 && (
						<FilterSelect
							value={filters.owner}
							onValueChange={(value) =>
								setFilters((f) => ({ ...f, owner: value }))
							}
							icon={<User className={`mr-2 size-4 ${isFiltersHydrated && filters.owner !== ALL_OWNERS ? "text-primary" : "opacity-50"}`} />}
							placeholder={m.shared_filterOwner()}
							isActive={filters.owner !== ALL_OWNERS}
							onClear={() => setFilters((f) => ({ ...f, owner: ALL_OWNERS }))}
							clearLabel={m.shared_clearOwnerFilter()}
							className="w-full"
						>
							<SelectItem value={ALL_OWNERS}>{m.shared_filterOwnerAll()}</SelectItem>
							{owners.map((owner) => (
								<SelectItem key={owner.id} value={owner.id}>
									{owner.name}
								</SelectItem>
							))}
						</FilterSelect>
					)}

					<FilterSelect
						value={filters.priority}
						onValueChange={(value) =>
							setFilters((f) => ({ ...f, priority: value as PriorityFilter }))
						}
						icon={<Star className={`mr-2 size-4 ${isFiltersHydrated && filters.priority !== "all" ? "text-primary" : "opacity-50"}`} />}
						placeholder={m.shared_filterPriority()}
						isActive={filters.priority !== "all"}
						onClear={() => setFilters((f) => ({ ...f, priority: "all" }))}
						clearLabel={m.shared_clearPriorityFilter()}
						className="w-full"
					>
						<SelectItem value="all">{m.shared_filterPriorityAll()}</SelectItem>
						<SelectItem value="5">{m.shared_filterPriorityStars({ count: "5" })}</SelectItem>
						<SelectItem value="4">{m.shared_filterPriorityStars({ count: "4" })}</SelectItem>
						<SelectItem value="3">{m.shared_filterPriorityStars({ count: "3" })}</SelectItem>
						<SelectItem value="2">{m.shared_filterPriorityStars({ count: "2" })}</SelectItem>
						<SelectItem value="1">{m.shared_filterPriorityStars({ count: "1" })}</SelectItem>
					</FilterSelect>

					<FilterSelect
						value={filters.priceRange}
						onValueChange={(value) =>
							setFilters((f) => ({ ...f, priceRange: value as PriceRangeFilter }))
						}
						icon={<DollarSign className={`mr-2 size-4 ${isFiltersHydrated && filters.priceRange !== "all" ? "text-primary" : "opacity-50"}`} />}
						placeholder={m.shared_filterPrice()}
						isActive={filters.priceRange !== "all"}
						onClear={() => setFilters((f) => ({ ...f, priceRange: "all" }))}
						clearLabel={m.shared_clearPriceFilter()}
						className="w-full"
					>
						<SelectItem value="all">{m.shared_filterPriceAll()}</SelectItem>
						<SelectItem value="under25">{m.shared_filterPriceUnder25()}</SelectItem>
						<SelectItem value="25to50">{m.shared_filterPrice25to50()}</SelectItem>
						<SelectItem value="50to100">{m.shared_filterPrice50to100()}</SelectItem>
						<SelectItem value="100to250">{m.shared_filterPrice100to250()}</SelectItem>
						<SelectItem value="over250">{m.shared_filterPriceOver250()}</SelectItem>
						<SelectItem value="noPrice">{m.shared_filterPriceNoPrice()}</SelectItem>
					</FilterSelect>

					<FilterSelect
						value={filters.claimStatus}
						onValueChange={(value) =>
							setFilters((f) => ({ ...f, claimStatus: value as ClaimStatusFilter }))
						}
						icon={<ShoppingCart className={`mr-2 size-4 ${isFiltersHydrated && filters.claimStatus !== "all" ? "text-primary" : "opacity-50"}`} />}
						placeholder={m.shared_filterClaimStatus()}
						isActive={filters.claimStatus !== "all"}
						onClear={() => setFilters((f) => ({ ...f, claimStatus: "all" }))}
						clearLabel={m.shared_clearClaimStatusFilter()}
						className="w-full"
					>
						<SelectItem value="all">{m.shared_filterClaimStatusAll()}</SelectItem>
						<SelectItem value="available">{m.shared_filterClaimStatusAvailable()}</SelectItem>
						<SelectItem value="claimedByMe">{m.shared_filterClaimStatusByMe()}</SelectItem>
						<SelectItem value="claimedByOthers">{m.shared_filterClaimStatusByOthers()}</SelectItem>
					</FilterSelect>
				</MobileFiltersSheet>
				}
			/>

			{/* Desktop: Inline filter controls (hidden on mobile) */}
			<div className="mb-6 hidden flex-wrap items-center gap-2 sm:flex">
				<div className="flex items-center gap-1.5 pr-2">
					<Filter
						className={`size-4 ${isFiltersHydrated && hasActiveFilters ? "text-primary" : "text-muted-foreground"}`}
						aria-hidden="true"
					/>
					{isFiltersHydrated && hasActiveFilters && (
						<span
							className="size-2 rounded-full bg-primary motion-safe:animate-badge-pulse"
							role="status"
							aria-label={m.shared_activeFilters({ count: activeFilterCount })}
						/>
					)}
				</div>
				{owners.length > 1 && (
					<FilterSelect
						value={filters.owner}
						onValueChange={(value) =>
							setFilters((f) => ({ ...f, owner: value }))
						}
						icon={<User className={`mr-2 size-4 ${isFiltersHydrated && filters.owner !== ALL_OWNERS ? "text-primary" : "opacity-50"}`} />}
						placeholder={m.shared_filterOwner()}
						isActive={filters.owner !== ALL_OWNERS}
						onClear={() => setFilters((f) => ({ ...f, owner: ALL_OWNERS }))}
						clearLabel={m.shared_clearOwnerFilter()}
						className=""
					>
						<SelectItem value={ALL_OWNERS}>{m.shared_filterOwnerAll()}</SelectItem>
						{owners.map((owner) => (
							<SelectItem key={owner.id} value={owner.id}>
								{owner.name}
							</SelectItem>
						))}
					</FilterSelect>
				)}

				<FilterSelect
					value={filters.priority}
					onValueChange={(value) =>
						setFilters((f) => ({ ...f, priority: value as PriorityFilter }))
					}
					icon={<Star className={`mr-2 size-4 ${isFiltersHydrated && filters.priority !== "all" ? "text-primary" : "opacity-50"}`} />}
					placeholder={m.shared_filterPriority()}
					isActive={filters.priority !== "all"}
					onClear={() => setFilters((f) => ({ ...f, priority: "all" }))}
					clearLabel={m.shared_clearPriorityFilter()}
					className=""
				>
					<SelectItem value="all">{m.shared_filterPriorityAll()}</SelectItem>
					<SelectItem value="5">{m.shared_filterPriorityStars({ count: "5" })}</SelectItem>
					<SelectItem value="4">{m.shared_filterPriorityStars({ count: "4" })}</SelectItem>
					<SelectItem value="3">{m.shared_filterPriorityStars({ count: "3" })}</SelectItem>
					<SelectItem value="2">{m.shared_filterPriorityStars({ count: "2" })}</SelectItem>
					<SelectItem value="1">{m.shared_filterPriorityStars({ count: "1" })}</SelectItem>
				</FilterSelect>

				<FilterSelect
					value={filters.priceRange}
					onValueChange={(value) =>
						setFilters((f) => ({ ...f, priceRange: value as PriceRangeFilter }))
					}
					icon={<DollarSign className={`mr-2 size-4 ${isFiltersHydrated && filters.priceRange !== "all" ? "text-primary" : "opacity-50"}`} />}
					placeholder={m.shared_filterPrice()}
					isActive={filters.priceRange !== "all"}
					onClear={() => setFilters((f) => ({ ...f, priceRange: "all" }))}
					clearLabel={m.shared_clearPriceFilter()}
					className=""
				>
					<SelectItem value="all">{m.shared_filterPriceAll()}</SelectItem>
					<SelectItem value="under25">{m.shared_filterPriceUnder25()}</SelectItem>
					<SelectItem value="25to50">{m.shared_filterPrice25to50()}</SelectItem>
					<SelectItem value="50to100">{m.shared_filterPrice50to100()}</SelectItem>
					<SelectItem value="100to250">{m.shared_filterPrice100to250()}</SelectItem>
					<SelectItem value="over250">{m.shared_filterPriceOver250()}</SelectItem>
					<SelectItem value="noPrice">{m.shared_filterPriceNoPrice()}</SelectItem>
				</FilterSelect>

				<FilterSelect
					value={filters.claimStatus}
					onValueChange={(value) =>
						setFilters((f) => ({ ...f, claimStatus: value as ClaimStatusFilter }))
					}
					icon={<ShoppingCart className={`mr-2 size-4 ${isFiltersHydrated && filters.claimStatus !== "all" ? "text-primary" : "opacity-50"}`} />}
					placeholder={m.shared_filterClaimStatus()}
					isActive={filters.claimStatus !== "all"}
					onClear={() => setFilters((f) => ({ ...f, claimStatus: "all" }))}
					clearLabel={m.shared_clearClaimStatusFilter()}
					className=""
				>
					<SelectItem value="all">{m.shared_filterClaimStatusAll()}</SelectItem>
					<SelectItem value="available">{m.shared_filterClaimStatusAvailable()}</SelectItem>
					<SelectItem value="claimedByMe">{m.shared_filterClaimStatusByMe()}</SelectItem>
					<SelectItem value="claimedByOthers">{m.shared_filterClaimStatusByOthers()}</SelectItem>
				</FilterSelect>

				{isFiltersHydrated && hasActiveFilters && (
					<Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
						<X className="size-3" />
						{m.shared_clearFilters()}
					</Button>
				)}
			</div>

			{sortedItems.length === 0 && hasActiveFilters ? (
				<FilteredEmptyState onClearFilters={clearFilters} />
			) : sortedItems.length === 0 && selectedGroups.length > 0 ? (
				<GroupEmptyState groupName={selectedGroupNames} />
			) : sortedItems.length === 0 ? (
				<EmptyState />
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{sortedItems.map((sharedItem) => (
						<SharedItemCard
							key={sharedItem.item.id}
							sharedItem={sharedItem}
							currentUserId={currentUserId}
						/>
					))}
				</div>
			)}

			<ItemFormDialog
				open={dialogOpen}
				onOpenChange={handleDialogClose}
				item={null}
				defaultValues={extractedData ?? undefined}
			/>
			<QuickAddForm
				open={quickAddOpen}
				onOpenChange={setQuickAddOpen}
				onExtractComplete={handleExtractComplete}
			/>
			<QuickAddFAB onClick={openQuickAdd} dialogOpen={anyDialogOpen} />
		</div>
	);
}

export function SharedPage({ initialItems, currentUserId, locale }: SharedPageProps) {
	return (
		<LocaleProvider initialLocale={locale}>
			<QueryClientProvider client={queryClient}>
				<SharedContent initialItems={initialItems} currentUserId={currentUserId} />
			</QueryClientProvider>
		</LocaleProvider>
	);
}
