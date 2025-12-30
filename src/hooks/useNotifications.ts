import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotificationResponse } from "@/db/types";

const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;
const UNREAD_COUNT_QUERY_KEY = ["notifications", "unread-count"] as const;

interface NotificationsListResponse {
	data: NotificationResponse[];
	pagination: {
		hasNext: boolean;
		nextCursor: string | null;
	};
}

interface UnreadCountResponse {
	count: number;
}

async function fetchNotifications(): Promise<NotificationsListResponse> {
	const response = await fetch("/api/notifications");
	if (!response.ok) {
		throw new Error("Failed to fetch notifications");
	}
	return response.json();
}

async function fetchUnreadCount(): Promise<number> {
	const response = await fetch("/api/notifications/unread-count");
	if (!response.ok) {
		throw new Error("Failed to fetch unread count");
	}
	const data: UnreadCountResponse = await response.json();
	return data.count;
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

/**
 * Polls unread count every 30s - lightweight for header badge
 */
export function useUnreadCount() {
	return useQuery({
		queryKey: UNREAD_COUNT_QUERY_KEY,
		queryFn: fetchUnreadCount,
		refetchInterval: 30000,
		refetchOnWindowFocus: true,
		staleTime: 1000 * 60,
	});
}

/**
 * Fetches full notification list - use with enabled flag to lazy load on popover open
 */
export function useNotifications(enabled = true) {
	return useQuery({
		queryKey: NOTIFICATIONS_QUERY_KEY,
		queryFn: fetchNotifications,
		enabled,
		staleTime: 1000 * 60,
	});
}

export function useMarkAsRead() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: markAsRead,
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
			await queryClient.cancelQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });

			const previousNotifications =
				queryClient.getQueryData<NotificationsListResponse>(
					NOTIFICATIONS_QUERY_KEY,
				);
			const previousCount = queryClient.getQueryData<number>(
				UNREAD_COUNT_QUERY_KEY,
			);

			// Optimistic update for notifications list
			if (previousNotifications) {
				queryClient.setQueryData<NotificationsListResponse>(
					NOTIFICATIONS_QUERY_KEY,
					{
						...previousNotifications,
						data: previousNotifications.data.map((n) =>
							n.id === id ? { ...n, read: true } : n,
						),
					},
				);
			}

			// Optimistic update for unread count
			if (typeof previousCount === "number" && previousCount > 0) {
				queryClient.setQueryData<number>(
					UNREAD_COUNT_QUERY_KEY,
					previousCount - 1,
				);
			}

			return { previousNotifications, previousCount };
		},
		onError: (_err, _id, context) => {
			if (context?.previousNotifications) {
				queryClient.setQueryData(
					NOTIFICATIONS_QUERY_KEY,
					context.previousNotifications,
				);
			}
			if (typeof context?.previousCount === "number") {
				queryClient.setQueryData(UNREAD_COUNT_QUERY_KEY, context.previousCount);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
			queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
		},
	});
}

export function useMarkAllAsRead() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: markAllAsRead,
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
			await queryClient.cancelQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });

			const previousNotifications =
				queryClient.getQueryData<NotificationsListResponse>(
					NOTIFICATIONS_QUERY_KEY,
				);
			const previousCount = queryClient.getQueryData<number>(
				UNREAD_COUNT_QUERY_KEY,
			);

			// Optimistic update
			if (previousNotifications) {
				queryClient.setQueryData<NotificationsListResponse>(
					NOTIFICATIONS_QUERY_KEY,
					{
						...previousNotifications,
						data: previousNotifications.data.map((n) => ({ ...n, read: true })),
					},
				);
			}
			queryClient.setQueryData<number>(UNREAD_COUNT_QUERY_KEY, 0);

			return { previousNotifications, previousCount };
		},
		onError: (_err, _vars, context) => {
			if (context?.previousNotifications) {
				queryClient.setQueryData(
					NOTIFICATIONS_QUERY_KEY,
					context.previousNotifications,
				);
			}
			if (typeof context?.previousCount === "number") {
				queryClient.setQueryData(UNREAD_COUNT_QUERY_KEY, context.previousCount);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
			queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
		},
	});
}
