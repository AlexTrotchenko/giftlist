// @ts-check

import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import clerk from "@clerk/astro";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	output: "server",

	// Astro i18n routing configuration
	i18n: {
		defaultLocale: "en",
		locales: ["en", "uk"],
		routing: {
			prefixDefaultLocale: false,
		},
	},

	adapter: cloudflare({
		platformProxy: {
			enabled: true,
		},
		imageService: "cloudflare",
		// Custom worker entrypoint to add scheduled handler for cron triggers
		workerEntryPoint: {
			path: "./src/worker-entrypoint.ts",
			namedExports: ["scheduled"],
		},
	}),

	integrations: [clerk(), react()],

	vite: {
		plugins: [
			tailwindcss(),
			paraglideVitePlugin({
				project: "./project.inlang",
				outdir: "./src/paraglide",
				// Cloudflare Workers don't support AsyncLocalStorage
				disableAsyncLocalStorage: true,
			}),
		],
		resolve: {
			dedupe: ["react", "react-dom"],
		},
	},
});
