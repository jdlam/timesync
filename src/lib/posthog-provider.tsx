"use client";

import posthog from "posthog-js";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ConsentBanner } from "@/components/ConsentBanner";
import { getPostHogConfig, type PostHogInitConfig } from "./analytics";
import {
	type ConsentChoice,
	getPostHogOptionsOverride,
	getStoredConsent,
	isEuUkVisitor,
	setStoredConsent,
} from "./consent";

let initialized = false;

/**
 * Initializes the PostHog client SDK from a resolved config (or no-ops if
 * `null`/already initialized). Takes config rather than reading env vars
 * itself so the EU/UK consent gate (see INSTRUMENTATION_PLAN.local.md §5/§9)
 * can control whether and when this is called, instead of PostHog
 * initializing as an inline module-load side effect.
 */
export function initPostHog(config: PostHogInitConfig | null): void {
	if (!config || initialized) {
		return;
	}
	posthog.init(config.apiKey, config.options);
	initialized = true;
}

/**
 * Resolves the base config to the consent choice's PostHog behavior and
 * initializes accordingly ("none" never initializes; see
 * `getPostHogOptionsOverride`).
 */
function initPostHogForChoice(
	choice: ConsentChoice,
	config: PostHogInitConfig | null,
): void {
	if (!config) {
		return;
	}
	const override = getPostHogOptionsOverride(choice);
	if (override === null) {
		return;
	}
	initPostHog({ ...config, options: { ...config.options, ...override } });
}

function resolvePostHogConfig(): PostHogInitConfig | null {
	return getPostHogConfig(
		import.meta.env.VITE_POSTHOG_KEY,
		import.meta.env.VITE_POSTHOG_HOST,
	);
}

/**
 * Initializes PostHog (if configured) on mount, gated by EU/UK consent per
 * INSTRUMENTATION_PLAN.local.md §4 Slice 9 / §5:
 * - Non-EU/UK visitors: no banner, PostHog initializes as before.
 * - EU/UK visitors with no stored choice: banner shows, PostHog does not
 *   initialize until a choice is made.
 * - EU/UK visitors with a stored choice: behavior applied immediately, banner
 *   never shown again.
 *
 * PostHog is optional overall - the app works without
 * `VITE_POSTHOG_KEY`/`VITE_POSTHOG_HOST` set.
 * - Unconfigured (no `VITE_POSTHOG_KEY`/`VITE_POSTHOG_HOST`): no banner is
 *   shown and no init occurs, regardless of visitor region.
 */
export function PostHogProvider({ children }: { children: ReactNode }) {
	const [needsConsent, setNeedsConsent] = useState(false);

	useEffect(() => {
		const config = resolvePostHogConfig();

		if (!config) {
			return;
		}

		if (!isEuUkVisitor()) {
			initPostHog(config);
			return;
		}

		const stored = getStoredConsent();
		if (stored) {
			initPostHogForChoice(stored, config);
			return;
		}

		setNeedsConsent(true);
	}, []);

	function handleChoice(choice: ConsentChoice) {
		setStoredConsent(choice);
		initPostHogForChoice(choice, resolvePostHogConfig());
		setNeedsConsent(false);
	}

	// TODO: no revocation UI yet (out of scope for Slice 9) — once a choice is
	// stored it can only be changed by clearing localStorage manually. A
	// future settings surface should let users revisit this choice.
	return (
		<>
			{children}
			{needsConsent && <ConsentBanner onChoice={handleChoice} />}
		</>
	);
}
