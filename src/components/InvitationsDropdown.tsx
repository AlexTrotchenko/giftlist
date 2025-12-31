import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Check, Loader2, Mail, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	useInvitationCount,
	useInvitations,
	useAcceptInvitation,
	useDeclineInvitation,
} from "@/hooks/useInvitations";
import type { InvitationWithGroup } from "@/pages/api/invitations/index";
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
						Invited by {invitation.inviter.name ?? invitation.inviter.email}
					</p>
					<p className="mt-0.5 text-muted-foreground text-xs">
						Role: {invitation.role} · {formatTimeAgo(invitation.createdAt)}
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
							Accept
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
							Decline
						</Button>
					</div>
				</div>
			</div>
		</li>
	);
}

function InvitationsList() {
	const [hasOpened, setHasOpened] = useState(false);
	const [processingToken, setProcessingToken] = useState<string | null>(null);
	const { data: invitationCount = 0, isLoading: isLoadingCount } =
		useInvitationCount();
	const { data: invitations, isLoading: isLoadingList } =
		useInvitations(hasOpened);
	const acceptInvitation = useAcceptInvitation();
	const declineInvitation = useDeclineInvitation();

	const handleOpenChange = (open: boolean) => {
		if (open && !hasOpened) {
			setHasOpened(true);
		}
	};

	const handleAccept = (token: string) => {
		setProcessingToken(token);
		acceptInvitation.mutate(token, {
			onSettled: () => setProcessingToken(null),
		});
	};

	const handleDecline = (token: string) => {
		setProcessingToken(token);
		declineInvitation.mutate(token, {
			onSettled: () => setProcessingToken(null),
		});
	};

	return (
		<Popover onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="relative"
					aria-label={`${invitationCount} pending invitations`}
					aria-haspopup="true"
				>
					<Mail className="size-5" />
					{!isLoadingCount && invitationCount > 0 && (
						<span className="-top-1 -right-1 absolute flex size-5 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-xs">
							{invitationCount > 99 ? "99+" : invitationCount}
						</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className="w-80 p-0"
				aria-label="Invitations"
			>
				<div className="flex items-center justify-between border-b p-3">
					<h3 className="font-semibold">Group Invitations</h3>
				</div>
				<div className="max-h-80 overflow-y-auto">
					{isLoadingList && !invitations ? (
						<div className="flex items-center justify-center p-8">
							<Loader2 className="size-5 animate-spin text-muted-foreground" />
						</div>
					) : !invitations || invitations.length === 0 ? (
						<p className="p-8 text-center text-muted-foreground text-sm">
							No pending invitations
						</p>
					) : (
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
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}

export function InvitationsDropdown() {
	return (
		<QueryClientProvider client={queryClient}>
			<InvitationsList />
		</QueryClientProvider>
	);
}
