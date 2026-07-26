/**
 * Tier configuration for server-side validation.
 * Keep in sync with src/lib/tier-config.ts (frontend).
 */
export const TIER_LIMITS = {
	free: {
		maxParticipants: 5,
		maxDates: 14,
		// Dates events are capped by calendar span (5 weeks), not day count.
		maxDateSpanDays: 35,
	},
	premium: {
		maxParticipants: -1, // Unlimited
		maxDates: 365,
		maxDateSpanDays: 366, // Up to a full (leap) year
	},
} as const;

/**
 * Inclusive number of calendar days spanned by a set of date strings
 * (YYYY-MM-DD), from earliest to latest. Treats the first day as day 1, so a
 * 5-week window is exactly 35 days. Keep in sync with src/lib/tier-config.ts.
 */
export function getDateRangeSpanDays(dates: string[]): number {
	if (dates.length === 0) return 0;
	const times = dates.map((d) => Date.parse(`${d}T00:00:00Z`));
	const min = Math.min(...times);
	const max = Math.max(...times);
	return Math.round((max - min) / 86_400_000) + 1;
}

export function isValidDateString(value: string): boolean {
	if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)) {
		return false;
	}
	const [yearStr, monthStr, dayStr] = value.split("-");
	const year = Number(yearStr);
	const month = Number(monthStr);
	const day = Number(dayStr);
	const date = new Date(Date.UTC(year, month - 1, day));
	return (
		date.getUTCFullYear() === year &&
		date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day
	);
}
