/**
 * Analytics configuration utilities
 *
 * This module provides helpers for configuring analytics scripts.
 * Analytics are optional - the app works without them.
 */

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
      .replace(/\\/admin\\/[^\\/]+/g, '/admin/[redacted]')
      .replace(/\\/edit\\/[^\\/]+/g, '/edit/[redacted]');
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
