import { Gift, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ItemCard } from "@/components/ItemCard";

interface Item {
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

export function WishlistPage({ initialItems }: WishlistPageProps) {
	const [items, _setItems] = useState<Item[]>(initialItems);

	const handleAddItem = () => {
		// TODO: Open add item modal/form (giftlist-6dc will implement this)
		console.log("Add item clicked");
	};

	const handleEditItem = (item: Item) => {
		// TODO: Open edit item modal/form (giftlist-6dc will implement this)
		console.log("Edit item clicked", item.id);
	};

	const handleDeleteItem = (item: Item) => {
		// TODO: Implement delete confirmation dialog
		console.log("Delete item clicked", item.id);
	};

	if (items.length === 0) {
		return (
			<div className="container mx-auto max-w-screen-xl px-4 py-8">
				<EmptyState onAddItem={handleAddItem} />
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
		</div>
	);
}
