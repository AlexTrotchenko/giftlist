import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotificationResponse } from "@/db/types";
import type { InvitationWithGroup } from "@/pages/api/invitations/index";
import type { NotificationCenterCountsResponse } from "@/pages/api/notification-center/counts";
import type { AcceptInvitationResponse } from "@/pages/api/invitations/[token]/accept";
import type { InvitationResponse } from "@/db/types";

// Unified query keys for easier invalidation
const KEYS = {
	counts: ["notification-center", "counts"] as const,
	invitations: ["notification-center", "invitations"] as const,
	notifications: ["notification-center", "notifications"] as const,
} as const;

interface NotificationsListResponse {
	data: NotificationResponse[];
	pagination: {
		hasNext: boolean;
		nextCursor: string | null;
	};
}

// ============================================================================
// Fetch functions
// ============================================================================

async function fetchCounts(): Promise<NotificationCenterCountsResponse> {
	const response = await fetch("/api/notification-center/counts");
	if (!response.ok) {
		throw new Error("Failed to fetch counts");
	}
	return response.json();
}

async function fetchInvitations(): Promise<InvitationWithGroup[]> {
	const response = await fetch("/api/invitations");
	if (!response.ok) {
		throw new Error("Failed to fetch invitations");
	}
	return response.json();
}

async function fetchNotifications(): Promise<NotificationsListResponse> {
	const response = await fetch("/api/notifications");
	if (!response.ok) {
		throw new Error("Failed to fetch notifications");
	}
	return response.json();
}

async function markAsRead(id: string): Promise<NotificationResponse> {
	const response = await fetch("/api/notifications/mark-read", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ id }),
	});
	if (!response.ok) {
		throw new Error("Failed to mark notification as read");
	}
	return response.json();
}

async function markAllAsRead(): Promise<{ count: number }> {
	const response = await fetch("/api/notifications/mark-all-read", {
		method: "POST",
	});
	if (!response.ok) {
		throw new Error("Failed to mark all notifications as read");
	}
	return response.json();
}

async function acceptInvitation(token: string): Promise<AcceptInvitationResponse> {
	const response = await fetch(`/api/invitations/${token}/accept`, {
		method: "POST",
	});
	if (!response.ok) {
		const error = (await response.json()) as { error?: string };
		throw new Error(error.error || "Failed to accept invitation");
	}
	return response.json();
}

async function declineInvitation(token: string): Promise<InvitationResponse> {
	const response = await fetch(`/api/invitations/${token}/decline`, {
		method: "POST",
	});
	if (!response.ok) {
		const error = (await response.json()) as { error?: string };
		throw new Error(error.error || "Failed to decline invitation");
	}
	return response.json();
}

// ============================================================================
// Query hooks
// ============================================================================

/**
 * Polls unified counts every 30s - lightweight for header badge
 * Returns both notification and invitation counts in a single request
 */
export function useNotificationCenterCounts() {
	return useQuery({
		queryKey: KEYS.counts,
		queryFn: fetchCounts,
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
		queryKey: KEYS.invitations,
		queryFn: fetchInvitations,
		enabled,
		staleTime: 1000 * 60,
	});
}

/**
 * Fetches full notification list - use with enabled flag to lazy load on popover open
 */
export function useNotifications(enabled = true) {
	return useQuery({
		queryKey: KEYS.notifications,
		queryFn: fetchNotifications,
		enabled,
		staleTime: 1000 * 60,
	});
}

// ============================================================================
// Mutation hooks
// ============================================================================

export function useMarkAsRead() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: markAsRead,
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: KEYS.notifications });
			await queryClient.cancelQueries({ queryKey: KEYS.counts });

			const previousNotifications =
				queryClient.getQueryData<NotificationsListResponse>(KEYS.notifications);
			const previousCounts =
				queryClient.getQueryData<NotificationCenterCountsResponse>(KEYS.counts);

			// Optimistic update for notifications list
			if (previousNotifications) {
				queryClient.setQueryData<NotificationsListResponse>(KEYS.notifications, {
					...previousNotifications,
					data: previousNotifications.data.map((n) =>
						n.id === id ? { ...n, read: true } : n,
					),
				});
			}

			// Optimistic update for counts
			if (previousCounts && previousCounts.notifications > 0) {
				queryClient.setQueryData<NotificationCenterCountsResponse>(KEYS.counts, {
					...previousCounts,
					notifications: previousCounts.notifications - 1,
					total: previousCounts.total - 1,
				});
			}

			return { previousNotifications, previousCounts };
		},
		onError: (_err, _id, context) => {
			if (context?.previousNotifications) {
				queryClient.setQueryData(KEYS.notifications, context.previousNotifications);
			}
			if (context?.previousCounts) {
				queryClient.setQueryData(KEYS.counts, context.previousCounts);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: KEYS.notifications });
			queryClient.invalidateQueries({ queryKey: KEYS.counts });
		},
	});
}

export function useMarkAllAsRead() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: markAllAsRead,
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey: KEYS.notifications });
			await queryClient.cancelQueries({ queryKey: KEYS.counts });

			const previousNotifications =
				queryClient.getQueryData<NotificationsListResponse>(KEYS.notifications);
			const previousCounts =
				queryClient.getQueryData<NotificationCenterCountsResponse>(KEYS.counts);

			// Optimistic update for notifications
			if (previousNotifications) {
				queryClient.setQueryData<NotificationsListResponse>(KEYS.notifications, {
					...previousNotifications,
					data: previousNotifications.data.map((n) => ({ ...n, read: true })),
				});
			}

			// Optimistic update for counts
			if (previousCounts) {
				queryClient.setQueryData<NotificationCenterCountsResponse>(KEYS.counts, {
					...previousCounts,
					notifications: 0,
					total: previousCounts.invitations,
				});
			}

			return { previousNotifications, previousCounts };
		},
		onError: (_err, _vars, context) => {
			if (context?.previousNotifications) {
				queryClient.setQueryData(KEYS.notifications, context.previousNotifications);
			}
			if (context?.previousCounts) {
				queryClient.setQueryData(KEYS.counts, context.previousCounts);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: KEYS.notifications });
			queryClient.invalidateQueries({ queryKey: KEYS.counts });
		},
	});
}

export function useAcceptInvitation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: acceptInvitation,
		onMutate: async (token) => {
			await queryClient.cancelQueries({ queryKey: KEYS.invitations });
			await queryClient.cancelQueries({ queryKey: KEYS.counts });

			const previousInvitations =
				queryClient.getQueryData<InvitationWithGroup[]>(KEYS.invitations);
			const previousCounts =
				queryClient.getQueryData<NotificationCenterCountsResponse>(KEYS.counts);

			// Optimistic update for invitations list
			if (previousInvitations) {
				queryClient.setQueryData<InvitationWithGroup[]>(
					KEYS.invitations,
					previousInvitations.filter((inv) => inv.token !== token),
				);
			}

			// Optimistic update for counts
			if (previousCounts && previousCounts.invitations > 0) {
				queryClient.setQueryData<NotificationCenterCountsResponse>(KEYS.counts, {
					...previousCounts,
					invitations: previousCounts.invitations - 1,
					total: previousCounts.total - 1,
				});
			}

			return { previousInvitations, previousCounts };
		},
		onError: (_err, _token, context) => {
			if (context?.previousInvitations) {
				queryClient.setQueryData(KEYS.invitations, context.previousInvitations);
			}
			if (context?.previousCounts) {
				queryClient.setQueryData(KEYS.counts, context.previousCounts);
			}
		},
		onSettled: () => {
			// Invalidate all notification-center queries
			queryClient.invalidateQueries({ queryKey: ["notification-center"] });
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
			await queryClient.cancelQueries({ queryKey: KEYS.invitations });
			await queryClient.cancelQueries({ queryKey: KEYS.counts });

			const previousInvitations =
				queryClient.getQueryData<InvitationWithGroup[]>(KEYS.invitations);
			const previousCounts =
				queryClient.getQueryData<NotificationCenterCountsResponse>(KEYS.counts);

			// Optimistic update for invitations list
			if (previousInvitations) {
				queryClient.setQueryData<InvitationWithGroup[]>(
					KEYS.invitations,
					previousInvitations.filter((inv) => inv.token !== token),
				);
			}

			// Optimistic update for counts
			if (previousCounts && previousCounts.invitations > 0) {
				queryClient.setQueryData<NotificationCenterCountsResponse>(KEYS.counts, {
					...previousCounts,
					invitations: previousCounts.invitations - 1,
					total: previousCounts.total - 1,
				});
			}

			return { previousInvitations, previousCounts };
		},
		onError: (_err, _token, context) => {
			if (context?.previousInvitations) {
				queryClient.setQueryData(KEYS.invitations, context.previousInvitations);
			}
			if (context?.previousCounts) {
				queryClient.setQueryData(KEYS.counts, context.previousCounts);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["notification-center"] });
		},
	});
}
