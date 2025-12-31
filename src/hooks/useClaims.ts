import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ClaimResponse } from "@/db/types";
import type { CreateClaimInput } from "@/lib/validations/claim";
import { SHARED_ITEMS_QUERY_KEY } from "./useSharedItems";

export const MY_CLAIMS_QUERY_KEY = ["myClaims"] as const;

interface ApiError {
	error: string;
}

async function fetchMyClaims(): Promise<ClaimResponse[]> {
	const response = await fetch("/api/claims");
	if (!response.ok) {
		const error: ApiError = await response.json();
		throw new Error(error.error || "Failed to fetch claims");
	}
	return response.json();
}

async function createClaim(input: CreateClaimInput): Promise<ClaimResponse> {
	const response = await fetch("/api/claims", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input),
	});
	if (!response.ok) {
		const error: ApiError = await response.json();
		throw new Error(error.error || "Failed to create claim");
	}
	return response.json();
}

async function releaseClaim(claimId: string): Promise<void> {
	const response = await fetch(`/api/claims/${claimId}`, {
		method: "DELETE",
	});
	if (!response.ok) {
		const error: ApiError = await response.json();
		throw new Error(error.error || "Failed to release claim");
	}
}

/**
 * Fetches all claims made by the current user
 */
export function useMyClaims() {
	return useQuery({
		queryKey: MY_CLAIMS_QUERY_KEY,
		queryFn: fetchMyClaims,
	});
}

/**
 * Creates a claim on an item
 * Uses optimistic update to immediately show the claim in the UI
 * @param itemId - The item to claim
 * @param amount - Optional amount in cents for partial claims. Omit for full claim.
 */
export function useCreateClaim() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: { itemId: string; amount?: number | null }) =>
			createClaim(input),
		onMutate: async (input) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: SHARED_ITEMS_QUERY_KEY });
			await queryClient.cancelQueries({ queryKey: MY_CLAIMS_QUERY_KEY });

			// Snapshot previous values for rollback
			const previousSharedItems = queryClient.getQueryData(SHARED_ITEMS_QUERY_KEY);
			const previousClaims = queryClient.getQueryData<ClaimResponse[]>(MY_CLAIMS_QUERY_KEY);

			return { previousSharedItems, previousClaims };
		},
		onError: (_err, _input, context) => {
			// Rollback on error
			if (context?.previousSharedItems) {
				queryClient.setQueryData(SHARED_ITEMS_QUERY_KEY, context.previousSharedItems);
			}
			if (context?.previousClaims) {
				queryClient.setQueryData(MY_CLAIMS_QUERY_KEY, context.previousClaims);
			}
		},
		onSettled: () => {
			// Invalidate to refetch fresh data
			queryClient.invalidateQueries({ queryKey: SHARED_ITEMS_QUERY_KEY });
			queryClient.invalidateQueries({ queryKey: MY_CLAIMS_QUERY_KEY });
		},
	});
}

/**
 * Releases (deletes) a claim
 * Uses optimistic update to immediately remove the claim from myClaims
 */
export function useReleaseClaim() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: releaseClaim,
		onMutate: async (claimId) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: MY_CLAIMS_QUERY_KEY });

			// Snapshot previous value
			const previousClaims =
				queryClient.getQueryData<ClaimResponse[]>(MY_CLAIMS_QUERY_KEY);

			// Optimistically remove the claim
			if (previousClaims) {
				queryClient.setQueryData<ClaimResponse[]>(
					MY_CLAIMS_QUERY_KEY,
					previousClaims.filter((c) => c.id !== claimId),
				);
			}

			return { previousClaims };
		},
		onError: (_err, _claimId, context) => {
			// Rollback on error
			if (context?.previousClaims) {
				queryClient.setQueryData(MY_CLAIMS_QUERY_KEY, context.previousClaims);
			}
		},
		onSettled: () => {
			// Invalidate to refetch fresh data
			queryClient.invalidateQueries({ queryKey: SHARED_ITEMS_QUERY_KEY });
			queryClient.invalidateQueries({ queryKey: MY_CLAIMS_QUERY_KEY });
		},
	});
}
