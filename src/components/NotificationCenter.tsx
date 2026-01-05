import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Bell, Check, Loader2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	useNotificationCenterCounts,
	useInvitations,
	useNotifications,
	useMarkAsRead,
	useMarkAllAsRead,
	useAcceptInvitation,
	useDeclineInvitation,
} from "@/hooks/useNotificationCenter";
import type { NotificationResponse } from "@/db/types";
import type { InvitationWithGroup } from "@/pages/api/invitations/index";
import { cn } from "@/lib/utils";
import { LocaleProvider, getLocale, type Locale } from "@/i18n/LocaleContext";
import { formatTimeAgo } from "@/i18n/formatting";
import { localizeHref } from "@/paraglide/runtime";
import * as m from "@/paraglide/messages";
import type { NotificationType } from "@/lib/notifications";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5,
			refetchOnWindowFocus: false,
		},
	},
});

function getTimeAgoText(dateString: string | null): string {
	if (!dateString) return "";
	const locale = getLocale();
	return formatTimeAgo(dateString, locale);
}

/**
 * Returns the appropriate href for a notification based on its type and data.
 * Returns null for notification types that shouldn't navigate.
 */
function getNotificationHref(notification: NotificationResponse): string | null {
	const type = notification.type as NotificationType;
	const data = notification.data as Record<string, unknown> | null;

	if (!data) return null;

	switch (type) {
		// Group-related notifications → navigate to the group
		case "invitation_accepted":
		case "member_joined":
		case "member_left": {
			const groupId = data.groupId as string | undefined;
			if (groupId) return localizeHref(`/groups/${groupId}`);
			return null;
		}

		// Item-related notifications → navigate to shared items page
		case "item_claimed":
		case "claim_released":
		case "claim_released_access_lost": {
			// Navigate to shared page where users can see claimed/available items
			return localizeHref("/shared");
		}

		// These notification types don't need navigation
		case "group_invitation": // Handled by InvitationItem with accept/decline buttons
		case "item_purchased":
		case "item_added":
		case "item_deleted":
		case "reminder":
		default:
			return null;
	}
}

// ============================================================================
// Invitation Item Component
// ============================================================================

function InvitationItem({
	invitation,
	onAccept,
	onDecline,
	isAccepting,
	isDeclining,
}: {
	invitation: InvitationWithGroup;
	onAccept: (token: string) => void;
	onDecline: (token: string) => void;
	isAccepting: boolean;
	isDeclining: boolean;
}) {
	const isProcessing = isAccepting || isDeclining;

	return (
		<li
			className={cn(
				"rounded-md p-3 transition-colors",
				isProcessing && "opacity-50",
			)}
		>
			<div className="flex items-start gap-3">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
					<Users className="size-5 text-primary" />
				</div>
				<div className="min-w-0 flex-1">
					<p className="font-medium text-sm">{invitation.group.name}</p>
					<p className="mt-0.5 text-muted-foreground text-xs">
						{m.invitations_invitedBy({ name: invitation.inviter.name ?? invitation.inviter.email })}
					</p>
					<p className="mt-0.5 text-muted-foreground text-xs">
						{m.invitations_roleTime({ role: invitation.role, time: getTimeAgoText(invitation.createdAt) })}
					</p>
					<div className="mt-2 flex gap-2">
						<Button
							size="sm"
							variant="default"
							className="h-7 gap-1 px-2 text-xs"
							onClick={() => onAccept(invitation.token)}
							disabled={isProcessing}
						>
							{isAccepting ? (
								<Loader2 className="size-3 animate-spin" />
							) : (
								<Check className="size-3" />
							)}
							{m.invitations_accept()}
						</Button>
						<Button
							size="sm"
							variant="ghost"
							className="h-7 gap-1 px-2 text-xs"
							onClick={() => onDecline(invitation.token)}
							disabled={isProcessing}
						>
							{isDeclining ? (
								<Loader2 className="size-3 animate-spin" />
							) : (
								<X className="size-3" />
							)}
							{m.invitations_decline()}
						</Button>
					</div>
				</div>
			</div>
		</li>
	);
}

// ============================================================================
// Notification Item Component
// ============================================================================

function NotificationItem({
	notification,
	onMarkRead,
}: {
	notification: NotificationResponse;
	onMarkRead: (id: string) => void;
}) {
	const href = getNotificationHref(notification);
	const hasLink = href !== null;

	const handleClick = () => {
		// Mark as read if not already
		if (!notification.read) {
			onMarkRead(notification.id);
		}
		// Navigation handled by the <a> tag if present
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			handleClick();
			// Navigate for keyboard users if there's a link
			if (hasLink) {
				window.location.href = href;
			}
		}
	};

	const content = (
		<div className="flex items-start justify-between gap-2">
			<div className="min-w-0 flex-1">
				<p className="truncate font-medium text-sm">{notification.title}</p>
				<p className="mt-0.5 line-clamp-2 text-muted-foreground text-xs">
					{notification.body}
				</p>
				<p className="mt-1 text-muted-foreground text-xs">
					{getTimeAgoText(notification.createdAt)}
				</p>
			</div>
			{!notification.read && (
				<div className="size-2 shrink-0 rounded-full bg-primary" />
			)}
		</div>
	);

	const baseClassName = cn(
		"block cursor-pointer rounded-md p-3 transition-colors hover:bg-muted",
		!notification.read && "bg-primary/5 border-l-2 border-l-primary",
	);

	// Use an <a> tag when there's a navigable link for better semantics
	if (hasLink) {
		return (
			<li role="listitem">
				<a
					href={href}
					className={baseClassName}
					onClick={handleClick}
					onKeyDown={handleKeyDown}
				>
					{content}
				</a>
			</li>
		);
	}

	// Fallback to div for non-navigable notifications
	return (
		<li
			role="listitem"
			tabIndex={0}
			className={baseClassName}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
		>
			{content}
		</li>
	);
}

// ============================================================================
// Main Notification Center Content
// ============================================================================

function NotificationCenterContent() {
	const [hasOpened, setHasOpened] = useState(false);
	const [processingToken, setProcessingToken] = useState<string | null>(null);

	// Single polling endpoint for badge
	const { data: counts, isLoading: isLoadingCounts } = useNotificationCenterCounts();

	// Lazy-load lists only when popover opens
	const { data: invitations, isLoading: isLoadingInvitations } = useInvitations(hasOpened);
	const { data: notificationsData, isLoading: isLoadingNotifications } = useNotifications(hasOpened);

	// Mutations
	const markAsRead = useMarkAsRead();
	const markAllAsRead = useMarkAllAsRead();
	const acceptInvitation = useAcceptInvitation();
	const declineInvitation = useDeclineInvitation();

	const notifications = notificationsData?.data ?? [];
	const hasUnreadNotifications = notifications.some((n) => !n.read);
	const totalCount = counts?.total ?? 0;

	const handleOpenChange = (open: boolean) => {
		if (open && !hasOpened) {
			setHasOpened(true);
		}
	};

	const handleAccept = (token: string) => {
		setProcessingToken(token);
		acceptInvitation.mutate(token, {
			onSuccess: () => toast.success(m.invitations_acceptSuccess()),
			onError: (err) => toast.error(err.message || m.errors_genericError()),
			onSettled: () => setProcessingToken(null),
		});
	};

	const handleDecline = (token: string) => {
		setProcessingToken(token);
		declineInvitation.mutate(token, {
			onSuccess: () => toast.success(m.invitations_declineSuccess()),
			onError: (err) => toast.error(err.message || m.errors_genericError()),
			onSettled: () => setProcessingToken(null),
		});
	};

	const isLoading = isLoadingInvitations || isLoadingNotifications;
	const hasInvitations = invitations && invitations.length > 0;
	const hasNotifications = notifications.length > 0;
	const isEmpty = !hasInvitations && !hasNotifications;

	return (
		<Popover onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="relative"
					aria-label={m.notificationCenter_ariaLabel({ count: totalCount })}
					aria-haspopup="true"
				>
					<Bell className="size-5" />
					{!isLoadingCounts && totalCount > 0 && (
						<span className="-top-1 -right-1 absolute flex size-5 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-xs motion-safe:animate-badge-pulse">
							{totalCount > 99 ? "99+" : totalCount}
						</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className="w-[calc(100vw-2rem)] max-w-96 p-0 sm:w-96"
				aria-label={m.notificationCenter_title()}
			>
				{/* Header */}
				<div className="flex items-center justify-between border-b p-3">
					<h3 className="font-semibold">{m.notificationCenter_title()}</h3>
					{hasUnreadNotifications && (
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
							{m.notifications_markAllRead()}
						</Button>
					)}
				</div>

				{/* Content */}
				<div className="max-h-96 overflow-y-auto">
					{isLoading && !invitations && !notificationsData ? (
						<div className="flex items-center justify-center p-8">
							<Loader2 className="size-5 animate-spin text-muted-foreground" />
						</div>
					) : isEmpty ? (
						<p className="p-8 text-center text-muted-foreground text-sm">
							{m.notificationCenter_empty()}
						</p>
					) : (
						<>
							{/* Invitations Section */}
							{hasInvitations && (
								<div>
									<div className="bg-muted/50 px-3 py-2">
										<h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
											{m.invitations_title()}
										</h4>
									</div>
									<ul className="divide-y p-1">
										{invitations.map((invitation) => (
											<InvitationItem
												key={invitation.id}
												invitation={invitation}
												onAccept={handleAccept}
												onDecline={handleDecline}
												isAccepting={
													processingToken === invitation.token &&
													acceptInvitation.isPending
												}
												isDeclining={
													processingToken === invitation.token &&
													declineInvitation.isPending
												}
											/>
										))}
									</ul>
								</div>
							)}

							{/* Notifications Section */}
							{hasNotifications && (
								<div>
									{hasInvitations && (
										<div className="bg-muted/50 px-3 py-2">
											<h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
												{m.notifications_title()}
											</h4>
										</div>
									)}
									<ul role="list" className="divide-y p-1">
										{notifications.map((notification) => (
											<NotificationItem
												key={notification.id}
												notification={notification}
												onMarkRead={(id) => markAsRead.mutate(id)}
											/>
										))}
									</ul>
								</div>
							)}
						</>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}

// ============================================================================
// Export Component with Providers
// ============================================================================

interface NotificationCenterProps {
	locale: Locale;
}

export function NotificationCenter({ locale }: NotificationCenterProps) {
	return (
		<LocaleProvider initialLocale={locale}>
			<QueryClientProvider client={queryClient}>
				<NotificationCenterContent />
			</QueryClientProvider>
		</LocaleProvider>
	);
}
