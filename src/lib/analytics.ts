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
}

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
		},
	];
}
