import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Loader2, Plus, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import type { GroupResponse } from "@/db/types";
import * as m from "@/paraglide/messages";

interface RecipientsPickerProps {
	groups: GroupResponse[];
	selectedGroupIds: string[];
	onSelectedChange: (groupIds: string[]) => void;
	onCreateGroup?: (name: string) => Promise<GroupResponse>;
	isCreatingGroup?: boolean;
	disabled?: boolean;
}

export function RecipientsPicker({
	groups,
	selectedGroupIds,
	onSelectedChange,
	onCreateGroup,
	isCreatingGroup = false,
	disabled = false,
}: RecipientsPickerProps) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");

	const filteredGroups = useMemo(() => {
		const lowerSearch = search.toLowerCase();
		return groups.filter((group) =>
			group.name.toLowerCase().includes(lowerSearch),
		);
	}, [groups, search]);

	// Check if search term matches an existing group name exactly
	const exactMatch = useMemo(() => {
		const lowerSearch = search.toLowerCase().trim();
		return groups.some((group) => group.name.toLowerCase() === lowerSearch);
	}, [groups, search]);

	// Show create option when search has content and doesn't match existing group
	const showCreateOption = onCreateGroup && search.trim().length > 0 && !exactMatch;

	const handleCreateGroup = async () => {
		if (!onCreateGroup || !search.trim()) return;

		const newGroup = await onCreateGroup(search.trim());
		// Auto-select the newly created group
		onSelectedChange([...selectedGroupIds, newGroup.id]);
		setSearch("");
	};

	const selectedGroups = useMemo(() => {
		return groups.filter((g) => selectedGroupIds.includes(g.id));
	}, [groups, selectedGroupIds]);

	const toggleGroup = (groupId: string) => {
		if (selectedGroupIds.includes(groupId)) {
			onSelectedChange(selectedGroupIds.filter((id) => id !== groupId));
		} else {
			onSelectedChange([...selectedGroupIds, groupId]);
		}
	};

	const removeGroup = (groupId: string) => {
		onSelectedChange(selectedGroupIds.filter((id) => id !== groupId));
	};

	return (
		<div className="grid gap-2">
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						type="button"
						variant="outline"
						role="combobox"
						aria-expanded={open}
						className="w-full justify-between font-normal"
						disabled={disabled}
					>
						<span className="flex items-center gap-2 truncate">
							<Users className="size-4 shrink-0 opacity-50" />
							{selectedGroupIds.length > 0
								? `${selectedGroupIds.length} group${selectedGroupIds.length > 1 ? "s" : ""} selected`
								: "Select groups to share with..."}
						</span>
						<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent
					className="w-[var(--radix-popover-trigger-width)] p-0"
					side="top"
					sideOffset={4}
					collisionPadding={16}
				>
					<Command>
						<CommandInput
							placeholder={m.recipients_searchPlaceholder()}
							value={search}
							onValueChange={setSearch}
						/>
						<CommandList>
							{!showCreateOption && filteredGroups.length === 0 && (
								<CommandEmpty>{m.recipients_noGroupsFound()}</CommandEmpty>
							)}
							{showCreateOption && (
								<CommandGroup>
									<CommandItem
										onSelect={handleCreateGroup}
										disabled={isCreatingGroup}
										className="text-primary"
									>
										{isCreatingGroup ? (
											<Loader2 className="mr-2 size-4 animate-spin" />
										) : (
											<Plus className="mr-2 size-4" />
										)}
										<span>
											{m.recipients_createGroup({ name: search.trim() })}
										</span>
									</CommandItem>
								</CommandGroup>
							)}
							{filteredGroups.length > 0 && (
								<CommandGroup heading={m.groups_title()}>
									{filteredGroups.map((group) => (
										<CommandItem
											key={group.id}
											value={group.id}
											onSelect={() => toggleGroup(group.id)}
										>
											<Check
												className={cn(
													"mr-2 size-4",
													selectedGroupIds.includes(group.id)
														? "opacity-100"
														: "opacity-0",
												)}
											/>
											<Users className="mr-2 size-4 text-muted-foreground" />
											<span className="truncate">{group.name}</span>
										</CommandItem>
									))}
								</CommandGroup>
							)}
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>

			{selectedGroups.length > 0 && (
				<div className="flex flex-wrap gap-1">
					{selectedGroups.map((group) => (
						<Badge
							key={group.id}
							variant="secondary"
							className="gap-1 pr-1"
						>
							<span className="truncate">{group.name}</span>
							<button
								type="button"
								className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
								onClick={() => removeGroup(group.id)}
								aria-label={`Remove ${group.name}`}
								disabled={disabled}
							>
								<X className="size-3" />
							</button>
						</Badge>
					))}
				</div>
			)}
		</div>
	);
}
