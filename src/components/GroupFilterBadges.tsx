import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as m from "@/paraglide/messages";

interface Group {
	id: string;
	name: string;
}

interface GroupFilterBadgesProps {
	groups: Group[];
	selectedGroup: string;
	onSelectGroup: (groupId: string) => void;
	allGroupsValue: string;
}

export function GroupFilterBadges({
	groups,
	selectedGroup,
	onSelectGroup,
	allGroupsValue,
}: GroupFilterBadgesProps) {
	// Don't render if there's only one or no groups
	if (groups.length <= 1) return null;

	return (
		<div
			className="-mx-4 mb-4 overflow-x-auto px-4"
			role="group"
			aria-label={m.shared_groupFilterBadges()}
		>
			<div className="flex gap-2 pb-2">
				<Button
					variant={selectedGroup === allGroupsValue ? "default" : "secondary"}
					size="sm"
					role="checkbox"
					aria-checked={selectedGroup === allGroupsValue}
					onClick={() => onSelectGroup(allGroupsValue)}
					className="shrink-0 rounded-full"
				>
					{m.shared_allGroups()}
				</Button>
				{groups.map((group) => {
					const isSelected = selectedGroup === group.id;
					return (
						<Button
							key={group.id}
							variant={isSelected ? "default" : "secondary"}
							size="sm"
							role="checkbox"
							aria-checked={isSelected}
							onClick={() =>
								onSelectGroup(isSelected ? allGroupsValue : group.id)
							}
							className="shrink-0 rounded-full"
						>
							{group.name}
							{isSelected && <X className="ml-1 size-3" aria-hidden="true" />}
						</Button>
					);
				})}
			</div>
		</div>
	);
}
