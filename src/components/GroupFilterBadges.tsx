import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as m from "@/paraglide/messages";

interface Group {
	id: string;
	name: string;
}

interface GroupFilterBadgesProps {
	groups: Group[];
	selectedGroups: string[];
	onToggleGroup: (groupId: string) => void;
	onClearGroups: () => void;
	/** Element to render before the badges (e.g., filter button) */
	leadingElement?: React.ReactNode;
}

export function GroupFilterBadges({
	groups,
	selectedGroups,
	onToggleGroup,
	onClearGroups,
	leadingElement,
}: GroupFilterBadgesProps) {
	const hasGroups = groups.length > 1;
	const isAllSelected = selectedGroups.length === 0;

	// If no groups and no leading element, don't render
	if (!hasGroups && !leadingElement) return null;

	return (
		<div
			className="relative -mx-4 mb-4 px-4"
			role="group"
			aria-label={m.shared_groupFilterBadges()}
		>
			{/* Scrollable container with hidden scrollbar */}
			<div
				className="scrollbar-none flex gap-2 overflow-x-auto pb-2"
			>
				{leadingElement}
				{hasGroups && (
					<>
						<Button
							variant={isAllSelected ? "default" : "secondary"}
							size="sm"
							aria-pressed={isAllSelected}
							onClick={onClearGroups}
							className="shrink-0 rounded-full"
						>
							{m.shared_allGroups()}
						</Button>
						{groups.map((group) => {
							const isSelected = selectedGroups.includes(group.id);
							return (
								<Button
									key={group.id}
									variant={isSelected ? "default" : "secondary"}
									size="sm"
									aria-pressed={isSelected}
									onClick={() => onToggleGroup(group.id)}
									className="shrink-0 rounded-full"
								>
									{group.name}
									{isSelected && <X className="ml-1 size-3" aria-hidden="true" />}
								</Button>
							);
						})}
					</>
				)}
			</div>
			{/* Right fade hint for scrollability */}
			<div
				className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-background to-transparent"
				aria-hidden="true"
			/>
		</div>
	);
}
