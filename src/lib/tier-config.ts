/**
 * Tier configuration for free and premium plans
 */

export const TIER_LIMITS = {
	free: {
		maxParticipants: 5,
		maxDates: 14,
		// Dates events are limited by calendar span, not day count: the candidate
		// pool may span at most 5 weeks (35 days) measured from the first day.
		maxDateSpanDays: 35,
		slotDurations: [15, 30, 60] as const,
		features: {
			passwordProtection: false,
			customBranding: false,
		},
	},
	premium: {
		maxParticipants: -1, // Unlimited
		maxDates: 365,
		maxDateSpanDays: 366, // Up to a full (leap) year
		slotDurations: [15, 30, 60] as const, // Can add custom durations later
		features: {
			passwordProtection: true,
			customBranding: true,
		},
	},
} as const;

export type TierType = keyof typeof TIER_LIMITS;

/**
 * Inclusive number of calendar days spanned by a set of date strings
 * (YYYY-MM-DD): the count of days from the earliest to the latest, inclusive.
 * Used to cap dates-only events by span rather than by day count. Treats the
 * first day as day 1, so a 5-week window is exactly 35 days.
 */
export function getDateRangeSpanDays(dates: string[]): number {
	if (dates.length === 0) return 0;
	const times = dates.map((d) => Date.parse(`${d}T00:00:00Z`));
	const min = Math.min(...times);
	const max = Math.max(...times);
	return Math.round((max - min) / 86_400_000) + 1;
}

/**
 * Get the current tier limits (defaults to free)
 */
export function getTierLimits(tier: TierType = "free") {
	return TIER_LIMITS[tier];
}

/**
 * Check if a tier has unlimited participants
 */
export function hasUnlimitedParticipants(tier: TierType) {
	return TIER_LIMITS[tier].maxParticipants === -1;
}
