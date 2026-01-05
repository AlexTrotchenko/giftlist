import { useEffect } from "react";

interface UseQuickAddShortcutProps {
	onTrigger: () => void;
	disabled?: boolean;
}

/**
 * Global keyboard shortcut for quick add functionality.
 * Triggers on 'n' (new) or 'a' (add) key press.
 * Respects form inputs and disabled state.
 */
export function useQuickAddShortcut({
	onTrigger,
	disabled = false,
}: UseQuickAddShortcutProps) {
	useEffect(() => {
		if (disabled) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			// Ignore if user is typing in an input, textarea, or contenteditable
			const target = event.target as HTMLElement;
			const isEditableElement =
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable ||
				target.closest('[role="dialog"]');

			if (isEditableElement) return;

			// Ignore if modifier keys are pressed (allows Ctrl+N, Cmd+N etc.)
			if (event.ctrlKey || event.metaKey || event.altKey) return;

			// Trigger on 'n' (new) or 'a' (add)
			if (event.key === "n" || event.key === "a") {
				event.preventDefault();
				onTrigger();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onTrigger, disabled]);
}
