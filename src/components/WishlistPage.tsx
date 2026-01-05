import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Gift, Plus } from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ItemCard } from "@/components/ItemCard";
import { ItemFormDialog } from "@/components/ItemFormDialog";
import { QuickAddFAB } from "@/components/QuickAddFAB";
import { QuickAddForm, type ExtractedData } from "@/components/QuickAddForm";
import { Button } from "@/components/ui/button";
import { useDeleteItem, useItems } from "@/hooks/useItems";
import { useQuickAddShortcut } from "@/hooks/useQuickAddShortcut";
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

function EmptyState({ onAddItem, onQuickAdd }: { onAddItem: () => void; onQuickAdd: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center">
			<div className="mb-4 rounded-full bg-muted p-4">
				<Gift className="size-8 text-muted-foreground" />
			</div>
			<h2 className="mb-2 text-xl font-semibold">{m.wishlist_emptyTitle()}</h2>
			<p className="mb-6 max-w-sm text-muted-foreground">
				{m.wishlist_emptyDescription()}
			</p>
			<div className="flex gap-2">
				<Button variant="outline" onClick={onQuickAdd}>
					<Plus className="size-4" />
					{m.item_quickAdd()}
				</Button>
				<Button onClick={onAddItem}>
					<Plus className="size-4" />
					{m.wishlist_addFirstItem()}
				</Button>
			</div>
		</div>
	);
}

function LoadingSkeleton() {
	return (
		<div className="container mx-auto max-w-screen-xl px-4 py-8">
			<div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="h-8 w-32 animate-pulse rounded bg-muted" />
				<div className="flex gap-2">
					<div className="h-9 w-24 animate-pulse rounded bg-muted" />
					<div className="h-9 w-24 animate-pulse rounded bg-muted" />
				</div>
			</div>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{[1, 2, 3].map((i) => (
					<div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
				))}
			</div>
		</div>
	);
}

function WishlistContent({ initialItems }: { initialItems: Item[] }) {
	const { data: items = [], isLoading } = useItems(initialItems);
	const deleteItem = useDeleteItem();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<Item | null>(null);
	const [quickAddOpen, setQuickAddOpen] = useState(false);
	const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
	const [deletingItem, setDeletingItem] = useState<Item | null>(null);

	const handleAddItem = () => {
		setEditingItem(null);
		setExtractedData(null);
		setDialogOpen(true);
	};

	const handleEditItem = (item: Item) => {
		setEditingItem(item);
		setExtractedData(null);
		setDialogOpen(true);
	};

	const handleDeleteItem = (item: Item) => {
		setDeletingItem(item);
	};

	const confirmDeleteItem = () => {
		if (!deletingItem) return;
		toast.promise(deleteItem.mutateAsync(deletingItem.id), {
			loading: m.item_deletingItem(),
			success: m.item_deleteSuccess(),
			error: (err) => err.message || m.errors_failedToSave(),
		});
	};

	const handleExtractComplete = (data: ExtractedData) => {
		setExtractedData(data);
		setEditingItem(null);
		setDialogOpen(true);
	};

	const handleDialogClose = (open: boolean) => {
		setDialogOpen(open);
		if (!open) {
			setExtractedData(null);
		}
	};

	// Stable callback for keyboard shortcut
	const openQuickAdd = useCallback(() => {
		setQuickAddOpen(true);
	}, []);

	// Check if any dialog is open (to disable FAB and keyboard shortcut)
	const anyDialogOpen = dialogOpen || quickAddOpen || !!deletingItem;

	// Global keyboard shortcut: 'n' or 'a' to open quick add
	useQuickAddShortcut({
		onTrigger: openQuickAdd,
		disabled: anyDialogOpen,
	});

	if (isLoading && !initialItems.length) {
		return <LoadingSkeleton />;
	}

	if (items.length === 0) {
		return (
			<div className="container mx-auto max-w-screen-xl px-4 py-8">
				<EmptyState onAddItem={handleAddItem} onQuickAdd={openQuickAdd} />
				<ItemFormDialog
					open={dialogOpen}
					onOpenChange={handleDialogClose}
					item={editingItem}
					defaultValues={extractedData ?? undefined}
				/>
				<QuickAddForm
					open={quickAddOpen}
					onOpenChange={setQuickAddOpen}
					onExtractComplete={handleExtractComplete}
				/>
				<ConfirmDialog
					open={!!deletingItem}
					onOpenChange={(open) => !open && setDeletingItem(null)}
					title={m.wishlist_deleteConfirm({ name: deletingItem?.name ?? "" })}
					onConfirm={confirmDeleteItem}
					destructive
				/>
				<QuickAddFAB onClick={openQuickAdd} dialogOpen={anyDialogOpen} />
			</div>
		);
	}

	return (
		<div className="container mx-auto max-w-screen-xl px-4 py-8">
			<div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="text-2xl font-bold">{m.wishlist_title()}</h1>
				<div className="flex gap-2">
					<Button variant="outline" onClick={openQuickAdd}>
						<Plus className="size-4" />
						{m.item_quickAdd()}
					</Button>
					<Button onClick={handleAddItem}>
						<Plus className="size-4" />
						{m.wishlist_addItem()}
					</Button>
				</div>
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
				onOpenChange={handleDialogClose}
				item={editingItem}
				defaultValues={extractedData ?? undefined}
			/>
			<QuickAddForm
				open={quickAddOpen}
				onOpenChange={setQuickAddOpen}
				onExtractComplete={handleExtractComplete}
			/>
			<ConfirmDialog
				open={!!deletingItem}
				onOpenChange={(open) => !open && setDeletingItem(null)}
				title={m.wishlist_deleteConfirm({ name: deletingItem?.name ?? "" })}
				onConfirm={confirmDeleteItem}
				destructive
			/>
			<QuickAddFAB onClick={openQuickAdd} dialogOpen={anyDialogOpen} />
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
