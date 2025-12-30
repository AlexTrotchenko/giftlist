import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GroupResponse } from "@/db/types";
import type {
	CreateGroupInput,
	UpdateGroupInput,
} from "@/lib/validations/group";

const GROUPS_QUERY_KEY = ["groups"] as const;

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
