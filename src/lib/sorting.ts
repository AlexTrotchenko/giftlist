/**
 * Shared sorting utilities for wishlist and shared pages.
 * Contains comparator functions and sort option types.
 */

// Base sort options shared between wishlist and shared pages
export type BaseSortOption =
	| "newest"
	| "oldest"
	| "price-high"
	| "price-low"
	| "name-az"
	| "name-za"
	| "priority-high"
	| "priority-low";

// Wishlist-specific sort options (same as base)
export type WishlistSortOption = BaseSortOption;

// Shared page adds owner sorting
export type SharedSortOption = BaseSortOption | "owner-az";

// Validation arrays for type guards
export const BASE_SORT_OPTIONS: BaseSortOption[] = [
	"newest",
	"oldest",
	"price-high",
	"price-low",
	"name-az",
	"name-za",
	"priority-high",
	"priority-low",
];

export const WISHLIST_SORT_OPTIONS: WishlistSortOption[] = [...BASE_SORT_OPTIONS];

export const SHARED_SORT_OPTIONS: SharedSortOption[] = [...BASE_SORT_OPTIONS, "owner-az"];

/**
 * Type guard for WishlistSortOption.
 */
export function isWishlistSortOption(value: unknown): value is WishlistSortOption {
	return typeof value === "string" && WISHLIST_SORT_OPTIONS.includes(value as WishlistSortOption);
}

/**
 * Type guard for SharedSortOption.
 */
export function isSharedSortOption(value: unknown): value is SharedSortOption {
	return typeof value === "string" && SHARED_SORT_OPTIONS.includes(value as SharedSortOption);
}

/**
 * Generic comparator type for sorting functions.
 */
export type Comparator<T> = (a: T, b: T) => number;

/**
 * Create a comparator for date fields with null handling.
 * @param getter - Function to extract date from item
 * @param direction - "asc" for oldest first, "desc" for newest first
 */
export function createDateComparator<T>(
	getter: (item: T) => Date | string | null | undefined,
	direction: "asc" | "desc",
): Comparator<T> {
	return (a, b) => {
		const aDate = getter(a);
		const bDate = getter(b);
		const aTime = aDate ? new Date(aDate).getTime() : 0;
		const bTime = bDate ? new Date(bDate).getTime() : 0;
		return direction === "desc" ? bTime - aTime : aTime - bTime;
	};
}

/**
 * Create a comparator for numeric fields with null handling.
 * Items without a value go to the end.
 * @param getter - Function to extract number from item
 * @param direction - "asc" for low-to-high, "desc" for high-to-low
 */
export function createNumericComparator<T>(
	getter: (item: T) => number | null | undefined,
	direction: "asc" | "desc",
): Comparator<T> {
	return (a, b) => {
		const aVal = getter(a);
		const bVal = getter(b);

		// Items without value go to the end
		if (aVal == null && bVal == null) return 0;
		if (aVal == null) return 1;
		if (bVal == null) return -1;

		return direction === "desc" ? bVal - aVal : aVal - bVal;
	};
}

/**
 * Create a comparator for string fields using locale comparison.
 * @param getter - Function to extract string from item
 * @param direction - "asc" for A-Z, "desc" for Z-A
 */
export function createStringComparator<T>(
	getter: (item: T) => string,
	direction: "asc" | "desc",
): Comparator<T> {
	return (a, b) => {
		const aVal = getter(a);
		const bVal = getter(b);
		return direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
	};
}
