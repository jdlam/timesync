"use client";

import posthog from "posthog-js";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { getPostHogConfig, type PostHogInitConfig } from "./analytics";

let initialized = false;

/**
 * Initializes the PostHog client SDK from a resolved config (or no-ops if
 * `null`/already initialized). Takes config rather than reading env vars
 * itself so a future consent gate (EU/UK — see
 * INSTRUMENTATION_PLAN.local.md §5/§9) can control whether and when this is
 * called, instead of PostHog initializing as an inline module-load side
 * effect.
 */
export function initPostHog(config: PostHogInitConfig | null): void {
	if (!config || initialized) {
		return;
	}
	posthog.init(config.apiKey, config.options);
	initialized = true;
}

/**
 * Initializes PostHog (if configured) on mount. PostHog is optional - the
 * app works without `VITE_POSTHOG_KEY`/`VITE_POSTHOG_HOST` set.
 */
export function PostHogProvider({ children }: { children: ReactNode }) {
	useEffect(() => {
		initPostHog(
			getPostHogConfig(
				import.meta.env.VITE_POSTHOG_KEY,
				import.meta.env.VITE_POSTHOG_HOST,
			),
		);
	}, []);

	return <>{children}</>;
}
