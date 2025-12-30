import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Gift, Plus } from "lucide-react";
import { useState } from "react";
import { ItemCard } from "@/components/ItemCard";
import { ItemFormDialog } from "@/components/ItemFormDialog";
import { Button } from "@/components/ui/button";
import { useDeleteItem, useItems } from "@/hooks/useItems";
import type { Item } from "@/lib/api";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5,
			refetchOnWindowFocus: false,
		},
	},
});

interface WishlistPageProps {
	initialItems: Item[];
}

function EmptyState({ onAddItem }: { onAddItem: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center">
			<div className="mb-4 rounded-full bg-muted p-4">
				<Gift className="size-8 text-muted-foreground" />
			</div>
			<h2 className="mb-2 text-xl font-semibold">Your wishlist is empty</h2>
			<p className="mb-6 max-w-sm text-muted-foreground">
				Start adding items you'd love to receive. Share your list with friends
				and family to make gift-giving easier.
			</p>
			<Button onClick={onAddItem}>
				<Plus className="size-4" />
				Add your first item
			</Button>
		</div>
	);
}

function WishlistContent({ initialItems }: WishlistPageProps) {
	const { data: items = [] } = useItems(initialItems);
	const deleteItem = useDeleteItem();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<Item | null>(null);

	const handleAddItem = () => {
		setEditingItem(null);
		setDialogOpen(true);
	};

	const handleEditItem = (item: Item) => {
		setEditingItem(item);
		setDialogOpen(true);
	};

	const handleDeleteItem = async (item: Item) => {
		if (window.confirm(`Delete "${item.name}"?`)) {
			await deleteItem.mutateAsync(item.id);
		}
	};

	if (items.length === 0) {
		return (
			<div className="container mx-auto max-w-screen-xl px-4 py-8">
				<EmptyState onAddItem={handleAddItem} />
				<ItemFormDialog
					open={dialogOpen}
					onOpenChange={setDialogOpen}
					item={editingItem}
				/>
			</div>
		);
	}

	return (
		<div className="container mx-auto max-w-screen-xl px-4 py-8">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold">My Wishlist</h1>
				<Button onClick={handleAddItem}>
					<Plus className="size-4" />
					Add Item
				</Button>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{items.map((item) => (
					<ItemCard
						key={item.id}
						item={item}
						onEdit={handleEditItem}
						onDelete={handleDeleteItem}
					/>
				))}
			</div>

			<ItemFormDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				item={editingItem}
			/>
		</div>
	);
}

export function WishlistPage({ initialItems }: WishlistPageProps) {
	return (
		<QueryClientProvider client={queryClient}>
			<WishlistContent initialItems={initialItems} />
		</QueryClientProvider>
	);
}
