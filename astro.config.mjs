// @ts-check

import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import clerk from "@clerk/astro";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	output: "server",

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
		plugins: [tailwindcss()],
		resolve: {
			dedupe: ["react", "react-dom"],
		},
	},
});
