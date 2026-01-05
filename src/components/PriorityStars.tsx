import { Star } from "lucide-react";
import { memo } from "react";
import { cn } from "@/lib/utils";

interface PriorityStarsProps {
	priority: number | null;
	/** Maximum stars to display (default: 5) */
	max?: number;
	/** Size class for stars (default: "size-3") */
	size?: string;
	/** Show label text (default: false) */
	showLabel?: boolean;
	/** Custom className */
	className?: string;
}

/**
 * Displays priority as a row of filled/empty star icons.
 * Returns null if priority is null or 0 (no priority set).
 */
export const PriorityStars = memo(function PriorityStars({
	priority,
	max = 5,
	size = "size-3",
	showLabel = false,
	className,
}: PriorityStarsProps) {
	// Don't render if no priority set
	if (priority === null || priority === 0) {
		return null;
	}

	// Clamp priority to valid range
	const value = Math.max(1, Math.min(priority, max));
	const stars = Array.from({ length: max }, (_, i) => i < value);

	return (
		<span
			role="img"
			aria-label={`Priority: ${value} of ${max} stars`}
			className={cn("inline-flex items-center gap-0.5", className)}
		>
			{stars.map((filled, index) => (
				<Star
					key={index}
					aria-hidden="true"
					className={cn(
						size,
						"transition-colors",
						filled
							? "fill-amber-400 text-amber-400 dark:fill-amber-300 dark:text-amber-300"
							: "fill-transparent text-muted-foreground/40",
					)}
				/>
			))}
			{showLabel && (
				<span className="sr-only">
					{value} of {max} stars
				</span>
			)}
		</span>
	);
});
