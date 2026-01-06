import { useMemo } from "react";
import type { Item } from "@/lib/api";
import type { SharedItem } from "@/hooks/useSharedItems";
import {
	type SharedSortOption,
	type WishlistSortOption,
	createDateComparator,
	createNumericComparator,
	createStringComparator,
} from "@/lib/sorting";

/**
 * Comparator map for wishlist items (direct Item objects).
 */
const wishlistComparators: Record<WishlistSortOption, (a: Item, b: Item) => number> = {
	newest: createDateComparator<Item>((item) => item.createdAt, "desc"),
	oldest: createDateComparator<Item>((item) => item.createdAt, "asc"),
	"price-high": createNumericComparator<Item>((item) => item.price, "desc"),
	"price-low": createNumericComparator<Item>((item) => item.price, "asc"),
	"name-az": createStringComparator<Item>((item) => item.name, "asc"),
	"name-za": createStringComparator<Item>((item) => item.name, "desc"),
	"priority-high": createNumericComparator<Item>((item) => item.priority, "desc"),
	"priority-low": createNumericComparator<Item>((item) => item.priority, "asc"),
};

/**
 * Comparator map for shared items (nested item.item structure).
 */
const sharedComparators: Record<SharedSortOption, (a: SharedItem, b: SharedItem) => number> = {
	newest: createDateComparator<SharedItem>((item) => item.item.createdAt, "desc"),
	oldest: createDateComparator<SharedItem>((item) => item.item.createdAt, "asc"),
	"price-high": createNumericComparator<SharedItem>((item) => item.item.price, "desc"),
	"price-low": createNumericComparator<SharedItem>((item) => item.item.price, "asc"),
	"name-az": createStringComparator<SharedItem>((item) => item.item.name, "asc"),
	"name-za": createStringComparator<SharedItem>((item) => item.item.name, "desc"),
	"priority-high": createNumericComparator<SharedItem>((item) => item.item.priority, "desc"),
	"priority-low": createNumericComparator<SharedItem>((item) => item.item.priority, "asc"),
	"owner-az": createStringComparator<SharedItem>(
		(item) => item.owner.name ?? item.owner.email,
		"asc",
	),
};

/**
 * Hook to sort wishlist items based on selected sort option.
 * Returns a memoized sorted array.
 *
 * @param items - Array of items to sort
 * @param sortBy - Selected sort option
 * @returns Sorted array (new reference only when items or sortBy changes)
 */
export function useSortedWishlistItems(items: Item[], sortBy: WishlistSortOption): Item[] {
	return useMemo(() => {
		const comparator = wishlistComparators[sortBy];
		return [...items].sort(comparator);
	}, [items, sortBy]);
}

/**
 * Hook to sort shared items based on selected sort option.
 * Returns a memoized sorted array.
 *
 * @param items - Array of shared items to sort
 * @param sortBy - Selected sort option
 * @returns Sorted array (new reference only when items or sortBy changes)
 */
export function useSortedSharedItems(
	items: SharedItem[],
	sortBy: SharedSortOption,
): SharedItem[] {
	return useMemo(() => {
		const comparator = sharedComparators[sortBy];
		return [...items].sort(comparator);
	}, [items, sortBy]);
}
