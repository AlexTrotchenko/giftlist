import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createItem,
	deleteItem,
	fetchItems,
	type Item,
	updateItem,
} from "@/lib/api";
import type { CreateItemInput, UpdateItemInput } from "@/lib/validations/item";

const ITEMS_QUERY_KEY = ["items"] as const;

export function useItems(initialData?: Item[]) {
	return useQuery({
		queryKey: ITEMS_QUERY_KEY,
		queryFn: fetchItems,
		initialData,
	});
}

export function useCreateItem() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateItemInput) => createItem(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ITEMS_QUERY_KEY });
		},
	});
}

export function useUpdateItem() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateItemInput }) =>
			updateItem(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ITEMS_QUERY_KEY });
		},
	});
}

export function useDeleteItem() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) => deleteItem(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ITEMS_QUERY_KEY });
		},
	});
}
