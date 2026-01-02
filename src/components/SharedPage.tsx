import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Gift } from "lucide-react";
import { useMemo, useState } from "react";
import { MyClaimsSection } from "@/components/MyClaimsSection";
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
import { LocaleProvider, type Locale } from "@/i18n/LocaleContext";
import * as m from "@/paraglide/messages";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 0, // Always refetch on invalidation
			refetchOnWindowFocus: true,
		},
	},
});

interface SharedPageProps {
	initialItems: SharedItem[];
	currentUserId: string;
	locale: Locale;
}

const ALL_GROUPS = "all";

function EmptyState() {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center">
			<div className="mb-4 rounded-full bg-muted p-4">
				<Gift className="size-8 text-muted-foreground" />
			</div>
			<h2 className="mb-2 text-xl font-semibold">{m.shared_emptyTitle()}</h2>
			<p className="max-w-sm text-muted-foreground">
				{m.shared_emptyDescription()}
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
			<h2 className="mb-2 text-xl font-semibold">{m.shared_noItemsInGroup()}</h2>
			<p className="max-w-sm text-muted-foreground">
				{m.shared_noItemsInGroupDescription({ groupName })}
			</p>
		</div>
	);
}

function SharedContent({ initialItems, currentUserId }: Omit<SharedPageProps, "locale">) {
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
			{/* My Claims section - shows items user has claimed */}
			<MyClaimsSection />

			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold">{m.shared_title()}</h1>
				{groups.length > 1 && (
					<Select value={selectedGroup} onValueChange={setSelectedGroup}>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder={m.shared_filterByGroup()} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={ALL_GROUPS}>{m.shared_allGroups()}</SelectItem>
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
						<SharedItemCard
							key={sharedItem.item.id}
							sharedItem={sharedItem}
							currentUserId={currentUserId}
						/>
					))}
				</div>
			)}
		</div>
	);
}

export function SharedPage({ initialItems, currentUserId, locale }: SharedPageProps) {
	return (
		<LocaleProvider initialLocale={locale}>
			<QueryClientProvider client={queryClient}>
				<SharedContent initialItems={initialItems} currentUserId={currentUserId} />
			</QueryClientProvider>
		</LocaleProvider>
	);
}
