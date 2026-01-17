import { describe, expect, it } from "vitest";
import {
	TIER_LIMITS,
	getTierLimits,
	hasUnlimitedParticipants,
	type TierType,
} from "./tier-config";

describe("tier-config", () => {
	describe("TIER_LIMITS", () => {
		it("should have free tier configuration", () => {
			expect(TIER_LIMITS.free).toBeDefined();
			expect(TIER_LIMITS.free.maxParticipants).toBe(5);
			expect(TIER_LIMITS.free.maxDates).toBe(14);
			expect(TIER_LIMITS.free.slotDurations).toEqual([15, 30, 60]);
		});

		it("should have premium tier configuration", () => {
			expect(TIER_LIMITS.premium).toBeDefined();
			expect(TIER_LIMITS.premium.maxParticipants).toBe(-1);
			expect(TIER_LIMITS.premium.maxDates).toBe(365);
		});

		it("should have feature flags for free tier", () => {
			expect(TIER_LIMITS.free.features.passwordProtection).toBe(false);
			expect(TIER_LIMITS.free.features.customBranding).toBe(false);
		});

		it("should have feature flags for premium tier", () => {
			expect(TIER_LIMITS.premium.features.passwordProtection).toBe(true);
			expect(TIER_LIMITS.premium.features.customBranding).toBe(true);
		});
	});

	describe("getTierLimits", () => {
		it("should return free tier limits by default", () => {
			const limits = getTierLimits();

			expect(limits).toEqual(TIER_LIMITS.free);
		});

		it("should return free tier limits when specified", () => {
			const limits = getTierLimits("free");

			expect(limits.maxParticipants).toBe(5);
		});

		it("should return premium tier limits when specified", () => {
			const limits = getTierLimits("premium");

			expect(limits.maxParticipants).toBe(-1);
		});
	});

	describe("hasUnlimitedParticipants", () => {
		it("should return false for free tier", () => {
			expect(hasUnlimitedParticipants("free")).toBe(false);
		});

		it("should return true for premium tier", () => {
			expect(hasUnlimitedParticipants("premium")).toBe(true);
		});
	});
});
