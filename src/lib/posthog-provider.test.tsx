import { act, cleanup, render, screen } from "@testing-library/react";
import posthog from "posthog-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONSENT_STORAGE_KEY } from "./consent";

const VALID_KEY = "phc_test_key";
const VALID_HOST = "https://us.i.posthog.com";

vi.mock("posthog-js", () => ({
	default: {
		__loaded: false,
		init: vi.fn(),
		capture: vi.fn(),
	},
}));

function stubTimezone(timezone: string) {
	vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
		timeZone: timezone,
	} as Intl.ResolvedDateTimeFormatOptions);
}

function stubEnv() {
	vi.stubEnv("VITE_POSTHOG_KEY", VALID_KEY);
	vi.stubEnv("VITE_POSTHOG_HOST", VALID_HOST);
}

// Import after mocks/env are in place per test via dynamic import so each
// test gets a fresh `initialized` module-level flag in posthog-provider.
async function loadProvider() {
	vi.resetModules();
	const mod = await import("./posthog-provider");
	return mod.PostHogProvider;
}

describe("PostHogProvider", () => {
	afterEach(() => {
		cleanup();
		localStorage.clear();
		vi.restoreAllMocks();
		vi.unstubAllEnvs();
		vi.mocked(posthog.init).mockClear();
	});

	it("non-EU/UK visitor: no banner, PostHog initializes as today", async () => {
		stubTimezone("America/New_York");
		stubEnv();
		const PostHogProvider = await loadProvider();

		render(
			<PostHogProvider>
				<div>app</div>
			</PostHogProvider>,
		);

		expect(posthog.init).toHaveBeenCalledWith(
			VALID_KEY,
			expect.objectContaining({ persistence: "localStorage" }),
		);
		expect(
			screen.queryByRole("region", { name: "Analytics consent" }),
		).toBeNull();
	});

	it("EU/UK visitor with no stored choice: banner shows, no init", async () => {
		stubTimezone("Europe/London");
		stubEnv();
		const PostHogProvider = await loadProvider();

		render(
			<PostHogProvider>
				<div>app</div>
			</PostHogProvider>,
		);

		expect(posthog.init).not.toHaveBeenCalled();
		expect(
			screen.getByRole("region", { name: "Analytics consent" }),
		).toBeTruthy();
	});

	it("'Accept all' initializes with the standard localStorage config and persists the choice", async () => {
		stubTimezone("Europe/London");
		stubEnv();
		const PostHogProvider = await loadProvider();

		render(
			<PostHogProvider>
				<div>app</div>
			</PostHogProvider>,
		);
		act(() => {
			screen.getByRole("button", { name: "Accept all" }).click();
		});

		expect(posthog.init).toHaveBeenCalledWith(
			VALID_KEY,
			expect.objectContaining({ persistence: "localStorage" }),
		);
		expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBe("all");
		expect(
			screen.queryByRole("region", { name: "Analytics consent" }),
		).toBeNull();
	});

	it("'Only necessary' initializes with memory persistence and persists the choice", async () => {
		stubTimezone("Europe/London");
		stubEnv();
		const PostHogProvider = await loadProvider();

		render(
			<PostHogProvider>
				<div>app</div>
			</PostHogProvider>,
		);
		act(() => {
			screen.getByRole("button", { name: "Only necessary" }).click();
		});

		expect(posthog.init).toHaveBeenCalledWith(
			VALID_KEY,
			expect.objectContaining({ persistence: "memory" }),
		);
		expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBe("necessary");
	});

	it("'Reject all' never initializes PostHog but persists the choice", async () => {
		stubTimezone("Europe/London");
		stubEnv();
		const PostHogProvider = await loadProvider();

		render(
			<PostHogProvider>
				<div>app</div>
			</PostHogProvider>,
		);
		act(() => {
			screen.getByRole("button", { name: "Reject all" }).click();
		});

		expect(posthog.init).not.toHaveBeenCalled();
		expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBe("none");
		expect(
			screen.queryByRole("region", { name: "Analytics consent" }),
		).toBeNull();
	});

	it("stored choice on load: no banner, behavior applied immediately", async () => {
		stubTimezone("Europe/London");
		stubEnv();
		localStorage.setItem(CONSENT_STORAGE_KEY, "necessary");
		const PostHogProvider = await loadProvider();

		render(
			<PostHogProvider>
				<div>app</div>
			</PostHogProvider>,
		);

		expect(posthog.init).toHaveBeenCalledWith(
			VALID_KEY,
			expect.objectContaining({ persistence: "memory" }),
		);
		expect(
			screen.queryByRole("region", { name: "Analytics consent" }),
		).toBeNull();
	});

	it("does not initialize or throw when PostHog env vars are absent", async () => {
		stubTimezone("America/New_York");
		const PostHogProvider = await loadProvider();

		expect(() =>
			render(
				<PostHogProvider>
					<div>app</div>
				</PostHogProvider>,
			),
		).not.toThrow();
		expect(posthog.init).not.toHaveBeenCalled();
	});
});
