/**
 * Shared filtering utilities for wishlist and shared pages.
 * Contains price range definitions and filter predicates.
 */

// Price range filter options
export type PriceRangeFilter =
	| "all"
	| "under25"
	| "25to50"
	| "50to100"
	| "100to250"
	| "over250"
	| "noPrice";

// Priority filter options (1-5 stars or all)
export type PriorityFilter = "all" | "1" | "2" | "3" | "4" | "5";

// Validation arrays for type guards
export const PRIORITY_FILTERS: PriorityFilter[] = ["all", "1", "2", "3", "4", "5"];
export const PRICE_RANGE_FILTERS: PriceRangeFilter[] = [
	"all",
	"under25",
	"25to50",
	"50to100",
	"100to250",
	"over250",
	"noPrice",
];

/**
 * Price range boundaries in cents.
 * Used for filtering items by price range.
 */
export const PRICE_RANGES: Record<
	Exclude<PriceRangeFilter, "all" | "noPrice">,
	{ min: number; max: number }
> = {
	under25: { min: 0, max: 2499 },
	"25to50": { min: 2500, max: 5000 },
	"50to100": { min: 5001, max: 10000 },
	"100to250": { min: 10001, max: 25000 },
	over250: { min: 25001, max: Number.POSITIVE_INFINITY },
};

/**
 * Check if a price matches the selected price range filter.
 * @param price - Price in cents (null if no price)
 * @param filter - Selected price range filter
 * @returns true if the price matches the filter
 */
export function matchesPriceRange(
	price: number | null | undefined,
	filter: PriceRangeFilter,
): boolean {
	if (filter === "all") return true;
	if (filter === "noPrice") return price == null;
	if (price == null) return false;

	const range = PRICE_RANGES[filter];
	return price >= range.min && price <= range.max;
}

/**
 * Check if a priority matches the selected priority filter.
 * @param priority - Priority value (1-5, or null)
 * @param filter - Selected priority filter
 * @returns true if the priority matches the filter
 */
export function matchesPriority(
	priority: number | null | undefined,
	filter: PriorityFilter,
): boolean {
	if (filter === "all") return true;
	const targetPriority = Number.parseInt(filter, 10);
	return priority === targetPriority;
}

/**
 * Type guard for PriorityFilter.
 */
export function isPriorityFilter(value: unknown): value is PriorityFilter {
	return typeof value === "string" && PRIORITY_FILTERS.includes(value as PriorityFilter);
}

/**
 * Type guard for PriceRangeFilter.
 */
export function isPriceRangeFilter(value: unknown): value is PriceRangeFilter {
	return typeof value === "string" && PRICE_RANGE_FILTERS.includes(value as PriceRangeFilter);
}
