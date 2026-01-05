"use client";

import * as React from "react";
import { flushSync } from "react-dom";

type ThemeSelection = "light" | "dark" | "system";
type Resolved = "light" | "dark";
type Direction = "btt" | "ttb" | "ltr" | "rtl";

type ChildrenRender =
	| React.ReactNode
	| ((state: {
			resolved: Resolved;
			effective: ThemeSelection;
			toggleTheme: (theme: ThemeSelection) => void;
	  }) => React.ReactNode);

function getSystemEffective(): Resolved {
	if (typeof window === "undefined") return "light";
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

function getClipKeyframes(direction: Direction): [string, string] {
	switch (direction) {
		case "ltr":
			return ["inset(0 100% 0 0)", "inset(0 0 0 0)"];
		case "rtl":
			return ["inset(0 0 0 100%)", "inset(0 0 0 0)"];
		case "ttb":
			return ["inset(0 0 100% 0)", "inset(0 0 0 0)"];
		case "btt":
			return ["inset(100% 0 0 0)", "inset(0 0 0 0)"];
		default:
			return ["inset(0 100% 0 0)", "inset(0 0 0 0)"];
	}
}

type ThemeTogglerProps = {
	theme: ThemeSelection;
	resolvedTheme: Resolved;
	setTheme: (theme: ThemeSelection) => void;
	direction?: Direction;
	onImmediateChange?: (theme: ThemeSelection) => void;
	children?: ChildrenRender;
};

function ThemeToggler({
	theme,
	resolvedTheme,
	setTheme,
	onImmediateChange,
	direction = "ltr",
	children,
}: ThemeTogglerProps) {
	const [preview, setPreview] = React.useState<null | {
		effective: ThemeSelection;
		resolved: Resolved;
	}>(null);
	const [current, setCurrent] = React.useState<{
		effective: ThemeSelection;
		resolved: Resolved;
	}>({
		effective: theme,
		resolved: resolvedTheme,
	});

	React.useEffect(() => {
		if (
			preview &&
			theme === preview.effective &&
			resolvedTheme === preview.resolved
		) {
			setPreview(null);
		}
	}, [theme, resolvedTheme, preview]);

	const [fromClip, toClip] = getClipKeyframes(direction);

	const toggleTheme = React.useCallback(
		async (theme: ThemeSelection) => {
			const resolved = theme === "system" ? getSystemEffective() : theme;

			setCurrent({ effective: theme, resolved });
			onImmediateChange?.(theme);

			if (theme === "system" && resolved === resolvedTheme) {
				setTheme(theme);
				return;
			}

			// Check for reduced motion preference
			const prefersReducedMotion = window.matchMedia(
				"(prefers-reduced-motion: reduce)",
			).matches;

			if (!document.startViewTransition || prefersReducedMotion) {
				flushSync(() => {
					setPreview({ effective: theme, resolved });
					document.documentElement.classList.toggle("dark", resolved === "dark");
					document.documentElement.classList.toggle("light", resolved === "light");
				});
				setTheme(theme);
				return;
			}

			await document.startViewTransition(() => {
				flushSync(() => {
					setPreview({ effective: theme, resolved });
					document.documentElement.classList.toggle("dark", resolved === "dark");
					document.documentElement.classList.toggle("light", resolved === "light");
				});
			}).ready;

			document.documentElement
				.animate(
					{ clipPath: [fromClip, toClip] },
					{
						duration: 700,
						easing: "ease-in-out",
						pseudoElement: "::view-transition-new(root)",
					},
				)
				.finished.finally(() => {
					setTheme(theme);
				});
		},
		[onImmediateChange, resolvedTheme, fromClip, toClip, setTheme],
	);

	// Inject view-transition styles dynamically to avoid SSR hydration mismatch
	React.useEffect(() => {
		const styleId = "theme-toggler-view-transition";
		if (document.getElementById(styleId)) return;

		const style = document.createElement("style");
		style.id = styleId;
		style.textContent = `::view-transition-old(root), ::view-transition-new(root){animation:none;mix-blend-mode:normal;}`;
		document.head.appendChild(style);

		return () => {
			const existing = document.getElementById(styleId);
			if (existing) existing.remove();
		};
	}, []);

	return (
		<React.Fragment>
			{typeof children === "function"
				? children({
						effective: current.effective,
						resolved: current.resolved,
						toggleTheme,
					})
				: children}
		</React.Fragment>
	);
}

export {
	ThemeToggler,
	type ThemeTogglerProps,
	type ThemeSelection,
	type Resolved,
	type Direction,
};
