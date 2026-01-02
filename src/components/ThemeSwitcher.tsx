import { Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

type Mode = "light" | "dark";

export function ThemeSwitcher() {
	const [mode, setMode] = useState<Mode | null>(null);

	useEffect(() => {
		const savedMode = (localStorage.getItem("color-mode") as Mode) || "dark";
		setMode(savedMode);
	}, []);

	const toggleMode = () => {
		const root = document.documentElement;
		const newMode = mode === "dark" ? "light" : "dark";
		root.classList.remove("dark", "light");
		root.classList.add(newMode);
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
		<Button
			variant="ghost"
			size="icon"
			onClick={toggleMode}
			className="relative size-8 overflow-hidden"
		>
			<Sun
				className={`absolute size-5 transition-all duration-500 ease-in-out ${
					mode === "dark"
						? "rotate-90 scale-0 opacity-0"
						: "rotate-0 scale-100 opacity-100"
				}`}
			/>
			<Moon
				className={`absolute size-5 transition-all duration-500 ease-in-out ${
					mode === "dark"
						? "rotate-0 scale-100 opacity-100"
						: "-rotate-90 scale-0 opacity-0"
				}`}
			/>
			<span className="sr-only">Toggle theme</span>
		</Button>
	);
}
