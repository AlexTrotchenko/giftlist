import { Star } from "lucide-react";
import { useState, useCallback, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import * as m from "@/paraglide/messages";

interface StarRatingProps {
	value: number | null;
	onChange: (value: number | null) => void;
	max?: number;
	disabled?: boolean;
	size?: "sm" | "md";
}

export function StarRating({
	value,
	onChange,
	max = 5,
	disabled = false,
	size = "md",
}: StarRatingProps) {
	const [hoverValue, setHoverValue] = useState<number | null>(null);

	const displayValue = hoverValue ?? value ?? 0;

	const handleClick = useCallback(
		(starValue: number) => {
			if (disabled) return;
			// Toggle off if clicking the same value
			onChange(value === starValue ? null : starValue);
		},
		[disabled, onChange, value],
	);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent, starValue: number) => {
			if (disabled) return;

			switch (e.key) {
				case "ArrowRight":
				case "ArrowUp":
					e.preventDefault();
					if (starValue < max) {
						onChange(starValue + 1);
					}
					break;
				case "ArrowLeft":
				case "ArrowDown":
					e.preventDefault();
					if (starValue > 1) {
						onChange(starValue - 1);
					} else {
						onChange(null);
					}
					break;
				case "Home":
					e.preventDefault();
					onChange(1);
					break;
				case "End":
					e.preventDefault();
					onChange(max);
					break;
				case "Enter":
				case " ":
					e.preventDefault();
					handleClick(starValue);
					break;
				case "Backspace":
				case "Delete":
					e.preventDefault();
					onChange(null);
					break;
			}
		},
		[disabled, max, onChange, handleClick],
	);

	const sizeClasses = size === "sm" ? "size-4" : "size-5";
	const gapClasses = size === "sm" ? "gap-0.5" : "gap-1";

	return (
		<div
			role="group"
			aria-label={m.priority_ratingGroup()}
			className={cn("flex", gapClasses)}
		>
			{Array.from({ length: max }, (_, i) => i + 1).map((starValue) => {
				const isFilled = starValue <= displayValue;
				const isCurrentValue = starValue === (value ?? 0);

				return (
					<button
						key={starValue}
						type="button"
						onClick={() => handleClick(starValue)}
						onMouseEnter={() => !disabled && setHoverValue(starValue)}
						onMouseLeave={() => setHoverValue(null)}
						onKeyDown={(e) => handleKeyDown(e, starValue)}
						disabled={disabled}
						tabIndex={isCurrentValue || (value === null && starValue === 1) ? 0 : -1}
						aria-label={m.priority_starLabel({ count: starValue })}
						aria-pressed={starValue <= (value ?? 0)}
						className={cn(
							"rounded-sm p-0.5 transition-colors",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
							"disabled:pointer-events-none disabled:opacity-50",
							!disabled && "hover:scale-110 motion-safe:transition-transform",
						)}
					>
						<Star
							className={cn(
								sizeClasses,
								"transition-colors",
								isFilled
									? "fill-amber-400 text-amber-400"
									: "fill-transparent text-muted-foreground/40",
							)}
						/>
					</button>
				);
			})}
		</div>
	);
}
