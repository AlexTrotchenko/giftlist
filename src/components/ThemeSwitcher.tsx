import { Palette, Check, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
	DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const themes = [
	{ id: "default", label: "Default", icon: "○" },
	{ id: "catppuccin", label: "Catppuccin", icon: "🐱" },
	{ id: "gruvbox", label: "Gruvbox", icon: "🍂" },
	{ id: "aurora", label: "Aurora", icon: "🌌" },
	{ id: "forest", label: "Forest", icon: "🌲" },
	{ id: "twilight", label: "Twilight", icon: "🌆" },
	{ id: "rosegold", label: "Rose Gold", icon: "✨" },
] as const;

type ThemeId = (typeof themes)[number]["id"];
type Mode = "light" | "dark";

export function ThemeSwitcher() {
	const [currentTheme, setCurrentTheme] = useState<ThemeId>("default");
	const [mode, setMode] = useState<Mode>("dark");

	useEffect(() => {
		const savedTheme = localStorage.getItem("theme-variant") as ThemeId | null;
		const savedMode = localStorage.getItem("color-mode") as Mode | null;
		if (savedTheme) {
			setCurrentTheme(savedTheme);
		}
		if (savedMode) {
			setMode(savedMode);
		}
	}, []);

	const setTheme = (themeId: ThemeId) => {
		const root = document.documentElement;
		// Remove all theme classes
		root.classList.remove(
			"theme-catppuccin",
			"theme-gruvbox",
			"theme-aurora",
			"theme-forest",
			"theme-twilight",
			"theme-rosegold"
		);
		if (themeId !== "default") {
			root.classList.add(`theme-${themeId}`);
		}
		localStorage.setItem("theme-variant", themeId);
		setCurrentTheme(themeId);
	};

	const toggleMode = () => {
		const root = document.documentElement;
		const newMode = mode === "dark" ? "light" : "dark";
		root.classList.remove("dark", "light");
		root.classList.add(newMode);
		localStorage.setItem("color-mode", newMode);
		setMode(newMode);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="size-8">
					<Palette className="size-5" />
					<span className="sr-only">Switch theme</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-44">
				<DropdownMenuItem onClick={toggleMode} className="cursor-pointer">
					{mode === "dark" ? (
						<>
							<Sun className="mr-2 size-4" />
							Light Mode
						</>
					) : (
						<>
							<Moon className="mr-2 size-4" />
							Dark Mode
						</>
					)}
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuLabel className="text-xs text-muted-foreground">
					Color Theme
				</DropdownMenuLabel>
				{themes.map((theme) => (
					<DropdownMenuItem
						key={theme.id}
						onClick={() => setTheme(theme.id)}
						className="cursor-pointer"
					>
						<span className="mr-2">{theme.icon}</span>
						{theme.label}
						{currentTheme === theme.id && <Check className="ml-auto size-4" />}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
