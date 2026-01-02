import {
	createContext,
	useContext,
	useState,
	useCallback,
	type ReactNode,
} from "react";
import {
	setLocale as setParaglideLocale,
	getLocale as getParaglideLocale,
	locales,
} from "@/paraglide/runtime";

/** Available locale tags from Paraglide config (en, uk) */
export type Locale = (typeof locales)[number];

interface LocaleContextValue {
	locale: Locale;
	setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

interface LocaleProviderProps {
	children: ReactNode;
	initialLocale: Locale;
}

/**
 * LocaleProvider wraps React islands to provide locale context.
 * Pass initialLocale from Astro for SSR hydration consistency.
 *
 * @example
 * // In Astro page:
 * <MyComponent client:load initialLocale="en" />
 *
 * // In React component:
 * export function MyComponent({ initialLocale }: { initialLocale: Locale }) {
 *   return (
 *     <LocaleProvider initialLocale={initialLocale}>
 *       <MyContent />
 *     </LocaleProvider>
 *   );
 * }
 */
export function LocaleProvider({ children, initialLocale }: LocaleProviderProps) {
	// Initialize Paraglide runtime with the server-provided locale (no reload)
	setParaglideLocale(initialLocale, { reload: false });

	const [locale, setLocaleState] = useState<Locale>(initialLocale);

	const setLocale = useCallback((newLocale: Locale) => {
		setParaglideLocale(newLocale, { reload: false });
		setLocaleState(newLocale);
	}, []);

	return (
		<LocaleContext.Provider value={{ locale, setLocale }}>
			{children}
		</LocaleContext.Provider>
	);
}

/**
 * Hook to access current locale and change it.
 * Must be used within a LocaleProvider.
 *
 * @example
 * function LanguageSwitcher() {
 *   const { locale, setLocale } = useLocale();
 *   return (
 *     <button onClick={() => setLocale(locale === 'en' ? 'uk' : 'en')}>
 *       {locale === 'en' ? '🇺🇦 Українська' : '🇬🇧 English'}
 *     </button>
 *   );
 * }
 */
export function useLocale(): LocaleContextValue {
	const context = useContext(LocaleContext);
	if (!context) {
		throw new Error("useLocale must be used within a LocaleProvider");
	}
	return context;
}

/**
 * Get current locale directly from Paraglide runtime.
 * Useful for components that only need to read the locale without reactivity.
 */
export function getLocale(): Locale {
	return getParaglideLocale() as Locale;
}
