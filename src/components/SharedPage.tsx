import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Gift } from "lucide-react";
import { useMemo, useState } from "react";
import { SharedItemCard } from "@/components/SharedItemCard";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { SharedItem } from "@/hooks/useSharedItems";
import { useSharedItems } from "@/hooks/useSharedItems";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5,
			refetchOnWindowFocus: false,
		},
	},
});

interface SharedPageProps {
	initialItems: SharedItem[];
}

const ALL_GROUPS = "all";

function EmptyState() {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center">
			<div className="mb-4 rounded-full bg-muted p-4">
				<Gift className="size-8 text-muted-foreground" />
			</div>
			<h2 className="mb-2 text-xl font-semibold">No shared items yet</h2>
			<p className="max-w-sm text-muted-foreground">
				When friends share their wishlists with your groups, their items will
				appear here.
			</p>
		</div>
	);
}

function FilteredEmptyState({ groupName }: { groupName: string }) {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center">
			<div className="mb-4 rounded-full bg-muted p-4">
				<Gift className="size-8 text-muted-foreground" />
			</div>
			<h2 className="mb-2 text-xl font-semibold">No items in this group</h2>
			<p className="max-w-sm text-muted-foreground">
				No one has shared items with {groupName} yet.
			</p>
		</div>
	);
}

function SharedContent({ initialItems }: SharedPageProps) {
	const { data: items = [] } = useSharedItems(initialItems);
	const [selectedGroup, setSelectedGroup] = useState<string>(ALL_GROUPS);

	// Extract unique groups from all items
	const groups = useMemo(() => {
		const groupMap = new Map<string, string>();
		for (const item of items) {
			for (const group of item.sharedVia) {
				groupMap.set(group.groupId, group.groupName);
			}
		}
		return Array.from(groupMap.entries()).map(([id, name]) => ({
			id,
			name,
		}));
	}, [items]);

	// Filter items by selected group
	const filteredItems = useMemo(() => {
		if (selectedGroup === ALL_GROUPS) {
			return items;
		}
		return items.filter((item) =>
			item.sharedVia.some((group) => group.groupId === selectedGroup),
		);
	}, [items, selectedGroup]);

	// No items at all
	if (items.length === 0) {
		return (
			<div className="container mx-auto max-w-screen-xl px-4 py-8">
				<EmptyState />
			</div>
		);
	}

	const selectedGroupName =
		groups.find((g) => g.id === selectedGroup)?.name || "";

	return (
		<div className="container mx-auto max-w-screen-xl px-4 py-8">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold">Shared With Me</h1>
				{groups.length > 1 && (
					<Select value={selectedGroup} onValueChange={setSelectedGroup}>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder="Filter by group" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={ALL_GROUPS}>All Groups</SelectItem>
							{groups.map((group) => (
								<SelectItem key={group.id} value={group.id}>
									{group.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}
			</div>

			{filteredItems.length === 0 ? (
				<FilteredEmptyState groupName={selectedGroupName} />
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{filteredItems.map((sharedItem) => (
						<SharedItemCard key={sharedItem.item.id} sharedItem={sharedItem} />
					))}
				</div>
			)}
		</div>
	);
}

export function SharedPage({ initialItems }: SharedPageProps) {
	return (
		<QueryClientProvider client={queryClient}>
			<SharedContent initialItems={initialItems} />
		</QueryClientProvider>
	);
}
