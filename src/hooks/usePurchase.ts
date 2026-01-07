import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ClaimResponse } from "@/db/types";
import { MY_CLAIMS_QUERY_KEY } from "./useClaims";
import { SHARED_ITEMS_QUERY_KEY } from "./useSharedItems";

interface ApiError {
	error: string;
}

/**
 * Mark a claim as purchased
 * Sets purchasedAt timestamp and notifies other recipients (not the owner)
 */
async function markPurchased(claimId: string): Promise<ClaimResponse> {
	const response = await fetch(`/api/claims/${claimId}/purchase`, {
		method: "POST",
	});
	if (!response.ok) {
		const error: ApiError = await response.json();
		throw new Error(error.error || "Failed to mark as purchased");
	}
	return response.json();
}

/**
 * Unmark a claim as purchased
 * Resets purchasedAt to null (rare case: changed mind after marking)
 */
async function unmarkPurchased(claimId: string): Promise<ClaimResponse> {
	const response = await fetch(`/api/claims/${claimId}/purchase`, {
		method: "DELETE",
	});
	if (!response.ok) {
		const error: ApiError = await response.json();
		throw new Error(error.error || "Failed to unmark as purchased");
	}
	return response.json();
}

/**
 * Hook to mark a claim as purchased
 * Use when claimer has bought the item and wants to indicate it
 */
export function useMarkPurchased() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (claimId: string) => markPurchased(claimId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: MY_CLAIMS_QUERY_KEY });
			queryClient.invalidateQueries({ queryKey: SHARED_ITEMS_QUERY_KEY });
		},
	});
}

/**
 * Hook to unmark a claim as purchased
 * Use when claimer wants to undo the purchased status
 */
export function useUnmarkPurchased() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (claimId: string) => unmarkPurchased(claimId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: MY_CLAIMS_QUERY_KEY });
			queryClient.invalidateQueries({ queryKey: SHARED_ITEMS_QUERY_KEY });
		},
	});
}
