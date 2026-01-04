import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	ArrowLeft,
	Clock,
	Crown,
	LogOut,
	Mail,
	Pencil,
	Shield,
	Trash2,
	UserPlus,
	Users,
	X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GroupResponse, InvitationResponse } from "@/db/types";
import {
	type MemberWithUser,
	useCancelInvitation,
	useGroupDetail,
	useGroupInvitations,
	useGroupMembers,
	useRemoveMember,
	useUpdateGroup,
} from "@/hooks/useGroups";
import { GroupFormDialog } from "./GroupFormDialog";
import { InviteMemberDialog } from "./InviteMemberDialog";
import * as m from "@/paraglide/messages";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5,
			refetchOnWindowFocus: false,
		},
	},
});

interface GroupDetailPageProps {
	initialGroup: GroupResponse;
	initialMembers: MemberWithUser[];
	initialInvitations: InvitationResponse[];
	currentUserId: string;
	currentUserRole: "owner" | "admin" | "member";
}

function getInitials(name: string | null, email: string): string {
	if (name) {
		const parts = name.split(" ");
		if (parts.length >= 2) {
			return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
		}
		return name.slice(0, 2).toUpperCase();
	}
	return email.slice(0, 2).toUpperCase();
}

function getRoleBadge(role: string) {
	switch (role) {
		case "owner":
			return (
				<span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
					<Crown className="size-3" />
					{m.roles_owner()}
				</span>
			);
		case "admin":
			return (
				<span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
					<Shield className="size-3" />
					{m.roles_admin()}
				</span>
			);
		default:
			return null;
	}
}

function MemberCard({
	member,
	currentUserId,
	currentUserRole,
	onRemove,
	isRemoving,
}: {
	member: MemberWithUser;
	currentUserId: string;
	currentUserRole: "owner" | "admin" | "member";
	onRemove: (userId: string) => void;
	isRemoving: boolean;
}) {
	const isCurrentUser = member.userId === currentUserId;
	const canRemove =
		currentUserRole === "owner" ||
		(currentUserRole === "admin" && member.role === "member") ||
		isCurrentUser;
	const isOwner = member.role === "owner";

	return (
		<div className="flex items-center justify-between gap-3 rounded-lg border p-3">
			<div className="flex items-center gap-3">
				<Avatar className="size-10">
					{member.user.avatarUrl && (
						<AvatarImage
							src={member.user.avatarUrl}
							alt={member.user.name ?? member.user.email}
						/>
					)}
					<AvatarFallback>
						{getInitials(member.user.name, member.user.email)}
					</AvatarFallback>
				</Avatar>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<p className="truncate font-medium">
							{member.user.name ?? member.user.email}
							{isCurrentUser && (
								<span className="ml-1 text-muted-foreground">({m.common_you()})</span>
							)}
						</p>
						{getRoleBadge(member.role)}
					</div>
					{member.user.name && (
						<p className="truncate text-sm text-muted-foreground">
							{member.user.email}
						</p>
					)}
				</div>
			</div>
			{canRemove && !isOwner && (
				<Button
					variant="ghost"
					size="icon"
					className={
						isCurrentUser
							? "size-8"
							: "size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
					}
					onClick={() => onRemove(member.userId)}
					disabled={isRemoving}
					aria-label={
						isCurrentUser
							? m.groups_leaveGroupAriaLabel()
							: m.groups_removeMemberAriaLabel({ name: member.user.name ?? member.user.email })
					}
				>
					{isCurrentUser ? (
						<LogOut className="size-4" />
					) : (
						<Trash2 className="size-4" />
					)}
				</Button>
			)}
		</div>
	);
}

function PendingInvitationCard({
	invitation,
	onCancel,
	isCancelling,
}: {
	invitation: InvitationResponse;
	onCancel: (id: string) => void;
	isCancelling: boolean;
}) {
	const expiresAt = new Date(invitation.expiresAt);
	const isExpired = expiresAt < new Date();
	// Use fixed locale to prevent hydration mismatch between server/client
	const formattedDate = expiresAt.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});

	return (
		<div className="flex items-center justify-between gap-3 rounded-lg border border-dashed p-3">
			<div className="flex items-center gap-3">
				<div className="flex size-10 items-center justify-center rounded-full bg-muted">
					<Mail className="size-5 text-muted-foreground" />
				</div>
				<div className="min-w-0 flex-1">
					<p className="truncate font-medium">{invitation.inviteeEmail}</p>
					<div className="flex items-center gap-1 text-sm text-muted-foreground">
						<Clock className="size-3" />
						{isExpired ? (
							<span className="text-destructive">{m.invitations_expired()}</span>
						) : (
							<span>{m.invitations_expires({ date: formattedDate })}</span>
						)}
					</div>
				</div>
			</div>
			<Button
				variant="ghost"
				size="icon"
				className="size-8 text-muted-foreground hover:text-foreground"
				onClick={() => onCancel(invitation.id)}
				disabled={isCancelling}
				aria-label={m.groups_cancelInvitationAriaLabel({ email: invitation.inviteeEmail })}
			>
				<X className="size-4" />
			</Button>
		</div>
	);
}

function GroupDetailContent({
	initialGroup,
	initialMembers,
	initialInvitations,
	currentUserId,
	currentUserRole,
}: GroupDetailPageProps) {
	const { data: group } = useGroupDetail(initialGroup.id, initialGroup);
	const { data: members = [] } = useGroupMembers(
		initialGroup.id,
		initialMembers,
	);
	const canManage = currentUserRole === "owner" || currentUserRole === "admin";
	const { data: invitations = [] } = useGroupInvitations(
		initialGroup.id,
		initialInvitations,
		canManage,
	);

	const updateGroup = useUpdateGroup();
	const removeMember = useRemoveMember(initialGroup.id);
	const cancelInvitation = useCancelInvitation(initialGroup.id);

	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

	const handleRemoveMember = async (userId: string) => {
		const isCurrentUser = userId === currentUserId;
		const member = members.find((m) => m.userId === userId);
		const message = isCurrentUser
			? m.groups_leaveConfirm()
			: m.groups_removeConfirm({ name: member?.user.name ?? member?.user.email ?? "" });

		if (window.confirm(message)) {
			try {
				await removeMember.mutateAsync(userId);
				toast.success(m.members_removeSuccess());
				if (isCurrentUser) {
					window.location.href = "/groups";
				}
			} catch (err) {
				toast.error(err instanceof Error ? err.message : m.errors_genericError());
			}
		}
	};

	const handleCancelInvitation = async (invitationId: string) => {
		if (window.confirm(m.invitations_cancelInvitation())) {
			try {
				await cancelInvitation.mutateAsync(invitationId);
				toast.success(m.invitations_cancelSuccess());
			} catch (err) {
				toast.error(err instanceof Error ? err.message : m.errors_genericError());
			}
		}
	};

	const pendingInvitations = invitations.filter(
		(inv) => inv.status === "pending",
	);

	if (!group) return null;

	return (
		<div className="container mx-auto max-w-screen-lg px-4 py-8">
			{/* Header */}
			<div className="mb-6">
				<a
					href="/groups"
					className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="size-4" />
					{m.groups_backToGroups()}
				</a>

				<div className="flex items-start justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
							<Users className="size-6 text-primary" />
						</div>
						<div>
							<h1 className="text-2xl font-bold">{group.name}</h1>
							{group.description && (
								<p className="text-muted-foreground">{group.description}</p>
							)}
						</div>
					</div>

					<div className="flex gap-2">
						{currentUserRole === "owner" && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => setEditDialogOpen(true)}
							>
								<Pencil className="size-4" />
								{m.common_edit()}
							</Button>
						)}
						{canManage && (
							<Button size="sm" onClick={() => setInviteDialogOpen(true)}>
								<UserPlus className="size-4" />
								{m.groups_invite()}
							</Button>
						)}
					</div>
				</div>
			</div>

			{/* Members Section */}
			<Card className="mb-6">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-lg">
						<Users className="size-5" />
						{m.groups_membersCount({ count: members.length })}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{members.length === 0 ? (
						<p className="py-4 text-center text-muted-foreground">
							{m.groups_noMembersYet()}
						</p>
					) : (
						members.map((member) => (
							<MemberCard
								key={member.id}
								member={member}
								currentUserId={currentUserId}
								currentUserRole={currentUserRole}
								onRemove={handleRemoveMember}
								isRemoving={removeMember.isPending}
							/>
						))
					)}
				</CardContent>
			</Card>

			{/* Pending Invitations Section */}
			{canManage && pendingInvitations.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-lg">
							<Mail className="size-5" />
							{m.groups_pendingInvitationsCount({ count: pendingInvitations.length })}
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{pendingInvitations.map((invitation) => (
							<PendingInvitationCard
								key={invitation.id}
								invitation={invitation}
								onCancel={handleCancelInvitation}
								isCancelling={cancelInvitation.isPending}
							/>
						))}
					</CardContent>
				</Card>
			)}

			{/* Dialogs */}
			<GroupFormDialog
				open={editDialogOpen}
				onOpenChange={setEditDialogOpen}
				group={group}
			/>
			<InviteMemberDialog
				open={inviteDialogOpen}
				onOpenChange={setInviteDialogOpen}
				groupId={group.id}
			/>
		</div>
	);
}

export function GroupDetailPage(props: GroupDetailPageProps) {
	return (
		<QueryClientProvider client={queryClient}>
			<GroupDetailContent {...props} />
		</QueryClientProvider>
	);
}
