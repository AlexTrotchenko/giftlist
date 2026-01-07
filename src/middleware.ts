import { clerkMiddleware, createRouteMatcher } from "@clerk/astro/server";
import { defineMiddleware, sequence } from "astro:middleware";
import { paraglideMiddleware } from "@/paraglide/server";

// API routes that don't need authentication
// Webhooks use their own verification (e.g., Clerk webhook signatures)
const isPublicApiRoute = createRouteMatcher(["/api/webhooks/(.*)"]);

// All API routes skip paraglide (they don't need locale handling)
const isApiRoute = createRouteMatcher(["/api(.*)"]);

// Locale middleware wraps requests with Paraglide's locale handling
// Skips API routes to avoid request body consumption
const localeMiddleware = defineMiddleware(async (context, next) => {
	// Skip paraglide for API routes - they don't need locale handling
	// and paraglide creates new Request() which can consume the body
	if (isApiRoute(context.request)) {
		return next();
	}
	return paraglideMiddleware(context.request, async ({ request, locale }) => {
		// Store locale in context for use by pages
		context.locals.locale = locale;
		// Continue with the modified request
		return next();
	});
});

// Auth middleware - only skip Clerk for public API routes with POST bodies
const authMiddleware = defineMiddleware((context, next) => {
	// Skip Clerk only for public API routes to avoid "Response body disturbed" error
	// Protected API routes still go through Clerk (GET requests don't have body issues)
	if (isPublicApiRoute(context.request)) {
		return next();
	}
	return clerkMiddleware()(context, next);
});

// Combine locale and auth middleware
export const onRequest = sequence(localeMiddleware, authMiddleware);
