import type { PostHogConfig } from "posthog-js";

/**
 * EU/UK visitors' analytics consent choice, persisted in localStorage.
 * "necessary" maps to PostHog running with in-memory-only persistence (no
 * device-persistent storage); "none" means PostHog never initializes.
 */
export type ConsentChoice = "all" | "necessary" | "none";

export const CONSENT_STORAGE_KEY = "consentChoice";

const EU_UK_TIMEZONE_PREFIXES = ["Europe/"];
const EU_UK_TIMEZONES = [
	"Atlantic/Canary",
	"Atlantic/Madeira",
	"Atlantic/Azores",
];

/**
 * Timezone heuristic for EU/UK region detection (see
 * INSTRUMENTATION_PLAN.local.md §4 Slice 9). Deliberately over-inclusive
 * (e.g. Switzerland/Norway) — over-inclusion is the safe direction for a
 * consent gate, and this avoids a geo-IP dependency.
 */
export function isEuUkTimezone(timezone: string): boolean {
	return (
		EU_UK_TIMEZONE_PREFIXES.some((prefix) => timezone.startsWith(prefix)) ||
		EU_UK_TIMEZONES.includes(timezone)
	);
}

/** Whether the current visitor's browser timezone resolves to EU/UK. */
export function isEuUkVisitor(): boolean {
	return isEuUkTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
}

const VALID_CHOICES: ConsentChoice[] = ["all", "necessary", "none"];

function isConsentChoice(value: string): value is ConsentChoice {
	return VALID_CHOICES.includes(value as ConsentChoice);
}

/** Reads the persisted consent choice, or `null` if none is stored (or invalid). */
export function getStoredConsent(): ConsentChoice | null {
	const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
	if (stored && isConsentChoice(stored)) {
		return stored;
	}
	return null;
}

/**
 * Persists the consent choice itself. This is consent-exempt functional
 * storage, not analytics (see INSTRUMENTATION_PLAN.local.md §5).
 */
export function setStoredConsent(choice: ConsentChoice): void {
	localStorage.setItem(CONSENT_STORAGE_KEY, choice);
}

/**
 * Maps a consent choice to the PostHog config override to apply on top of
 * the standard Slice 1 config. Returns `null` if PostHog must not initialize
 * at all ("none").
 */
export function getPostHogOptionsOverride(
	choice: ConsentChoice,
): Partial<PostHogConfig> | null {
	switch (choice) {
		case "all":
			return {};
		case "necessary":
			return { persistence: "memory" };
		case "none":
			return null;
	}
}
