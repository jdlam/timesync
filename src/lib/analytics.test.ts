import { beforeAll, describe, expect, it } from "vitest";
import {
	getPostHogConfig,
	getUmamiScriptConfig,
	posthogBeforeSend,
	sanitizeUrl,
	umamiBeforeSendScript,
} from "./analytics";

describe("getUmamiScriptConfig", () => {
	const validScriptUrl = "https://analytics.example.com/script.js";
	const validWebsiteId = "abc123-website-id";

	it("should return script config when both URL and website ID are provided", () => {
		const result = getUmamiScriptConfig(validScriptUrl, validWebsiteId);

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			src: validScriptUrl,
			defer: true,
			"data-website-id": validWebsiteId,
			"data-before-send": "__umami_before_send",
			"data-exclude-search": "true",
		});
	});

	it("should return empty array when script URL is undefined", () => {
		const result = getUmamiScriptConfig(undefined, validWebsiteId);

		expect(result).toEqual([]);
	});

	it("should return empty array when website ID is undefined", () => {
		const result = getUmamiScriptConfig(validScriptUrl, undefined);

		expect(result).toEqual([]);
	});

	it("should return empty array when both are undefined", () => {
		const result = getUmamiScriptConfig(undefined, undefined);

		expect(result).toEqual([]);
	});

	it("should return empty array when script URL is empty string", () => {
		const result = getUmamiScriptConfig("", validWebsiteId);

		expect(result).toEqual([]);
	});

	it("should return empty array when website ID is empty string", () => {
		const result = getUmamiScriptConfig(validScriptUrl, "");

		expect(result).toEqual([]);
	});
});

describe("umamiBeforeSendScript", () => {
	// Execute the inline script so __umami_before_send is defined on globalThis
	beforeAll(() => {
		// biome-ignore lint/security/noGlobalEval: test-only eval of the inline analytics snippet
		eval(umamiBeforeSendScript);
	});

	function beforeSend(
		type: string,
		payload: { url?: string; referrer?: string },
	) {
		return (
			globalThis as unknown as {
				__umami_before_send: (
					type: string,
					payload: { url?: string; referrer?: string },
				) => { url?: string; referrer?: string };
			}
		).__umami_before_send(type, payload);
	}

	it("should redact admin tokens from url", () => {
		const result = beforeSend("event", {
			url: "/events/abc123/admin/secret-token-xyz",
		});
		expect(result.url).toBe("/events/abc123/admin/[redacted]");
	});

	it("should redact edit tokens from url", () => {
		const result = beforeSend("event", {
			url: "/events/abc123/edit/secret-edit-token",
		});
		expect(result.url).toBe("/events/abc123/edit/[redacted]");
	});

	it("should redact tokens from referrer", () => {
		const result = beforeSend("event", {
			url: "/pricing",
			referrer: "/events/abc123/admin/secret-token",
		});
		expect(result.url).toBe("/pricing");
		expect(result.referrer).toBe("/events/abc123/admin/[redacted]");
	});

	it("should redact tokens in absolute URLs", () => {
		const result = beforeSend("event", {
			url: "https://timesync.me/events/abc123/admin/secret-token?foo=bar",
			referrer: "https://timesync.me/events/abc123/edit/secret-edit-token",
		});
		expect(result.url).toBe(
			"https://timesync.me/events/abc123/admin/[redacted]?foo=bar",
		);
		expect(result.referrer).toBe(
			"https://timesync.me/events/abc123/edit/[redacted]",
		);
	});

	it("should not modify URLs without tokens", () => {
		const result = beforeSend("event", {
			url: "/events/abc123",
			referrer: "/pricing",
		});
		expect(result.url).toBe("/events/abc123");
		expect(result.referrer).toBe("/pricing");
	});

	it("should not redact non-token admin routes", () => {
		const result = beforeSend("event", {
			url: "/admin/logs",
			referrer: "/admin/events/123",
		});
		expect(result.url).toBe("/admin/logs");
		expect(result.referrer).toBe("/admin/events/123");
	});

	it("should handle missing url and referrer gracefully", () => {
		const result = beforeSend("event", {});
		expect(result.url).toBeUndefined();
		expect(result.referrer).toBeUndefined();
	});

	// Mirrors the `sanitizeUrl` percent-encoding regression tests below - the
	// inline script can't import `sanitizeUrl`, so its copy of the regex is
	// verified against the same cases to keep the two sources in sync.
	it("should redact admin tokens even when path separators are percent-encoded", () => {
		const result = beforeSend("event", {
			url: "https://timesync.me/events%2Fabc123%2Fadmin%2Fsecret-token",
		});
		expect(result.url).toBe(
			"https://timesync.me/events%2Fabc123%2Fadmin%2F[redacted]",
		);
	});

	it("should redact tokens when path separators are lowercase-percent-encoded", () => {
		const result = beforeSend("event", {
			url: "https://timesync.me/events%2fabc123%2fadmin%2fsecret-token",
		});
		expect(result.url).toBe(
			"https://timesync.me/events%2fabc123%2fadmin%2f[redacted]",
		);
	});

	it("should redact tokens with mixed literal and percent-encoded separators", () => {
		const result = beforeSend("event", {
			url: "/events/abc123%2Fadmin%2Fsecret-token",
		});
		expect(result.url).toBe("/events/abc123%2Fadmin%2F[redacted]");
	});

	it("should preserve query string and hash after a percent-encoded redacted segment", () => {
		const result = beforeSend("event", {
			url: "https://timesync.me/events%2Fabc123%2Fadmin%2Fsecret-token?foo=bar#section",
		});
		expect(result.url).toBe(
			"https://timesync.me/events%2Fabc123%2Fadmin%2F[redacted]?foo=bar#section",
		);
	});

	it("should redact edit tokens even when path separators are percent-encoded", () => {
		const result = beforeSend("event", {
			referrer:
				"https://timesync.me/events%2Fabc123%2Fedit%2Fsecret-edit-token",
		});
		expect(result.referrer).toBe(
			"https://timesync.me/events%2Fabc123%2Fedit%2F[redacted]",
		);
	});
});

describe("getPostHogConfig", () => {
	const validApiKey = "phc_abc123";
	const validApiHost = "https://us.i.posthog.com";

	it("should return init config when both API key and host are provided", () => {
		const result = getPostHogConfig(validApiKey, validApiHost);

		expect(result).not.toBeNull();
		expect(result?.apiKey).toBe(validApiKey);
		expect(result?.options).toMatchObject({
			api_host: validApiHost,
			person_profiles: "identified_only",
			disable_session_recording: true,
			persistence: "localStorage",
			capture_pageview: "history_change",
		});
		expect(result?.options.before_send).toBe(posthogBeforeSend);
	});

	it("should return null when API key is undefined", () => {
		expect(getPostHogConfig(undefined, validApiHost)).toBeNull();
	});

	it("should return null when API host is undefined", () => {
		expect(getPostHogConfig(validApiKey, undefined)).toBeNull();
	});

	it("should return null when both are undefined", () => {
		expect(getPostHogConfig(undefined, undefined)).toBeNull();
	});

	it("should return null when API key is empty string", () => {
		expect(getPostHogConfig("", validApiHost)).toBeNull();
	});

	it("should return null when API host is empty string", () => {
		expect(getPostHogConfig(validApiKey, "")).toBeNull();
	});

	// Production regression: a trailing space in the Vercel env var
	// VITE_POSTHOG_HOST made posthog-js concatenate host + path into an
	// invalid URL (e.g. "https://us.i.posthog.com /e/?..."), throwing on
	// every capture request and silently dropping all analytics.
	it("should trim trailing/leading whitespace from the API key and host", () => {
		const result = getPostHogConfig(`  ${validApiKey}  `, `${validApiHost} `);

		expect(result?.apiKey).toBe(validApiKey);
		expect(result?.options.api_host).toBe(validApiHost);
	});

	it("should return null when API key is whitespace-only", () => {
		expect(getPostHogConfig("   ", validApiHost)).toBeNull();
	});

	it("should return null when API host is whitespace-only", () => {
		expect(getPostHogConfig(validApiKey, "   ")).toBeNull();
	});
});

describe("sanitizeUrl", () => {
	it("should redact admin tokens", () => {
		expect(sanitizeUrl("/events/abc123/admin/secret-token-xyz")).toBe(
			"/events/abc123/admin/[redacted]",
		);
	});

	it("should redact edit tokens", () => {
		expect(sanitizeUrl("/events/abc123/edit/secret-edit-token")).toBe(
			"/events/abc123/edit/[redacted]",
		);
	});

	it("should preserve query strings after the redacted segment", () => {
		expect(
			sanitizeUrl(
				"https://timesync.me/events/abc123/admin/secret-token?foo=bar",
			),
		).toBe("https://timesync.me/events/abc123/admin/[redacted]?foo=bar");
	});

	it("should not modify URLs without tokens", () => {
		expect(sanitizeUrl("/events/abc123")).toBe("/events/abc123");
	});

	it("should return undefined unchanged", () => {
		expect(sanitizeUrl(undefined)).toBeUndefined();
	});

	// QA regression (found during instrumentation review): the redaction regex
	// used to match literal "/" path separators only, so a percent-encoded
	// path (where "/" is sent as "%2F" - e.g. a proxy/CDN or a
	// manually-constructed referrer URL) slipped past both `sanitizeUrl` and
	// `posthogBeforeSend` entirely, leaking the raw admin/edit token. The
	// separator pattern now also matches `%2F`/`%2f`.
	it("should redact admin tokens even when path separators are percent-encoded", () => {
		const result = sanitizeUrl(
			"https://timesync.me/events%2Fabc123%2Fadmin%2Fsecret-token",
		);
		expect(result).toBe(
			"https://timesync.me/events%2Fabc123%2Fadmin%2F[redacted]",
		);
	});

	it("should redact admin tokens when path separators are lowercase-percent-encoded", () => {
		const result = sanitizeUrl(
			"https://timesync.me/events%2fabc123%2fadmin%2fsecret-token",
		);
		expect(result).toBe(
			"https://timesync.me/events%2fabc123%2fadmin%2f[redacted]",
		);
	});

	it("should redact tokens with mixed literal and percent-encoded separators", () => {
		const result = sanitizeUrl("/events/abc123%2Fadmin%2Fsecret-token");
		expect(result).toBe("/events/abc123%2Fadmin%2F[redacted]");
	});

	it("should preserve query string and hash after a percent-encoded redacted segment", () => {
		const result = sanitizeUrl(
			"https://timesync.me/events%2Fabc123%2Fadmin%2Fsecret-token?foo=bar#section",
		);
		expect(result).toBe(
			"https://timesync.me/events%2Fabc123%2Fadmin%2F[redacted]?foo=bar#section",
		);
	});

	it("should redact edit tokens even when path separators are percent-encoded", () => {
		const result = sanitizeUrl(
			"https://timesync.me/events%2Fabc123%2Fedit%2Fsecret-edit-token",
		);
		expect(result).toBe(
			"https://timesync.me/events%2Fabc123%2Fedit%2F[redacted]",
		);
	});
});

describe("posthogBeforeSend", () => {
	function makeCaptureResult(
		properties: Record<string, unknown>,
	): Parameters<typeof posthogBeforeSend>[0] {
		return {
			uuid: "test-uuid",
			event: "$pageview",
			properties,
		};
	}

	it("should redact admin tokens from $current_url", () => {
		const result = posthogBeforeSend(
			makeCaptureResult({
				$current_url: "https://timesync.me/events/abc123/admin/secret-token",
			}),
		);
		expect(result?.properties.$current_url).toBe(
			"https://timesync.me/events/abc123/admin/[redacted]",
		);
	});

	it("should redact edit tokens from $referrer and $pathname", () => {
		const result = posthogBeforeSend(
			makeCaptureResult({
				$referrer: "https://timesync.me/events/abc123/edit/secret-edit-token",
				$pathname: "/events/abc123/edit/secret-edit-token",
			}),
		);
		expect(result?.properties.$referrer).toBe(
			"https://timesync.me/events/abc123/edit/[redacted]",
		);
		expect(result?.properties.$pathname).toBe("/events/abc123/edit/[redacted]");
	});

	it("should redact tokens from any URL-shaped string property", () => {
		const result = posthogBeforeSend(
			makeCaptureResult({
				custom_url: "/events/abc123/admin/secret-token",
			}),
		);
		expect(result?.properties.custom_url).toBe(
			"/events/abc123/admin/[redacted]",
		);
	});

	it("should not modify non-string properties", () => {
		const result = posthogBeforeSend(
			makeCaptureResult({ slotCount: 3, hasComment: true }),
		);
		expect(result?.properties.slotCount).toBe(3);
		expect(result?.properties.hasComment).toBe(true);
	});

	it("should return null unchanged", () => {
		expect(posthogBeforeSend(null)).toBeNull();
	});

	it("should redact admin tokens from $pageview events", () => {
		const result = posthogBeforeSend({
			uuid: "test-uuid",
			event: "$pageview",
			properties: {
				$current_url: "https://timesync.example/events/abc/admin/SECRETTOKEN",
				$pathname: "/events/abc/admin/SECRETTOKEN",
			},
		});
		expect(result?.properties.$current_url).toBe(
			"https://timesync.example/events/abc/admin/[redacted]",
		);
		expect(result?.properties.$pathname).toBe("/events/abc/admin/[redacted]");
	});
});
