import { useState, useEffect, useCallback } from "react";

/**
 * Type guard function signature for validating parsed values
 */
type TypeGuard<T> = (value: unknown) => value is T;

/**
 * SSR-safe localStorage hook with type safety.
 *
 * Pattern follows ThemeSwitcher.tsx for hydration safety:
 * - Initial render uses defaultValue (matches server)
 * - useEffect hydrates from localStorage after mount
 * - Changes persist to localStorage immediately
 *
 * @param key - localStorage key
 * @param defaultValue - fallback value (used on server and when no stored value)
 * @param typeGuard - optional validation function for parsed values
 */
export function useLocalStorage<T>(
	key: string,
	defaultValue: T,
	typeGuard?: TypeGuard<T>,
): [T, (value: T | ((prev: T) => T)) => void] {
	// Initialize with defaultValue for SSR safety (matches server render)
	const [storedValue, setStoredValue] = useState<T>(defaultValue);
	const [isHydrated, setIsHydrated] = useState(false);

	// Hydrate from localStorage after mount
	useEffect(() => {
		if (typeof window === "undefined") return;

		try {
			const item = window.localStorage.getItem(key);
			if (item !== null) {
				const parsed = JSON.parse(item) as unknown;
				// Validate with type guard if provided, otherwise trust the parsed value
				if (typeGuard) {
					if (typeGuard(parsed)) {
						setStoredValue(parsed);
					}
					// Invalid value - keep defaultValue
				} else {
					setStoredValue(parsed as T);
				}
			}
		} catch {
			// Invalid JSON or localStorage error - keep defaultValue
		}

		setIsHydrated(true);
	}, [key, typeGuard]);

	// Persist changes to localStorage
	const setValue = useCallback(
		(value: T | ((prev: T) => T)) => {
			try {
				const valueToStore =
					typeof value === "function"
						? (value as (prev: T) => T)(storedValue)
						: value;

				setStoredValue(valueToStore);

				if (typeof window !== "undefined") {
					window.localStorage.setItem(key, JSON.stringify(valueToStore));
				}
			} catch (error) {
				console.error(`Failed to save to localStorage key "${key}":`, error);
			}
		},
		[key, storedValue],
	);

	// Listen for storage events from other tabs
	useEffect(() => {
		if (typeof window === "undefined") return;

		const handleStorageChange = (e: StorageEvent) => {
			if (e.key === key && e.newValue !== null) {
				try {
					const parsed = JSON.parse(e.newValue) as unknown;
					if (typeGuard) {
						if (typeGuard(parsed)) {
							setStoredValue(parsed);
						}
					} else {
						setStoredValue(parsed as T);
					}
				} catch {
					// Invalid JSON - ignore
				}
			}
		};

		window.addEventListener("storage", handleStorageChange);
		return () => window.removeEventListener("storage", handleStorageChange);
	}, [key, typeGuard]);

	return [storedValue, setValue];
}
