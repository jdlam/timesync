import { afterEach, describe, expect, it } from "vitest";
import {
	CONSENT_STORAGE_KEY,
	type ConsentChoice,
	getPostHogOptionsOverride,
	getStoredConsent,
	isEuUkTimezone,
	setStoredConsent,
} from "./consent";

describe("isEuUkTimezone", () => {
	it("treats Europe/* timezones as EU/UK", () => {
		expect(isEuUkTimezone("Europe/London")).toBe(true);
		expect(isEuUkTimezone("Europe/Berlin")).toBe(true);
	});

	it("treats the Atlantic EU outermost regions as EU/UK", () => {
		expect(isEuUkTimezone("Atlantic/Canary")).toBe(true);
		expect(isEuUkTimezone("Atlantic/Madeira")).toBe(true);
		expect(isEuUkTimezone("Atlantic/Azores")).toBe(true);
	});

	it("does not treat non-EU/UK timezones as EU/UK", () => {
		expect(isEuUkTimezone("America/New_York")).toBe(false);
		expect(isEuUkTimezone("Asia/Tokyo")).toBe(false);
		expect(isEuUkTimezone("Atlantic/Bermuda")).toBe(false);
	});
});

describe("consent storage", () => {
	afterEach(() => {
		localStorage.clear();
	});

	it("returns null when no choice has been stored", () => {
		expect(getStoredConsent()).toBeNull();
	});

	it("round-trips a stored choice", () => {
		setStoredConsent("necessary");
		expect(getStoredConsent()).toBe("necessary");
		expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBe("necessary");
	});

	it("ignores a corrupted/unrecognized stored value", () => {
		localStorage.setItem(CONSENT_STORAGE_KEY, "garbage");
		expect(getStoredConsent()).toBeNull();
	});
});

describe("getPostHogOptionsOverride", () => {
	it("accept all: no override, uses the standard Slice 1 config as-is", () => {
		expect(getPostHogOptionsOverride("all")).toEqual({});
	});

	it("only necessary: overrides persistence to memory", () => {
		expect(getPostHogOptionsOverride("necessary")).toEqual({
			persistence: "memory",
		});
	});

	it("reject all: signals PostHog must never initialize", () => {
		expect(getPostHogOptionsOverride("none")).toBeNull();
	});

	it("covers every ConsentChoice", () => {
		const choices: ConsentChoice[] = ["all", "necessary", "none"];
		for (const choice of choices) {
			expect(() => getPostHogOptionsOverride(choice)).not.toThrow();
		}
	});
});
