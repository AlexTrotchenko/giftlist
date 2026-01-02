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
import { LocaleProvider, getLocale, type Locale } from "@/i18n/LocaleContext";
import { formatTimeAgo } from "@/i18n/formatting";
import * as m from "@/paraglide/messages";

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
					aria-label={m.invitations_pendingCount({ count: invitationCount })}
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
					<h3 className="font-semibold">{m.invitations_title()}</h3>
				</div>
				<div className="max-h-80 overflow-y-auto">
					{isLoadingList && !invitations ? (
						<div className="flex items-center justify-center p-8">
							<Loader2 className="size-5 animate-spin text-muted-foreground" />
						</div>
					) : !invitations || invitations.length === 0 ? (
						<p className="p-8 text-center text-muted-foreground text-sm">
							{m.invitations_empty()}
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

interface InvitationsDropdownProps {
	locale: Locale;
}

export function InvitationsDropdown({ locale }: InvitationsDropdownProps) {
	return (
		<LocaleProvider initialLocale={locale}>
			<QueryClientProvider client={queryClient}>
				<InvitationsList />
			</QueryClientProvider>
		</LocaleProvider>
	);
}
