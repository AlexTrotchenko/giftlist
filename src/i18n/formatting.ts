/**
 * Locale-aware formatting utilities for i18n.
 *
 * Uses native Intl API for optimal performance and proper localization.
 * All functions accept a locale parameter (en/uk) and map to BCP 47 locales.
 *
 * @example
 * import { formatPrice, formatDate, formatRelativeTime } from "@/i18n/formatting";
 * import { getLocale } from "@/i18n/LocaleContext";
 *
 * const locale = getLocale();
 * formatPrice(1999, locale);           // "$19.99" or "19,99 ₴"
 * formatDate(new Date(), locale);      // "January 2, 2025" or "2 січня 2025 р."
 * formatRelativeTime(-2, "day", locale); // "2 days ago" or "2 дні тому"
 */

import type { Locale } from "./LocaleContext";

/** Map language tags to BCP 47 locale identifiers */
const BCP47_LOCALES: Record<Locale, string> = {
	en: "en-US",
	uk: "uk-UA",
};

/**
 * Application currency - always USD.
 * Locale only affects formatting (symbol position, separators), not the currency itself.
 */
const APP_CURRENCY = "USD";

/**
 * Format a price in cents to a locale-aware currency string.
 * Always uses USD as the currency; locale only affects formatting
 * (decimal separator, grouping, symbol position).
 *
 * @param cents - Price in cents (e.g., 1999 for $19.99)
 * @param locale - Language tag (en or uk)
 * @returns Formatted currency string (e.g., "$19.99" or "19,99 USD")
 *
 * @example
 * formatPrice(1999, "en"); // "$19.99"
 * formatPrice(1999, "uk"); // "19,99 USD"
 */
export function formatPrice(cents: number, locale: Locale): string {
	const bcp47 = BCP47_LOCALES[locale];

	return new Intl.NumberFormat(bcp47, {
		style: "currency",
		currency: APP_CURRENCY,
	}).format(cents / 100);
}

/**
 * Format a date with full month name (e.g., "January 2, 2025").
 *
 * @param date - Date object or ISO string
 * @param locale - Language tag (en or uk)
 * @returns Formatted date string
 *
 * @example
 * formatDate(new Date("2025-01-02"), "en"); // "January 2, 2025"
 * formatDate(new Date("2025-01-02"), "uk"); // "2 січня 2025 р."
 */
export function formatDate(date: Date | string, locale: Locale): string {
	const dateObj = typeof date === "string" ? new Date(date) : date;
	const bcp47 = BCP47_LOCALES[locale];

	return new Intl.DateTimeFormat(bcp47, {
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(dateObj);
}

/**
 * Format a date in short form (e.g., "Jan 2").
 *
 * @param date - Date object or ISO string
 * @param locale - Language tag (en or uk)
 * @returns Short formatted date string
 *
 * @example
 * formatShortDate(new Date("2025-01-02"), "en"); // "Jan 2"
 * formatShortDate(new Date("2025-01-02"), "uk"); // "2 січ."
 */
export function formatShortDate(date: Date | string, locale: Locale): string {
	const dateObj = typeof date === "string" ? new Date(date) : date;
	const bcp47 = BCP47_LOCALES[locale];

	return new Intl.DateTimeFormat(bcp47, {
		month: "short",
		day: "numeric",
	}).format(dateObj);
}

type RelativeTimeUnit = Intl.RelativeTimeFormatUnit;

/**
 * Format a relative time (e.g., "2 days ago", "in 3 hours").
 *
 * @param value - Numeric value (negative for past, positive for future)
 * @param unit - Time unit (second, minute, hour, day, week, month, year)
 * @param locale - Language tag (en or uk)
 * @returns Relative time string
 *
 * @example
 * formatRelativeTime(-2, "day", "en");   // "2 days ago"
 * formatRelativeTime(-2, "day", "uk");   // "2 дні тому"
 * formatRelativeTime(-1, "day", "uk");   // "вчора"
 * formatRelativeTime(3, "hour", "en");   // "in 3 hours"
 */
export function formatRelativeTime(
	value: number,
	unit: RelativeTimeUnit,
	locale: Locale,
): string {
	const bcp47 = BCP47_LOCALES[locale];

	// numeric: "auto" gives natural language like "yesterday" instead of "1 day ago"
	return new Intl.RelativeTimeFormat(bcp47, {
		numeric: "auto",
	}).format(value, unit);
}

/**
 * Calculate and format relative time from a date.
 * Automatically selects appropriate unit (minutes, hours, days).
 *
 * @param date - Date object or ISO string
 * @param locale - Language tag (en or uk)
 * @returns Human-readable relative time string
 *
 * @example
 * // If now is Jan 2, 2025 10:00 AM:
 * formatTimeAgo(new Date("2025-01-02T09:55:00"), "en"); // "5 minutes ago"
 * formatTimeAgo(new Date("2025-01-01T10:00:00"), "en"); // "yesterday"
 * formatTimeAgo(new Date("2024-12-30T10:00:00"), "en"); // "3 days ago"
 */
export function formatTimeAgo(date: Date | string, locale: Locale): string {
	const dateObj = typeof date === "string" ? new Date(date) : date;
	const now = new Date();
	const diffMs = dateObj.getTime() - now.getTime();
	const diffSeconds = Math.round(diffMs / 1000);
	const diffMinutes = Math.round(diffMs / (1000 * 60));
	const diffHours = Math.round(diffMs / (1000 * 60 * 60));
	const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

	// Select appropriate unit based on magnitude
	if (Math.abs(diffSeconds) < 60) {
		return formatRelativeTime(0, "second", locale); // "now" / "зараз"
	}
	if (Math.abs(diffMinutes) < 60) {
		return formatRelativeTime(diffMinutes, "minute", locale);
	}
	if (Math.abs(diffHours) < 24) {
		return formatRelativeTime(diffHours, "hour", locale);
	}
	if (Math.abs(diffDays) < 7) {
		return formatRelativeTime(diffDays, "day", locale);
	}

	// For dates older than a week, show the full date
	return formatDate(dateObj, locale);
}

/**
 * Get human-readable expiration status text.
 *
 * @param expiresAt - Expiration date as ISO string
 * @param locale - Language tag (en or uk)
 * @returns Expiration status message
 *
 * @example
 * // If now is Jan 2, 2025:
 * getExpirationText("2025-01-01", "en"); // "Expired"
 * getExpirationText("2025-01-02", "en"); // "Expires today"
 * getExpirationText("2025-01-03", "en"); // "Expires tomorrow"
 * getExpirationText("2025-01-05", "en"); // "Expires in 3 days"
 */
export function getExpirationText(expiresAt: string, locale: Locale): string {
	const expiryDate = new Date(expiresAt);
	const now = new Date();

	// Reset times to compare just dates
	const expiryDay = new Date(
		expiryDate.getFullYear(),
		expiryDate.getMonth(),
		expiryDate.getDate(),
	);
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	const diffMs = expiryDay.getTime() - today.getTime();
	const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

	// Use translation keys for proper localization
	if (diffDays < 0) {
		return locale === "uk" ? "Закінчився" : "Expired";
	}
	if (diffDays === 0) {
		return locale === "uk" ? "Закінчується сьогодні" : "Expires today";
	}
	if (diffDays === 1) {
		return locale === "uk" ? "Закінчується завтра" : "Expires tomorrow";
	}

	// For 2+ days, use Intl.RelativeTimeFormat for proper pluralization
	const bcp47 = BCP47_LOCALES[locale];
	const rtf = new Intl.RelativeTimeFormat(bcp47, { numeric: "always" });
	const relativeTime = rtf.format(diffDays, "day");

	// Transform "in X days" to "Expires in X days"
	return locale === "uk"
		? `Закінчується ${relativeTime}`
		: `Expires ${relativeTime}`;
}

/**
 * Get BCP 47 locale string for the given language tag.
 * Useful when you need to pass locale to third-party libraries or Intl APIs directly.
 *
 * @param locale - Language tag (en or uk)
 * @returns BCP 47 locale string (en-US or uk-UA)
 */
export function getBCP47Locale(locale: Locale): string {
	return BCP47_LOCALES[locale];
}

/**
 * Get the application currency code.
 * Always returns USD as the application uses a single currency.
 *
 * @param _locale - Language tag (unused, kept for API compatibility)
 * @returns Currency code (USD)
 */
export function getCurrency(_locale: Locale): string {
	return APP_CURRENCY;
}
