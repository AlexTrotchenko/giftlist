import { Filter, SlidersHorizontal } from "lucide-react";
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
	isHydrated?: boolean;
	onClearFilters: () => void;
	children: React.ReactNode;
	/** Sort control to render inside the sheet (hidden on desktop) */
	sortControl?: React.ReactNode;
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
	isHydrated = true,
	onClearFilters,
	children,
	sortControl,
}: MobileFiltersSheetProps) {
	const [open, setOpen] = useState(false);
	// Only show active filter indicators after hydration to prevent mismatch
	const showActiveState = isHydrated && hasActiveFilters;

	return (
		<>
			{/* Mobile filter/sort trigger button - hidden on sm+ */}
			<Button
				variant="outline"
				size="sm"
				onClick={() => setOpen(true)}
				className="shrink-0 gap-1.5 rounded-full sm:hidden"
				aria-label={
					showActiveState
						? m.common_filtersWithCount({ count: activeFilterCount })
						: m.common_filters()
				}
			>
				<SlidersHorizontal
					className={`size-4 ${showActiveState ? "text-primary" : ""}`}
				/>
				{showActiveState && (
					<span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
						{activeFilterCount}
					</span>
				)}
			</Button>

			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto px-6">
					<SheetHeader className="pb-2">
						<SheetTitle className="flex items-center justify-between pr-10">
							<span className="flex items-center gap-2">
								<SlidersHorizontal className="size-5" />
								{m.common_sortAndFilter()}
							</span>
							{showActiveState && (
								<button
									type="button"
									onClick={onClearFilters}
									className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-destructive hover:underline"
								>
									{m.common_clearAll()}
								</button>
							)}
						</SheetTitle>
					</SheetHeader>

					<div className="flex flex-col gap-4 py-4">
						{/* Sort control */}
						{sortControl && (
							<div className="flex flex-col gap-1.5">
								<label className="text-sm font-medium text-muted-foreground">
									{m.common_sortBy()}
								</label>
								{sortControl}
							</div>
						)}

						{/* Filter controls */}
						<div className="flex flex-col gap-1.5">
							<div className="flex items-center justify-between">
								<label className="text-sm font-medium text-muted-foreground">
									{m.common_filters()}
								</label>
								{showActiveState && (
									<span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
										{activeFilterCount}
									</span>
								)}
							</div>
							<div className="flex flex-col gap-3">{children}</div>
						</div>
					</div>

					{/* Done button - closes sheet (filters apply instantly on change) */}
					<div className="border-t pt-4">
						<Button
							className="w-full"
							onClick={() => setOpen(false)}
						>
							{m.common_done()}
						</Button>
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
}
