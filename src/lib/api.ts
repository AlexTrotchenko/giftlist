import type { CreateItemInput, UpdateItemInput } from "@/lib/validations/item";

export interface Item {
	id: string;
	ownerId: string;
	name: string;
	url: string | null;
	price: number | null;
	notes: string | null;
	imageUrl: string | null;
	createdAt: string | null;
	updatedAt: string | null;
}

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

export async function fetchItems(): Promise<Item[]> {
	const response = await fetch("/api/items");
	return handleResponse<Item[]>(response);
}

export async function createItem(data: CreateItemInput): Promise<Item> {
	const response = await fetch("/api/items", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
	return handleResponse<Item>(response);
}

export async function updateItem(
	id: string,
	data: UpdateItemInput,
): Promise<Item> {
	const response = await fetch(`/api/items/${id}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
	return handleResponse<Item>(response);
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
