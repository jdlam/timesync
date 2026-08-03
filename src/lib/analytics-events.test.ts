import posthog from "posthog-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { trackEvent } from "./analytics-events";

vi.mock("posthog-js", () => ({
	default: {
		__loaded: false,
		capture: vi.fn(),
	},
}));

describe("trackEvent", () => {
	afterEach(() => {
		vi.mocked(posthog.capture).mockClear();
		posthog.__loaded = false;
	});

	it("is a safe no-op when PostHog has not been initialized", () => {
		expect(() =>
			trackEvent("landing_cta_clicked", { ctaLocation: "hero" }),
		).not.toThrow();
		expect(posthog.capture).not.toHaveBeenCalled();
	});

	it("forwards the event name and properties to posthog.capture when initialized", () => {
		posthog.__loaded = true;

		trackEvent("landing_cta_clicked", { ctaLocation: "final_cta" });

		expect(posthog.capture).toHaveBeenCalledWith("landing_cta_clicked", {
			ctaLocation: "final_cta",
		});
	});

	it("forwards no-property events without requiring a properties argument", () => {
		posthog.__loaded = true;

		trackEvent("checkout_started");

		expect(posthog.capture).toHaveBeenCalledWith("checkout_started", undefined);
	});

	it("fails to compile when properties are missing, extra, or mistyped", () => {
		posthog.__loaded = true;

		// @ts-expect-error - ctaLocation is required
		trackEvent("landing_cta_clicked", {});
		// @ts-expect-error - "sidebar" is not a valid ctaLocation
		trackEvent("landing_cta_clicked", { ctaLocation: "sidebar" });
		// @ts-expect-error - extra property not in the schema
		trackEvent("landing_cta_clicked", { ctaLocation: "hero", extra: true });
	});
});
