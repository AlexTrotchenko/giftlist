import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
	GroupMemberResponse,
	GroupResponse,
	InvitationResponse,
	UserResponse,
} from "@/db/types";
import type {
	CreateGroupInput,
	UpdateGroupInput,
} from "@/lib/validations/group";
import type { CreateInvitationInput } from "@/lib/validations/invitation";

const GROUPS_QUERY_KEY = ["groups"] as const;

export type MemberWithUser = GroupMemberResponse & {
	user: Pick<UserResponse, "id" | "name" | "email" | "avatarUrl">;
};

interface ApiError {
	error: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
	if (!response.ok) {
		const error: ApiError = await response.json();
		throw new Error(error.error || "An error occurred");
	}
	return response.json();
}

async function fetchGroups(): Promise<GroupResponse[]> {
	const response = await fetch("/api/groups");
	return handleResponse<GroupResponse[]>(response);
}

async function createGroup(data: CreateGroupInput): Promise<GroupResponse> {
	const response = await fetch("/api/groups", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
	return handleResponse<GroupResponse>(response);
}

async function updateGroup(
	id: string,
	data: UpdateGroupInput,
): Promise<GroupResponse> {
	const response = await fetch(`/api/groups/${id}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
	return handleResponse<GroupResponse>(response);
}

async function deleteGroup(id: string): Promise<void> {
	const response = await fetch(`/api/groups/${id}`, {
		method: "DELETE",
	});
	if (!response.ok) {
		const error: ApiError = await response.json();
		throw new Error(error.error || "An error occurred");
	}
}

export function useGroups(initialData?: GroupResponse[]) {
	return useQuery({
		queryKey: GROUPS_QUERY_KEY,
		queryFn: fetchGroups,
		initialData,
	});
}

export function useCreateGroup() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateGroupInput) => createGroup(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
		},
	});
}

export function useUpdateGroup() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateGroupInput }) =>
			updateGroup(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
		},
	});
}

export function useDeleteGroup() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => deleteGroup(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
		},
	});
}

// Group detail hooks
const groupDetailQueryKey = (id: string) => ["groups", id] as const;
const groupMembersQueryKey = (id: string) => ["groups", id, "members"] as const;
const groupInvitationsQueryKey = (id: string) =>
	["groups", id, "invitations"] as const;

async function fetchGroupDetail(id: string): Promise<GroupResponse> {
	const response = await fetch(`/api/groups/${id}`);
	return handleResponse<GroupResponse>(response);
}

async function fetchGroupMembers(id: string): Promise<MemberWithUser[]> {
	const response = await fetch(`/api/groups/${id}/members`);
	return handleResponse<MemberWithUser[]>(response);
}

async function fetchGroupInvitations(id: string): Promise<InvitationResponse[]> {
	const response = await fetch(`/api/groups/${id}/invitations`);
	return handleResponse<InvitationResponse[]>(response);
}

async function createInvitation(
	groupId: string,
	data: CreateInvitationInput,
): Promise<InvitationResponse> {
	const response = await fetch(`/api/groups/${groupId}/invitations`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
	return handleResponse<InvitationResponse>(response);
}

async function cancelInvitation(
	groupId: string,
	invitationId: string,
): Promise<void> {
	const response = await fetch(
		`/api/groups/${groupId}/invitations/${invitationId}`,
		{
			method: "DELETE",
		},
	);
	if (!response.ok) {
		const error: ApiError = await response.json();
		throw new Error(error.error || "An error occurred");
	}
}

async function removeMember(groupId: string, userId: string): Promise<void> {
	const response = await fetch(`/api/groups/${groupId}/members/${userId}`, {
		method: "DELETE",
	});
	if (!response.ok) {
		const error: ApiError = await response.json();
		throw new Error(error.error || "An error occurred");
	}
}

export function useGroupDetail(id: string, initialData?: GroupResponse) {
	return useQuery({
		queryKey: groupDetailQueryKey(id),
		queryFn: () => fetchGroupDetail(id),
		initialData,
	});
}

export function useGroupMembers(id: string, initialData?: MemberWithUser[]) {
	return useQuery({
		queryKey: groupMembersQueryKey(id),
		queryFn: () => fetchGroupMembers(id),
		initialData,
	});
}

export function useGroupInvitations(
	id: string,
	initialData?: InvitationResponse[],
	enabled = true,
) {
	return useQuery({
		queryKey: groupInvitationsQueryKey(id),
		queryFn: () => fetchGroupInvitations(id),
		initialData,
		enabled,
	});
}

export function useInviteMember(groupId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateInvitationInput) =>
			createInvitation(groupId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: groupInvitationsQueryKey(groupId),
			});
		},
	});
}

export function useCancelInvitation(groupId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (invitationId: string) =>
			cancelInvitation(groupId, invitationId),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: groupInvitationsQueryKey(groupId),
			});
		},
	});
}

export function useRemoveMember(groupId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (userId: string) => removeMember(groupId, userId),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: groupMembersQueryKey(groupId),
			});
		},
	});
}
