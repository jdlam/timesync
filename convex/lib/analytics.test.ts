import { afterEach, describe, expect, it, vi } from "vitest";
import { sendToPostHog } from "./analytics";

describe("sendToPostHog", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	it("is a no-op when POSTHOG_PROJECT_API_KEY is missing", async () => {
		vi.stubEnv("POSTHOG_HOST", "https://us.i.posthog.com");
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		await sendToPostHog("server_event_created", "user_123", { eventId: "e1" });

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("is a no-op when POSTHOG_HOST is missing", async () => {
		vi.stubEnv("POSTHOG_PROJECT_API_KEY", "phc_test");
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		await sendToPostHog("server_event_created", "user_123", { eventId: "e1" });

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("posts the event, distinct_id, and properties to PostHog's capture endpoint when configured", async () => {
		vi.stubEnv("POSTHOG_PROJECT_API_KEY", "phc_test");
		vi.stubEnv("POSTHOG_HOST", "https://us.i.posthog.com");
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
		vi.stubGlobal("fetch", fetchMock);

		await sendToPostHog("server_event_created", "user_123", {
			eventId: "e1",
			tier: "free",
		});

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe("https://us.i.posthog.com/i/v0/e/");
		const body = JSON.parse((init as { body: string }).body);
		expect(body).toEqual({
			api_key: "phc_test",
			event: "server_event_created",
			distinct_id: "user_123",
			properties: { eventId: "e1", tier: "free" },
		});
	});

	it("does not throw when PostHog responds with a non-ok status", async () => {
		vi.stubEnv("POSTHOG_PROJECT_API_KEY", "phc_test");
		vi.stubEnv("POSTHOG_HOST", "https://us.i.posthog.com");
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: false, status: 500 }),
		);

		await expect(
			sendToPostHog("server_event_created", "user_123"),
		).resolves.toBeUndefined();
		expect(errorSpy).toHaveBeenCalled();

		errorSpy.mockRestore();
	});

	it("trims a trailing space from POSTHOG_HOST before building the endpoint", async () => {
		// Production regression: VITE_POSTHOG_HOST had a trailing space, which
		// broke the browser SDK's URL concatenation. The same env-var typo can
		// happen server-side, so POSTHOG_HOST must be trimmed too.
		vi.stubEnv("POSTHOG_PROJECT_API_KEY", "phc_test");
		vi.stubEnv("POSTHOG_HOST", "https://us.i.posthog.com ");
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
		vi.stubGlobal("fetch", fetchMock);

		await sendToPostHog("server_event_created", "user_123", { eventId: "e1" });

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url] = fetchMock.mock.calls[0];
		expect(url).toBe("https://us.i.posthog.com/i/v0/e/");
	});

	it("trims surrounding whitespace from POSTHOG_PROJECT_API_KEY before sending", async () => {
		vi.stubEnv("POSTHOG_PROJECT_API_KEY", " phc_test123 ");
		vi.stubEnv("POSTHOG_HOST", "https://us.i.posthog.com");
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
		vi.stubGlobal("fetch", fetchMock);

		await sendToPostHog("server_event_created", "user_123", { eventId: "e1" });

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [, init] = fetchMock.mock.calls[0];
		const body = JSON.parse((init as { body: string }).body);
		expect(body.api_key).toBe("phc_test123");
	});

	it("is a no-op when POSTHOG_PROJECT_API_KEY is whitespace-only", async () => {
		vi.stubEnv("POSTHOG_PROJECT_API_KEY", "   ");
		vi.stubEnv("POSTHOG_HOST", "https://us.i.posthog.com");
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		await sendToPostHog("server_event_created", "user_123", { eventId: "e1" });

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("is a no-op when POSTHOG_HOST is whitespace-only", async () => {
		vi.stubEnv("POSTHOG_PROJECT_API_KEY", "phc_test");
		vi.stubEnv("POSTHOG_HOST", "   ");
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		await sendToPostHog("server_event_created", "user_123", { eventId: "e1" });

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("does not throw when fetch itself rejects", async () => {
		vi.stubEnv("POSTHOG_PROJECT_API_KEY", "phc_test");
		vi.stubEnv("POSTHOG_HOST", "https://us.i.posthog.com");
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

		await expect(
			sendToPostHog("server_event_created", "user_123"),
		).resolves.toBeUndefined();
		expect(errorSpy).toHaveBeenCalled();

		errorSpy.mockRestore();
	});
});
