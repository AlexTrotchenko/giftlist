import { clerkMiddleware } from "@clerk/astro/server";
import { defineMiddleware, sequence } from "astro:middleware";
import { paraglideMiddleware } from "@/paraglide/server";

// Locale middleware wraps requests with Paraglide's locale handling
const localeMiddleware = defineMiddleware(async (context, next) => {
	return paraglideMiddleware(context.request, async ({ request, locale }) => {
		// Store locale in context for use by pages
		context.locals.locale = locale;
		// Continue with the modified request
		return next();
	});
});

// Combine locale and auth middleware
export const onRequest = sequence(localeMiddleware, clerkMiddleware());
