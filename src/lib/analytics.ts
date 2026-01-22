/**
 * Analytics utility for tracking events with Umami
 *
 * Umami is a privacy-focused, lightweight analytics service.
 * Events are only tracked if Umami is configured via environment variables.
 *
 * @see https://umami.is/docs/track-events
 */

// Umami types
declare global {
	interface Window {
		umami?: {
			track: (eventName: string, eventData?: Record<string, unknown>) => void;
		};
	}
}

/**
 * Event names for analytics tracking
 * Using a const object for type safety and autocomplete
 */
export const AnalyticsEvents = {
	// Event lifecycle
	EVENT_CREATED: "event_created",
	EVENT_VIEWED: "event_viewed",
	EVENT_EDITED: "event_edited",
	EVENT_DELETED: "event_deleted",

	// Response lifecycle
	RESPONSE_SUBMITTED: "response_submitted",
	RESPONSE_EDITED: "response_edited",

	// Sharing actions
	LINK_COPIED: "link_copied",

	// Admin actions
	ADMIN_DASHBOARD_VIEWED: "admin_dashboard_viewed",

	// User actions
	SIGNED_IN: "signed_in",
	SIGNED_OUT: "signed_out",
} as const;

export type AnalyticsEventName =
	(typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

/**
 * Event data types for each event
 */
interface EventDataMap {
	[AnalyticsEvents.EVENT_CREATED]: {
		dateCount: number;
		slotDuration: number;
		hasDescription: boolean;
		isAuthenticated: boolean;
	};
	[AnalyticsEvents.EVENT_VIEWED]: {
		responseCount: number;
	};
	[AnalyticsEvents.EVENT_EDITED]: {
		fieldsChanged: string[];
	};
	[AnalyticsEvents.EVENT_DELETED]: {
		responseCount: number;
	};
	[AnalyticsEvents.RESPONSE_SUBMITTED]: {
		slotsSelected: number;
		hasComment: boolean;
	};
	[AnalyticsEvents.RESPONSE_EDITED]: {
		slotsSelected: number;
	};
	[AnalyticsEvents.LINK_COPIED]: {
		linkType: "public" | "admin" | "edit";
	};
	[AnalyticsEvents.ADMIN_DASHBOARD_VIEWED]: {
		responseCount: number;
	};
	[AnalyticsEvents.SIGNED_IN]: Record<string, never>;
	[AnalyticsEvents.SIGNED_OUT]: Record<string, never>;
}

/**
 * Check if Umami is available and configured
 */
function isUmamiAvailable(): boolean {
	return typeof window !== "undefined" && typeof window.umami !== "undefined";
}

/**
 * Track an analytics event
 *
 * @param eventName - The name of the event to track
 * @param eventData - Optional data to attach to the event
 *
 * @example
 * ```ts
 * trackEvent(AnalyticsEvents.EVENT_CREATED, {
 *   dateCount: 5,
 *   slotDuration: 30,
 *   hasDescription: true,
 *   isAuthenticated: false,
 * });
 * ```
 */
export function trackEvent<T extends AnalyticsEventName>(
	eventName: T,
	eventData?: T extends keyof EventDataMap ? EventDataMap[T] : never,
): void {
	if (!isUmamiAvailable()) {
		// Umami not loaded - skip tracking silently
		return;
	}

	try {
		if (eventData && Object.keys(eventData).length > 0) {
			window.umami?.track(eventName, eventData);
		} else {
			window.umami?.track(eventName);
		}
	} catch (error) {
		// Silently fail - analytics should never break the app
		console.warn("[Analytics] Failed to track event:", error);
	}
}

/**
 * Track a page view manually (useful for SPA navigation)
 * Note: Umami tracks page views automatically, but this can be used
 * for custom virtual page views if needed.
 *
 * @param url - Optional URL to track (defaults to current URL)
 */
export function trackPageView(url?: string): void {
	if (!isUmamiAvailable()) {
		return;
	}

	try {
		const pageUrl = url || window.location.pathname + window.location.search;
		window.umami?.track(pageUrl);
	} catch (error) {
		console.warn("[Analytics] Failed to track page view:", error);
	}
}
