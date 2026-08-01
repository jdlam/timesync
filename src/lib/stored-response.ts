/**
 * Remembers which response this browser submitted for a given event, so that
 * returning to the event page edits that response instead of creating a second
 * one (which would consume another respondent slot).
 *
 * Keyed per event, matching the `timezone-display-${eventId}` convention.
 */

export interface StoredResponse {
	responseId: string;
	editToken: string;
}

function storageKey(eventId: string): string {
	return `response-${eventId}`;
}

function isStoredResponse(value: unknown): value is StoredResponse {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const candidate = value as Record<string, unknown>;
	return (
		typeof candidate.responseId === "string" &&
		candidate.responseId.length > 0 &&
		typeof candidate.editToken === "string" &&
		candidate.editToken.length > 0
	);
}

export function getStoredResponse(eventId: string): StoredResponse | null {
	if (typeof window === "undefined") {
		return null;
	}
	try {
		const raw = localStorage.getItem(storageKey(eventId));
		if (!raw) {
			return null;
		}
		const parsed: unknown = JSON.parse(raw);
		return isStoredResponse(parsed) ? parsed : null;
	} catch {
		// Malformed JSON, or storage unavailable (private browsing, blocked
		// cookies). Treat as "no prior response" rather than breaking the page.
		return null;
	}
}

export function setStoredResponse(
	eventId: string,
	response: StoredResponse,
): void {
	if (typeof window === "undefined") {
		return;
	}
	try {
		localStorage.setItem(storageKey(eventId), JSON.stringify(response));
	} catch {
		// Storage unavailable or quota exceeded. The response was still saved
		// server-side and the edit link is shown to the user, so this is
		// recoverable — don't surface it.
	}
}

export function clearStoredResponse(eventId: string): void {
	if (typeof window === "undefined") {
		return;
	}
	try {
		localStorage.removeItem(storageKey(eventId));
	} catch {
		// Nothing useful to do if storage is unavailable.
	}
}
