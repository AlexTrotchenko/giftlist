import { LazyMotion, domAnimation, MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

// Re-export m and AnimatePresence for use in components
export { m, AnimatePresence } from "framer-motion";

interface MotionProviderProps {
	children: ReactNode;
	/** Skip initial animations on mount (useful for SSR hydration) */
	reducedMotion?: "user" | "always" | "never";
}

/**
 * MotionProvider wraps components that need framer-motion animations.
 * Uses LazyMotion with domAnimation for optimized bundle size (~5KB vs ~34KB).
 *
 * The `strict` prop ensures we only use `m` components (not `motion`)
 * to maintain the bundle optimization.
 *
 * @example
 * // Wrap a page component
 * <MotionProvider>
 *   <AnimatedList items={items} />
 * </MotionProvider>
 *
 * // With reduced motion preference
 * <MotionProvider reducedMotion="user">
 *   <AnimatedContent />
 * </MotionProvider>
 */
export function MotionProvider({
	children,
	reducedMotion = "user",
}: MotionProviderProps) {
	return (
		<LazyMotion features={domAnimation} strict>
			<MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>
		</LazyMotion>
	);
}
