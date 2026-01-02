import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	locales,
	localizeHref,
	deLocalizeHref,
	cookieName,
	cookieMaxAge,
} from "@/paraglide/runtime";
import type { Locale } from "@/i18n/LocaleContext";

interface LanguageOption {
	value: Locale;
	label: string;
	flag: string;
}

const languages: LanguageOption[] = [
	{ value: "en", label: "English", flag: "\u{1F1EC}\u{1F1E7}" },
	{ value: "uk", label: "\u0423\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0430", flag: "\u{1F1FA}\u{1F1E6}" },
];

interface LanguageSwitcherProps {
	locale: Locale;
	currentPath?: string;
}

/**
 * Language switcher component using shadcn Select.
 * Displays current language with flag emoji and navigates to
 * locale-aware URLs on switch.
 *
 * @param locale - Current locale from Astro context
 * @param currentPath - Current URL path (defaults to window.location.pathname)
 */
export function LanguageSwitcher({ locale, currentPath }: LanguageSwitcherProps) {
	const currentLanguage = languages.find((lang) => lang.value === locale) ?? languages[0];

	const handleLocaleChange = (newLocale: string) => {
		if (newLocale === locale) return;

		// Get current path, removing any existing locale prefix
		const path = currentPath ?? (typeof window !== "undefined" ? window.location.pathname : "/");
		const basePath = deLocalizeHref(path);

		// Generate locale-aware URL
		const localizedPath = localizeHref(basePath, { locale: newLocale as Locale });

		// Set locale cookie for persistence
		if (typeof document !== "undefined") {
			document.cookie = `${cookieName}=${newLocale}; path=/; max-age=${cookieMaxAge}; SameSite=Lax`;
		}

		// Full page navigation to ensure SSR with new locale
		if (typeof window !== "undefined") {
			window.location.href = localizedPath;
		}
	};

	return (
		<Select value={locale} onValueChange={handleLocaleChange}>
			<SelectTrigger
				size="sm"
				className="w-auto gap-1.5 border-none bg-transparent px-2 shadow-none focus-visible:ring-0"
				aria-label="Select language"
			>
				<span className="text-base leading-none">{currentLanguage.flag}</span>
				<SelectValue className="sr-only">{currentLanguage.label}</SelectValue>
			</SelectTrigger>
			<SelectContent align="end">
				{languages.map((lang) => (
					<SelectItem key={lang.value} value={lang.value}>
						<span className="mr-2 text-base">{lang.flag}</span>
						{lang.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
