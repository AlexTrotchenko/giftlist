import { Filter, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import * as m from "@/paraglide/messages";

interface MobileFiltersSheetProps {
	activeFilterCount: number;
	hasActiveFilters: boolean;
	onClearFilters: () => void;
	children: React.ReactNode;
}

/**
 * Mobile-only bottom sheet for filter controls.
 * - Shows filter button with active count badge (visible on mobile only)
 * - Opens bottom sheet with filter controls passed as children
 * - Desktop users see inline filters instead (hidden via sm:hidden on trigger)
 */
export function MobileFiltersSheet({
	activeFilterCount,
	hasActiveFilters,
	onClearFilters,
	children,
}: MobileFiltersSheetProps) {
	const [open, setOpen] = useState(false);

	return (
		<>
			{/* Mobile filter trigger button - hidden on sm+ */}
			<Button
				variant="outline"
				size="default"
				onClick={() => setOpen(true)}
				className="relative gap-2 sm:hidden"
				aria-label={
					hasActiveFilters
						? m.common_filtersWithCount({ count: activeFilterCount })
						: m.common_filters()
				}
			>
				<Filter
					className={`size-4 ${hasActiveFilters ? "text-primary" : ""}`}
				/>
				{m.common_filters()}
				{hasActiveFilters && (
					<span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
						{activeFilterCount}
					</span>
				)}
			</Button>

			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
					<SheetHeader className="pb-2">
						<SheetTitle className="flex items-center justify-between">
							<span className="flex items-center gap-2">
								<Filter className="size-5" />
								{m.common_filters()}
								{hasActiveFilters && (
									<span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
										{activeFilterCount}
									</span>
								)}
							</span>
							{hasActiveFilters && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => {
										onClearFilters();
									}}
									className="gap-1 text-muted-foreground"
								>
									<X className="size-3" />
									{m.common_clearAll()}
								</Button>
							)}
						</SheetTitle>
					</SheetHeader>

					{/* Filter controls - stacked vertically for mobile */}
					<div className="flex flex-col gap-3 py-4">{children}</div>

					{/* Apply button - closes sheet */}
					<div className="border-t pt-4">
						<Button
							className="w-full"
							onClick={() => setOpen(false)}
						>
							{m.common_applyFilters()}
						</Button>
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
}
