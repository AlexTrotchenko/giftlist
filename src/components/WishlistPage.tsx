import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Gift, Plus } from "lucide-react";
import { useState } from "react";
import { ItemCard } from "@/components/ItemCard";
import { ItemFormDialog } from "@/components/ItemFormDialog";
import { Button } from "@/components/ui/button";
import { useDeleteItem, useItems } from "@/hooks/useItems";
import { LocaleProvider, type Locale } from "@/i18n/LocaleContext";
import type { Item } from "@/lib/api";
import * as m from "@/paraglide/messages";

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
	locale: Locale;
}

function EmptyState({ onAddItem }: { onAddItem: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center">
			<div className="mb-4 rounded-full bg-muted p-4">
				<Gift className="size-8 text-muted-foreground" />
			</div>
			<h2 className="mb-2 text-xl font-semibold">{m.wishlist_emptyTitle()}</h2>
			<p className="mb-6 max-w-sm text-muted-foreground">
				{m.wishlist_emptyDescription()}
			</p>
			<Button onClick={onAddItem}>
				<Plus className="size-4" />
				{m.wishlist_addFirstItem()}
			</Button>
		</div>
	);
}

function WishlistContent({ initialItems }: { initialItems: Item[] }) {
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
		if (window.confirm(m.wishlist_deleteConfirm({ name: item.name }))) {
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
				<h1 className="text-2xl font-bold">{m.wishlist_title()}</h1>
				<Button onClick={handleAddItem}>
					<Plus className="size-4" />
					{m.wishlist_addItem()}
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

export function WishlistPage({ initialItems, locale }: WishlistPageProps) {
	return (
		<LocaleProvider initialLocale={locale}>
			<QueryClientProvider client={queryClient}>
				<WishlistContent initialItems={initialItems} />
			</QueryClientProvider>
		</LocaleProvider>
	);
}
