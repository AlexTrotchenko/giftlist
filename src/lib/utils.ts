import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function isExpiringSoon(expiresAt: string | null): boolean {
	if (!expiresAt) return false;
	const expiryDate = new Date(expiresAt);
	const now = new Date();
	const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
	return expiryDate.getTime() - now.getTime() < threeDaysMs;
}
