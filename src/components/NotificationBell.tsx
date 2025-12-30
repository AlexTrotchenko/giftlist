import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	useUnreadCount,
	useNotifications,
	useMarkAsRead,
	useMarkAllAsRead,
} from "@/hooks/useNotifications";
import type { NotificationResponse } from "@/db/types";
import { cn } from "@/lib/utils";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5,
			refetchOnWindowFocus: false,
		},
	},
});

function formatTimeAgo(dateString: string | null): string {
	if (!dateString) return "";
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffMins < 1) return "Just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;
	return date.toLocaleDateString();
}

function NotificationItem({
	notification,
	onMarkRead,
}: {
	notification: NotificationResponse;
	onMarkRead: (id: string) => void;
}) {
	return (
		<li
			role="listitem"
			tabIndex={0}
			className={cn(
				"cursor-pointer rounded-md p-3 transition-colors hover:bg-muted",
				!notification.read && "bg-primary/5 border-l-2 border-l-primary",
			)}
			onClick={() => !notification.read && onMarkRead(notification.id)}
			onKeyDown={(e) => {
				if ((e.key === "Enter" || e.key === " ") && !notification.read) {
					e.preventDefault();
					onMarkRead(notification.id);
				}
			}}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0 flex-1">
					<p className="truncate font-medium text-sm">{notification.title}</p>
					<p className="mt-0.5 line-clamp-2 text-muted-foreground text-xs">
						{notification.body}
					</p>
					<p className="mt-1 text-muted-foreground text-xs">
						{formatTimeAgo(notification.createdAt)}
					</p>
				</div>
				{!notification.read && (
					<div className="size-2 shrink-0 rounded-full bg-primary" />
				)}
			</div>
		</li>
	);
}

function NotificationList() {
	const [hasOpened, setHasOpened] = useState(false);
	const { data: unreadCount = 0, isLoading: isLoadingCount } = useUnreadCount();
	const { data: notificationsData, isLoading: isLoadingList } =
		useNotifications(hasOpened);
	const markAsRead = useMarkAsRead();
	const markAllAsRead = useMarkAllAsRead();

	const notifications = notificationsData?.data ?? [];
	const hasUnread = notifications.some((n) => !n.read);

	const handleOpenChange = (open: boolean) => {
		if (open && !hasOpened) {
			setHasOpened(true);
		}
	};

	return (
		<Popover onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="relative"
					aria-label={`${unreadCount} unread notifications`}
					aria-haspopup="true"
				>
					<Bell className="size-5" />
					{!isLoadingCount && unreadCount > 0 && (
						<span className="-top-1 -right-1 absolute flex size-5 items-center justify-center rounded-full bg-destructive font-medium text-destructive-foreground text-xs">
							{unreadCount > 99 ? "99+" : unreadCount}
						</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className="w-80 p-0"
				aria-label="Notifications"
			>
				<div className="flex items-center justify-between border-b p-3">
					<h3 className="font-semibold">Notifications</h3>
					{hasUnread && (
						<Button
							variant="ghost"
							size="sm"
							className="h-auto p-1 text-xs"
							onClick={() => markAllAsRead.mutate()}
							disabled={markAllAsRead.isPending}
						>
							{markAllAsRead.isPending ? (
								<Loader2 className="mr-1 size-3 animate-spin" />
							) : (
								<Check className="mr-1 size-3" />
							)}
							Mark all read
						</Button>
					)}
				</div>
				<div className="max-h-80 overflow-y-auto">
					{isLoadingList && !notificationsData ? (
						<div className="flex items-center justify-center p-8">
							<Loader2 className="size-5 animate-spin text-muted-foreground" />
						</div>
					) : notifications.length === 0 ? (
						<p className="p-8 text-center text-muted-foreground text-sm">
							No notifications
						</p>
					) : (
						<ul role="list" className="divide-y p-1">
							{notifications.map((notification) => (
								<NotificationItem
									key={notification.id}
									notification={notification}
									onMarkRead={(id) => markAsRead.mutate(id)}
								/>
							))}
						</ul>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}

export function NotificationBell() {
	return (
		<QueryClientProvider client={queryClient}>
			<NotificationList />
		</QueryClientProvider>
	);
}
