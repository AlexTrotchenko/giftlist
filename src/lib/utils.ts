import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatPrice(cents: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(cents / 100);
}

export function isExpiringSoon(expiresAt: string | null): boolean {
	if (!expiresAt) return false;
	const expiryDate = new Date(expiresAt);
	const now = new Date();
	const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
	return expiryDate.getTime() - now.getTime() < threeDaysMs;
}

export function getExpirationText(expiresAt: string): string {
	const expiryDate = new Date(expiresAt);
	const now = new Date();
	const diffMs = expiryDate.getTime() - now.getTime();
	const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

	if (diffDays <= 0) return "Expired";
	if (diffDays === 1) return "Expires tomorrow";
	return `Expires in ${diffDays} days`;
}
