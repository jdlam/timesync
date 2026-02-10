/**
 * Tier configuration for server-side validation.
 * Keep in sync with src/lib/tier-config.ts (frontend).
 */
export const TIER_LIMITS = {
	free: {
		maxParticipants: 5,
		maxDates: 14,
	},
	premium: {
		maxParticipants: -1, // Unlimited
		maxDates: 365,
	},
} as const;

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
