import { Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
	ThemeToggler,
	type Resolved,
} from "@/components/animate-ui/primitives/effects/theme-toggler";

type Mode = "light" | "dark";

export function ThemeSwitcher() {
	const [mode, setMode] = useState<Mode | null>(null);

	useEffect(() => {
		const savedMode = (localStorage.getItem("color-mode") as Mode) || "dark";
		setMode(savedMode);
	}, []);

	const handleSetTheme = (theme: "light" | "dark" | "system") => {
		// Our app only supports light/dark, not system
		const newMode = theme === "system" ? "dark" : theme;
		localStorage.setItem("color-mode", newMode);
		setMode(newMode);
	};

	// Don't render until we know the actual theme (prevents hydration mismatch)
	if (mode === null) {
		return (
			<Button
				variant="ghost"
				size="icon"
				className="relative size-8 overflow-hidden"
				disabled
			>
				<span className="sr-only">Loading theme</span>
			</Button>
		);
	}

	return (
		<ThemeToggler
			theme={mode}
			resolvedTheme={mode as Resolved}
			setTheme={handleSetTheme}
			direction="ltr"
		>
			{({ toggleTheme }) => (
				<Button
					variant="ghost"
					size="icon"
					onClick={() => toggleTheme(mode === "dark" ? "light" : "dark")}
					className="relative size-8 overflow-hidden"
				>
					<Sun
						className={`absolute size-5 motion-safe:transition-all motion-safe:duration-500 motion-safe:ease-in-out ${
							mode === "dark"
								? "rotate-90 scale-0 opacity-0"
								: "rotate-0 scale-100 opacity-100"
						}`}
					/>
					<Moon
						className={`absolute size-5 motion-safe:transition-all motion-safe:duration-500 motion-safe:ease-in-out ${
							mode === "dark"
								? "rotate-0 scale-100 opacity-100"
								: "-rotate-90 scale-0 opacity-0"
						}`}
					/>
					<span className="sr-only">Toggle theme</span>
				</Button>
			)}
		</ThemeToggler>
	);
}
