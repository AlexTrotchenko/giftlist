import { m, AnimatePresence } from "@/components/MotionProvider";
import type { Variants } from "framer-motion";

/**
 * MD3 timing tokens from global.css:
 * - Enter: 150-200ms with ease-decelerate
 * - Exit: 75-100ms with ease-accelerate
 * - Stagger: 50ms between items
 */
const itemVariants: Variants = {
	hidden: {
		opacity: 0,
		y: 20,
	},
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			duration: 0.15, // 150ms enter
			ease: [0.0, 0.0, 0, 1.0], // ease-decelerate
		},
	},
	exit: {
		opacity: 0,
		x: -20,
		transition: {
			duration: 0.1, // 100ms exit
			ease: [0.3, 0.0, 1, 1], // ease-accelerate
		},
	},
};

interface AnimatedListProps<T> {
	/** Array of items to render */
	items: T[];
	/** Function to extract unique key from each item */
	keyExtractor: (item: T) => string;
	/** Render function for each item */
	renderItem: (item: T, index: number) => React.ReactNode;
	/** Optional className for the container */
	className?: string;
	/** Stagger delay between items in seconds (default: 0.05) */
	staggerDelay?: number;
	/** Skip initial animation on mount (default: false) */
	skipInitial?: boolean;
}

/**
 * AnimatedList provides staggered enter/exit animations for list items.
 * Uses framer-motion's AnimatePresence with popLayout mode for smooth
 * reflow animations when items are added or removed.
 *
 * @example
 * <AnimatedList
 *   items={items}
 *   keyExtractor={(item) => item.id}
 *   renderItem={(item) => <ItemCard item={item} />}
 *   className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
 * />
 */
export function AnimatedList<T>({
	items,
	keyExtractor,
	renderItem,
	className,
	staggerDelay = 0.05,
	skipInitial = false,
}: AnimatedListProps<T>) {
	return (
		<div className={className}>
			<AnimatePresence mode="popLayout" initial={!skipInitial}>
				{items.map((item, index) => (
					<m.div
						key={keyExtractor(item)}
						variants={itemVariants}
						initial="hidden"
						animate="visible"
						exit="exit"
						transition={{ delay: index * staggerDelay }}
						layout
					>
						{renderItem(item, index)}
					</m.div>
				))}
			</AnimatePresence>
		</div>
	);
}
