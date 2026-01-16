/**
 * Tier configuration for free and premium plans
 */

export const TIER_LIMITS = {
	free: {
		maxParticipants: 5,
		maxDates: 14,
		slotDurations: [15, 30, 60] as const,
		features: {
			passwordProtection: false,
			customBranding: false,
		},
	},
	premium: {
		maxParticipants: -1, // Unlimited
		maxDates: 365,
		slotDurations: [15, 30, 60] as const, // Can add custom durations later
		features: {
			passwordProtection: true,
			customBranding: true,
		},
	},
} as const;

export type TierType = keyof typeof TIER_LIMITS;

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
