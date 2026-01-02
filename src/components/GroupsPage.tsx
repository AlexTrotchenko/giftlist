import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import { useState } from "react";
import { GroupCard } from "@/components/GroupCard";
import { GroupFormDialog } from "@/components/GroupFormDialog";
import { Button } from "@/components/ui/button";
import { useDeleteGroup, useGroups } from "@/hooks/useGroups";
import type { GroupResponse } from "@/db/types";
import * as m from "@/paraglide/messages";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5,
			refetchOnWindowFocus: false,
		},
	},
});

interface GroupsPageProps {
	initialGroups: GroupResponse[];
}

function EmptyState({ onAddGroup }: { onAddGroup: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center">
			<div className="mb-4 rounded-full bg-muted p-4">
				<Users className="size-8 text-muted-foreground" />
			</div>
			<h2 className="mb-2 text-xl font-semibold">{m.groups_emptyTitle()}</h2>
			<p className="mb-6 max-w-sm text-muted-foreground">
				{m.groups_emptyDescription()}
			</p>
			<Button onClick={onAddGroup}>
				<Plus className="size-4" />
				{m.groups_createFirstGroup()}
			</Button>
		</div>
	);
}

function GroupsContent({ initialGroups }: GroupsPageProps) {
	const { data: groups = [] } = useGroups(initialGroups);
	const deleteGroup = useDeleteGroup();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingGroup, setEditingGroup] = useState<GroupResponse | null>(null);

	const handleAddGroup = () => {
		setEditingGroup(null);
		setDialogOpen(true);
	};

	const handleEditGroup = (group: GroupResponse) => {
		setEditingGroup(group);
		setDialogOpen(true);
	};

	const handleDeleteGroup = async (group: GroupResponse) => {
		if (window.confirm(m.groups_deleteConfirm({ name: group.name }))) {
			await deleteGroup.mutateAsync(group.id);
		}
	};

	if (groups.length === 0) {
		return (
			<div className="container mx-auto max-w-screen-xl px-4 py-8">
				<EmptyState onAddGroup={handleAddGroup} />
				<GroupFormDialog
					open={dialogOpen}
					onOpenChange={setDialogOpen}
					group={editingGroup}
				/>
			</div>
		);
	}

	return (
		<div className="container mx-auto max-w-screen-xl px-4 py-8">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold">{m.groups_title()}</h1>
				<Button onClick={handleAddGroup}>
					<Plus className="size-4" />
					{m.groups_createGroup()}
				</Button>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{groups.map((group) => (
					<GroupCard
						key={group.id}
						group={group}
						onEdit={handleEditGroup}
						onDelete={handleDeleteGroup}
					/>
				))}
			</div>

			<GroupFormDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				group={editingGroup}
			/>
		</div>
	);
}

export function GroupsPage({ initialGroups }: GroupsPageProps) {
	return (
		<QueryClientProvider client={queryClient}>
			<GroupsContent initialGroups={initialGroups} />
		</QueryClientProvider>
	);
}
