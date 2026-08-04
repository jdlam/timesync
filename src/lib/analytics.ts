/**
 * Analytics configuration utilities
 *
 * This module provides helpers for configuring analytics scripts.
 * Analytics are optional - the app works without them.
 */

import type { CaptureResult, PostHogConfig, Properties } from "posthog-js";

export interface UmamiScriptConfig {
	src: string;
	defer: boolean;
	"data-website-id": string;
	"data-before-send": string;
	"data-exclude-search": "true";
}

/**
 * Inline script that defines the global beforeSend handler for Umami.
 * Redacts admin and edit tokens from tracked URLs and referrers so
 * sensitive tokens are never sent to the analytics service.
 *
 * Must be loaded before the Umami tracker script.
 */
export const umamiBeforeSendScript = `
(function() {
  function sanitize(url) {
    if (!url) return url;
    return url
      .replace(/(\\/events(?:\\/|%2[Ff])(?:(?!%2[Ff])[^\\/])+(?:\\/|%2[Ff])admin(?:\\/|%2[Ff]))(?:(?!%2[Ff])[^\\/?#])+/g, '$1[redacted]')
      .replace(/(\\/events(?:\\/|%2[Ff])(?:(?!%2[Ff])[^\\/])+(?:\\/|%2[Ff])edit(?:\\/|%2[Ff]))(?:(?!%2[Ff])[^\\/?#])+/g, '$1[redacted]');
  }
  window.__umami_before_send = function(type, payload) {
    if (payload) {
      payload.url = sanitize(payload.url);
      payload.referrer = sanitize(payload.referrer);
    }
    return payload;
  };
})();
`;

/**
 * Returns Umami script configuration if both URL and website ID are provided.
 * Returns an empty array if either is missing (making analytics optional).
 */
export function getUmamiScriptConfig(
	scriptUrl: string | undefined,
	websiteId: string | undefined,
): UmamiScriptConfig[] {
	if (!scriptUrl || !websiteId) {
		return [];
	}

	return [
		{
			src: scriptUrl,
			defer: true,
			"data-website-id": websiteId,
			// Points to the global function defined by umamiBeforeSendScript
			// that redacts admin/edit tokens from tracked URLs.
			"data-before-send": "__umami_before_send",
			"data-exclude-search": "true",
		},
	];
}

/**
 * Redacts admin and edit tokens from a URL-like string.
 *
 * The separator between path segments may be a literal `/` or a
 * percent-encoded `%2F`/`%2f` (e.g. from a URL-rewriting proxy or a
 * crafted `document.referrer`) - both are treated as path boundaries so
 * a percent-encoded path can't smuggle a token past the redaction.
 *
 * Same redaction pattern as `umamiBeforeSendScript` above (kept in sync
 * manually: that script must stay an inline literal so Umami's
 * `data-before-send` attribute can reference it as a global function, so
 * it can't import this helper directly).
 */
export function sanitizeUrl(url: string | undefined): string | undefined {
	if (!url) return url;
	return url
		.replace(
			/(\/events(?:\/|%2[Ff])(?:(?!%2[Ff])[^/])+(?:\/|%2[Ff])admin(?:\/|%2[Ff]))(?:(?!%2[Ff])[^/?#])+/g,
			"$1[redacted]",
		)
		.replace(
			/(\/events(?:\/|%2[Ff])(?:(?!%2[Ff])[^/])+(?:\/|%2[Ff])edit(?:\/|%2[Ff]))(?:(?!%2[Ff])[^/?#])+/g,
			"$1[redacted]",
		);
}

/**
 * PostHog `before_send` hook. Redacts admin/edit tokens from
 * `$current_url`/`$referrer`/`$pathname` and any other URL-shaped string
 * property before the event leaves the browser.
 */
export function posthogBeforeSend(
	captureResult: CaptureResult | null,
): CaptureResult | null {
	if (!captureResult?.properties) {
		return captureResult;
	}

	const sanitizedProperties: Properties = { ...captureResult.properties };
	for (const [key, value] of Object.entries(sanitizedProperties)) {
		if (typeof value === "string") {
			sanitizedProperties[key] = sanitizeUrl(value);
		}
	}

	return { ...captureResult, properties: sanitizedProperties };
}

export interface PostHogInitConfig {
	apiKey: string;
	options: Partial<PostHogConfig>;
}

/**
 * Returns PostHog init configuration if both the API key and host are
 * provided. Returns `null` otherwise, making PostHog optional (mirrors
 * `getUmamiScriptConfig`'s "disabled when unconfigured" pattern).
 */
export function getPostHogConfig(
	apiKey: string | undefined,
	apiHost: string | undefined,
): PostHogInitConfig | null {
	if (!apiKey || !apiHost) {
		return null;
	}

	return {
		apiKey,
		options: {
			api_host: apiHost,
			person_profiles: "identified_only",
			disable_session_recording: true,
			persistence: "localStorage",
			// PostHog captures pageviews (including SPA route changes via
			// TanStack Router's history API) so funnel/DAU insights aren't
			// permanently empty. Umami also tracks pageviews independently -
			// the overlap is intentional (PostHog powers funnels, Umami is
			// the lightweight public stats widget).
			capture_pageview: "history_change",
			before_send: posthogBeforeSend,
		},
	};
}
