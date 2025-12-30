import { useQuery } from "@tanstack/react-query";
import type { ItemResponse } from "@/db/types";

export const SHARED_ITEMS_QUERY_KEY = ["sharedItems"] as const;

export interface SharedItemOwner {
	id: string;
	name: string | null;
	email: string;
}

export interface SharedItemGroup {
	groupId: string;
	groupName: string;
}

export interface SharedItem {
	item: ItemResponse;
	owner: SharedItemOwner;
	sharedVia: SharedItemGroup[];
}

interface ApiError {
	error: string;
}

interface SharedItemsResponse {
	data: SharedItem[];
}

async function fetchSharedItems(): Promise<SharedItem[]> {
	const response = await fetch("/api/shared-items");
	if (!response.ok) {
		const error: ApiError = await response.json();
		throw new Error(error.error || "An error occurred");
	}
	const result: SharedItemsResponse = await response.json();
	return result.data;
}

export function useSharedItems(initialData?: SharedItem[]) {
	return useQuery({
		queryKey: SHARED_ITEMS_QUERY_KEY,
		queryFn: fetchSharedItems,
		initialData,
	});
}
