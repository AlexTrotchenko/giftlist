import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InvitationWithGroup } from "@/pages/api/invitations/index";
import type { AcceptInvitationResponse } from "@/pages/api/invitations/[token]/accept";
import type { InvitationResponse } from "@/db/types";

const INVITATIONS_QUERY_KEY = ["invitations"] as const;
const INVITATION_COUNT_QUERY_KEY = ["invitations", "count"] as const;

async function fetchInvitations(): Promise<InvitationWithGroup[]> {
	const response = await fetch("/api/invitations");
	if (!response.ok) {
		throw new Error("Failed to fetch invitations");
	}
	return response.json();
}

async function fetchInvitationCount(): Promise<number> {
	const response = await fetch("/api/invitations");
	if (!response.ok) {
		throw new Error("Failed to fetch invitation count");
	}
	const data: InvitationWithGroup[] = await response.json();
	return data.length;
}

async function acceptInvitation(token: string): Promise<AcceptInvitationResponse> {
	const response = await fetch(`/api/invitations/${token}/accept`, {
		method: "POST",
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to accept invitation");
	}
	return response.json();
}

async function declineInvitation(token: string): Promise<InvitationResponse> {
	const response = await fetch(`/api/invitations/${token}/decline`, {
		method: "POST",
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "Failed to decline invitation");
	}
	return response.json();
}

/**
 * Polls invitation count every 30s - lightweight for header badge
 */
export function useInvitationCount() {
	return useQuery({
		queryKey: INVITATION_COUNT_QUERY_KEY,
		queryFn: fetchInvitationCount,
		refetchInterval: 30000,
		refetchOnWindowFocus: true,
		staleTime: 1000 * 60,
	});
}

/**
 * Fetches full invitation list - use with enabled flag to lazy load on popover open
 */
export function useInvitations(enabled = true) {
	return useQuery({
		queryKey: INVITATIONS_QUERY_KEY,
		queryFn: fetchInvitations,
		enabled,
		staleTime: 1000 * 60,
	});
}

export function useAcceptInvitation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: acceptInvitation,
		onMutate: async (token) => {
			await queryClient.cancelQueries({ queryKey: INVITATIONS_QUERY_KEY });
			await queryClient.cancelQueries({ queryKey: INVITATION_COUNT_QUERY_KEY });

			const previousInvitations =
				queryClient.getQueryData<InvitationWithGroup[]>(INVITATIONS_QUERY_KEY);
			const previousCount = queryClient.getQueryData<number>(
				INVITATION_COUNT_QUERY_KEY,
			);

			// Optimistic update for invitations list - remove accepted invitation
			if (previousInvitations) {
				queryClient.setQueryData<InvitationWithGroup[]>(
					INVITATIONS_QUERY_KEY,
					previousInvitations.filter((inv) => inv.token !== token),
				);
			}

			// Optimistic update for count
			if (typeof previousCount === "number" && previousCount > 0) {
				queryClient.setQueryData<number>(
					INVITATION_COUNT_QUERY_KEY,
					previousCount - 1,
				);
			}

			return { previousInvitations, previousCount };
		},
		onError: (_err, _token, context) => {
			if (context?.previousInvitations) {
				queryClient.setQueryData(
					INVITATIONS_QUERY_KEY,
					context.previousInvitations,
				);
			}
			if (typeof context?.previousCount === "number") {
				queryClient.setQueryData(INVITATION_COUNT_QUERY_KEY, context.previousCount);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: INVITATIONS_QUERY_KEY });
			queryClient.invalidateQueries({ queryKey: INVITATION_COUNT_QUERY_KEY });
			// Also invalidate groups since we just joined a new one
			queryClient.invalidateQueries({ queryKey: ["groups"] });
		},
	});
}

export function useDeclineInvitation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: declineInvitation,
		onMutate: async (token) => {
			await queryClient.cancelQueries({ queryKey: INVITATIONS_QUERY_KEY });
			await queryClient.cancelQueries({ queryKey: INVITATION_COUNT_QUERY_KEY });

			const previousInvitations =
				queryClient.getQueryData<InvitationWithGroup[]>(INVITATIONS_QUERY_KEY);
			const previousCount = queryClient.getQueryData<number>(
				INVITATION_COUNT_QUERY_KEY,
			);

			// Optimistic update for invitations list - remove declined invitation
			if (previousInvitations) {
				queryClient.setQueryData<InvitationWithGroup[]>(
					INVITATIONS_QUERY_KEY,
					previousInvitations.filter((inv) => inv.token !== token),
				);
			}

			// Optimistic update for count
			if (typeof previousCount === "number" && previousCount > 0) {
				queryClient.setQueryData<number>(
					INVITATION_COUNT_QUERY_KEY,
					previousCount - 1,
				);
			}

			return { previousInvitations, previousCount };
		},
		onError: (_err, _token, context) => {
			if (context?.previousInvitations) {
				queryClient.setQueryData(
					INVITATIONS_QUERY_KEY,
					context.previousInvitations,
				);
			}
			if (typeof context?.previousCount === "number") {
				queryClient.setQueryData(INVITATION_COUNT_QUERY_KEY, context.previousCount);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: INVITATIONS_QUERY_KEY });
			queryClient.invalidateQueries({ queryKey: INVITATION_COUNT_QUERY_KEY });
		},
	});
}
