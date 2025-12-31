import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GroupResponse, ItemRecipientResponse } from "@/db/types";

interface RecipientWithGroup extends ItemRecipientResponse {
	group: {
		id: string;
		name: string;
	};
}

interface RecipientsResponse {
	data: RecipientWithGroup[];
}

interface AddRecipientsResponse {
	data: ItemRecipientResponse[];
	message: string;
}

interface RemoveRecipientsResponse {
	data: { deleted: number };
	message: string;
}

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

async function fetchItemRecipients(
	itemId: string,
): Promise<RecipientWithGroup[]> {
	const response = await fetch(`/api/items/${itemId}/recipients`);
	const result = await handleResponse<RecipientsResponse>(response);
	return result.data;
}

async function addItemRecipients(
	itemId: string,
	groupIds: string[],
): Promise<AddRecipientsResponse> {
	const response = await fetch(`/api/items/${itemId}/recipients`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ groupIds }),
	});
	return handleResponse<AddRecipientsResponse>(response);
}

async function removeItemRecipients(
	itemId: string,
	groupIds: string[],
): Promise<RemoveRecipientsResponse> {
	const response = await fetch(`/api/items/${itemId}/recipients`, {
		method: "DELETE",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ groupIds }),
	});
	return handleResponse<RemoveRecipientsResponse>(response);
}

function getRecipientsQueryKey(itemId: string) {
	return ["items", itemId, "recipients"] as const;
}

export function useItemRecipients(itemId: string | undefined) {
	return useQuery({
		queryKey: getRecipientsQueryKey(itemId ?? ""),
		queryFn: () => fetchItemRecipients(itemId!),
		enabled: !!itemId,
	});
}

export function useAddItemRecipients() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ itemId, groupIds }: { itemId: string; groupIds: string[] }) =>
			addItemRecipients(itemId, groupIds),
		onSuccess: (_, { itemId }) => {
			queryClient.invalidateQueries({
				queryKey: getRecipientsQueryKey(itemId),
			});
		},
	});
}

export function useRemoveItemRecipients() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ itemId, groupIds }: { itemId: string; groupIds: string[] }) =>
			removeItemRecipients(itemId, groupIds),
		onSuccess: (_, { itemId }) => {
			queryClient.invalidateQueries({
				queryKey: getRecipientsQueryKey(itemId),
			});
		},
	});
}

export function useSetItemRecipients() {
	const queryClient = useQueryClient();
	const addRecipients = useAddItemRecipients();
	const removeRecipients = useRemoveItemRecipients();

	return useMutation({
		mutationFn: async ({
			itemId,
			groupIds,
			currentGroupIds,
		}: {
			itemId: string;
			groupIds: string[];
			currentGroupIds: string[];
		}) => {
			const toAdd = groupIds.filter((id) => !currentGroupIds.includes(id));
			const toRemove = currentGroupIds.filter((id) => !groupIds.includes(id));

			const results = await Promise.all([
				toAdd.length > 0
					? addRecipients.mutateAsync({ itemId, groupIds: toAdd })
					: Promise.resolve(null),
				toRemove.length > 0
					? removeRecipients.mutateAsync({ itemId, groupIds: toRemove })
					: Promise.resolve(null),
			]);

			return results;
		},
		onSuccess: (_, { itemId }) => {
			queryClient.invalidateQueries({
				queryKey: getRecipientsQueryKey(itemId),
			});
		},
	});
}

export type { RecipientWithGroup };
