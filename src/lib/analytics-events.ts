/**
 * Typed analytics event wrapper.
 *
 * Single entry point for client-side PostHog events. Call sites use
 * `trackEvent("event_name", { ... })` instead of raw `posthog.capture`
 * strings, so event names and properties are checked at compile time
 * against the schema in `INSTRUMENTATION_PLAN.local.md` §2 "Client-side
 * events".
 *
 * Only the client-side event table is covered here - the `server_*` events
 * in that same section are captured from Convex (see Slice 7), not from
 * this module.
 */

import posthog from "posthog-js";

export interface EventProperties {
	landing_cta_clicked: {
		ctaLocation: "hero" | "how_it_works" | "final_cta";
	};
	event_create_started: {
		eventMode: "times" | "dates";
		isAuthenticated: boolean;
	};
	event_create_mode_selected: {
		eventMode: "times" | "dates";
		previousMode: "times" | "dates";
	};
	event_create_tier_limit_hit: {
		limitType: "maxDates" | "maxDateSpanDays";
		tier: string;
		attemptedValue: number;
	};
	event_create_submitted: {
		eventMode: "times" | "dates";
		datePattern: string;
		isAuthenticated: boolean;
		hasPassword: boolean;
		notifyOnResponse: boolean;
	};
	event_create_completed: {
		eventId: string;
		eventMode: "times" | "dates";
		isAuthenticated: boolean;
	};
	event_create_failed: {
		errorMessage: string;
		eventMode: "times" | "dates";
	};
	event_page_viewed: {
		eventId: string;
		isReturningRespondent: boolean;
		eventMode: "times" | "dates";
	};
	event_password_required_shown: {
		eventId: string;
	};
	response_grid_interacted: {
		eventId: string;
		eventMode: "times" | "dates";
		interactionType?: "click" | "drag";
	};
	response_submit_attempted: {
		eventId: string;
		slotCount: number;
		hasComment: boolean;
	};
	response_submit_completed: {
		eventId: string;
		slotCount: number;
	};
	response_submit_failed: {
		eventId: string;
		errorType: "max_respondents" | "other";
	};
	response_edit_viewed: {
		eventId: string;
	};
	admin_dashboard_viewed: {
		eventId: string;
		responseCount: number;
		isReturningView?: boolean;
	};
	admin_csv_exported: {
		eventId: string;
		responseCount: number;
	};
	admin_event_deleted: {
		eventId: string;
		responseCount: number;
	};
	pricing_page_viewed: {
		isAuthenticated: boolean;
		isPremium: boolean;
		referrerContext: string;
	};
	pricing_upgrade_clicked: {
		isAuthenticated: boolean;
	};
	checkout_started: Record<string, never>;
	checkout_canceled: Record<string, never>;
}

export type EventName = keyof EventProperties;

/**
 * Tracks a typed analytics event via PostHog. Overloaded so events with no
 * properties (`checkout_started`, `checkout_canceled`) can be called with a
 * single argument, while all other events require their properties object.
 *
 * Safe no-op if PostHog was never initialized (env vars absent, per Slice 1)
 * - checked via `posthog.__loaded` rather than tracking init state locally,
 * so this stays in sync with whatever `initPostHog` (posthog-provider.tsx)
 * or a future consent gate (Slice 9) actually did, instead of duplicating
 * that state.
 */
export function trackEvent<K extends EventName>(
	...args: Record<string, never> extends EventProperties[K]
		? [name: K, properties?: EventProperties[K]]
		: [name: K, properties: EventProperties[K]]
): void {
	if (!posthog.__loaded) {
		return;
	}

	const [name, properties] = args;
	posthog.capture(name, properties);
}
