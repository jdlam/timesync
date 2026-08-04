/**
 * Server-side (Convex) event capture via PostHog's HTTP capture API. This is
 * an optional external service, following the same pattern as lame-mail in
 * ../email_actions.ts: unconfigured (missing POSTHOG_PROJECT_API_KEY or
 * POSTHOG_HOST) is a silent no-op, and a failed, slow, or throwing request is
 * caught and logged, never re-thrown — analytics must never break a
 * mutation, action, or webhook.
 */

export type AnalyticsProperties = Record<
	string,
	string | number | boolean | undefined
>;

/**
 * Send one event to PostHog's capture endpoint. Never throws: callers (an
 * internalAction scheduled from a mutation, or a httpAction that can fetch
 * directly) can call this without a try/catch of their own and are
 * guaranteed it will not affect their own success/failure.
 */
export async function sendToPostHog(
	event: string,
	distinctId: string,
	properties?: AnalyticsProperties,
): Promise<void> {
	const apiKey = process.env.POSTHOG_PROJECT_API_KEY?.trim();
	const host = process.env.POSTHOG_HOST?.trim();

	if (!apiKey || !host) {
		return;
	}

	try {
		const endpoint = `${host.replace(/\/+$/, "")}/i/v0/e/`;
		const response = await fetch(endpoint, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				api_key: apiKey,
				event,
				distinct_id: distinctId,
				properties,
			}),
		});
		if (!response.ok) {
			console.error(
				`[Analytics] PostHog capture failed (${response.status}) for event "${event}"`,
			);
		}
	} catch (error) {
		console.error(
			`[Analytics] PostHog capture threw for event "${event}":`,
			error,
		);
	}
}
