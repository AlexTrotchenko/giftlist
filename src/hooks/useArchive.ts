import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ItemResponse } from "@/db/types";

const ITEMS_QUERY_KEY = ["items"] as const;

interface ApiError {
	error: string;
	details?: string;
}

/**
 * Mark an item as received by the owner
 * Transitions: active -> received
 * Notifies claimers that owner confirmed receipt
 */
async function receiveItem(itemId: string): Promise<ItemResponse> {
	const response = await fetch(`/api/items/${itemId}/receive`, {
		method: "POST",
	});
	if (!response.ok) {
		const error: ApiError = await response.json();
		throw new Error(error.error || "Failed to mark item as received");
	}
	return response.json();
}

/**
 * Archive an item (hide from recipients)
 * Transitions: active (if no claims) or received -> archived
 */
async function archiveItem(itemId: string): Promise<ItemResponse> {
	const response = await fetch(`/api/items/${itemId}/archive`, {
		method: "POST",
	});
	if (!response.ok) {
		const error: ApiError = await response.json();
		throw new Error(error.error || "Failed to archive item");
	}
	return response.json();
}

/**
 * Restore an archived item back to active
 * Transitions: archived or received -> active
 */
async function restoreItem(itemId: string): Promise<ItemResponse> {
	const response = await fetch(`/api/items/${itemId}/restore`, {
		method: "POST",
	});
	if (!response.ok) {
		const error: ApiError = await response.json();
		throw new Error(error.error || "Failed to restore item");
	}
	return response.json();
}

/**
 * Hook to mark an item as received
 * Use when owner wants to confirm they received the gift
 */
export function useReceiveItem() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (itemId: string) => receiveItem(itemId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ITEMS_QUERY_KEY });
		},
	});
}

/**
 * Hook to archive an item
 * Use when owner wants to hide an item from their wishlist
 */
export function useArchiveItem() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (itemId: string) => archiveItem(itemId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ITEMS_QUERY_KEY });
		},
	});
}

/**
 * Hook to restore an archived item
 * Use when owner wants to bring back an item to their wishlist
 */
export function useRestoreItem() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (itemId: string) => restoreItem(itemId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ITEMS_QUERY_KEY });
		},
	});
}
