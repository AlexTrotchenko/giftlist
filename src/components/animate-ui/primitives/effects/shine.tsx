import { cn } from "@/lib/utils";

interface ShineProps extends React.ComponentProps<"span"> {
	/** Color of the shine effect */
	color?: string;
	/** Opacity of the shine (0-1) */
	opacity?: number;
	/** Angle of the shine skew in degrees */
	deg?: number;
}

/**
 * CSS-based shine effect that continuously sweeps across.
 * Parent element must have `overflow-hidden relative`.
 * Respects prefers-reduced-motion via motion-safe prefix.
 *
 * @example
 * <button className="relative overflow-hidden">
 *   <Shine />
 *   Click me
 * </button>
 */
export function Shine({
	color = "white",
	opacity = 0.4,
	deg = -20,
	className,
	style,
	...props
}: ShineProps) {
	return (
		<span
			className={cn(
				"pointer-events-none absolute inset-0",
				"motion-safe:animate-shine",
				className,
			)}
			style={{
				background: `linear-gradient(90deg, transparent 0%, transparent 30%, ${color} 50%, transparent 70%, transparent 100%)`,
				opacity,
				"--shine-deg": `${deg}deg`,
				...style,
			} as React.CSSProperties}
			aria-hidden="true"
			{...props}
		/>
	);
}
