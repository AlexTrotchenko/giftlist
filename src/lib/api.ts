import type { ItemResponse } from "@/db/types";
import type { CreateItemInput, UpdateItemInput } from "@/lib/validations/item";

export type { ItemResponse as Item } from "@/db/types";

export interface ApiError {
	error: string;
	details?: unknown;
}

async function handleResponse<T>(response: Response): Promise<T> {
	if (!response.ok) {
		const error: ApiError = await response.json();
		throw new Error(error.error || "An error occurred");
	}
	return response.json();
}

export async function fetchItems(): Promise<ItemResponse[]> {
	const response = await fetch("/api/items");
	return handleResponse<ItemResponse[]>(response);
}

export async function createItem(data: CreateItemInput): Promise<ItemResponse> {
	const response = await fetch("/api/items", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
	return handleResponse<ItemResponse>(response);
}

export async function updateItem(
	id: string,
	data: UpdateItemInput,
): Promise<ItemResponse> {
	const response = await fetch(`/api/items/${id}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
	return handleResponse<ItemResponse>(response);
}

export async function deleteItem(id: string): Promise<void> {
	const response = await fetch(`/api/items/${id}`, {
		method: "DELETE",
	});
	if (!response.ok) {
		const error: ApiError = await response.json();
		throw new Error(error.error || "An error occurred");
	}
}
