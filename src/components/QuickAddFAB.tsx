import { Plus } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { Shine } from "@/components/animate-ui/primitives/effects/shine";
import { Button } from "@/components/ui/button";
import * as m from "@/paraglide/messages";

interface QuickAddFABProps {
	onClick: () => void;
	dialogOpen?: boolean;
}

// Track if icon animation is playing to allow re-triggering
function useIconAnimation() {
	const [isAnimating, setIsAnimating] = useState(false);
	const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

	const triggerAnimation = useCallback(() => {
		// Clear any existing timeout
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}
		// Reset to allow re-trigger
		setIsAnimating(false);
		// Use requestAnimationFrame to ensure state reset is applied
		requestAnimationFrame(() => {
			setIsAnimating(true);
			// Reset after animation completes (150ms)
			timeoutRef.current = setTimeout(() => {
				setIsAnimating(false);
			}, 150);
		});
	}, []);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	return { isAnimating, triggerAnimation };
}

/**
 * Floating Action Button for quick add on mobile devices.
 * - Shows only on mobile (<768px via md:hidden)
 * - 48dp touch target for accessibility (MD3 spec)
 * - Hides when scrolling down, shows when scrolling up
 * - Hides when any dialog is open
 */
export function QuickAddFAB({ onClick, dialogOpen = false }: QuickAddFABProps) {
	const [isVisible, setIsVisible] = useState(true);
	const lastScrollYRef = useRef(0);
	const { isAnimating, triggerAnimation } = useIconAnimation();

	const handleClick = useCallback(() => {
		triggerAnimation();
		onClick();
	}, [triggerAnimation, onClick]);

	useEffect(() => {
		// Throttle scroll events for performance
		let ticking = false;

		const handleScroll = () => {
			const currentScrollY = window.scrollY;
			const lastScrollY = lastScrollYRef.current;
			const scrollThreshold = 100;

			// Show FAB when:
			// - At the top of the page (within threshold)
			// - Scrolling up
			// Hide FAB when:
			// - Scrolling down and past threshold
			if (currentScrollY < scrollThreshold) {
				setIsVisible(true);
			} else if (currentScrollY < lastScrollY) {
				// Scrolling up
				setIsVisible(true);
			} else if (currentScrollY > lastScrollY) {
				// Scrolling down
				setIsVisible(false);
			}

			lastScrollYRef.current = currentScrollY;
		};

		const onScroll = () => {
			if (!ticking) {
				window.requestAnimationFrame(() => {
					handleScroll();
					ticking = false;
				});
				ticking = true;
			}
		};

		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	// Hide FAB when dialog is open
	const shouldShow = isVisible && !dialogOpen;

	return (
		<div
			className={`
				fixed bottom-6 right-6 z-40 md:hidden
				motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-decelerate
				${shouldShow ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"}
			`}
		>
			<Button
				size="icon-lg"
				onClick={handleClick}
				aria-label={m.item_quickAdd()}
				className="group relative overflow-hidden rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 motion-safe:transition-all motion-safe:duration-200"
			>
				{/* Shine effect overlay - continuous sweep */}
				<Shine opacity={0.5} />
				{/* Ripple effect on press */}
				<span
					className="pointer-events-none absolute inset-0 rounded-full bg-white/20 opacity-0 scale-0 motion-safe:group-active:opacity-100 motion-safe:group-active:scale-100 motion-safe:transition-all motion-safe:duration-150"
					aria-hidden="true"
				/>
				<Plus
					className={`size-6 motion-safe:transition-transform ${isAnimating ? "motion-safe:animate-fab-press" : ""}`}
				/>
			</Button>
		</div>
	);
}
