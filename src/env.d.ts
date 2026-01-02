/// <reference types="@clerk/astro/env" />

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;
type Locale = import("@/paraglide/runtime").Locale;

declare namespace App {
	interface Locals extends Runtime {
		locale?: Locale;
	}
}
