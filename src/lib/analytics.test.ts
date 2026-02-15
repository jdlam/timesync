import { beforeAll, describe, expect, it } from "vitest";
import { getUmamiScriptConfig, umamiBeforeSendScript } from "./analytics";

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

	it("should not modify URLs without tokens", () => {
		const result = beforeSend("event", {
			url: "/events/abc123",
			referrer: "/pricing",
		});
		expect(result.url).toBe("/events/abc123");
		expect(result.referrer).toBe("/pricing");
	});

	it("should handle missing url and referrer gracefully", () => {
		const result = beforeSend("event", {});
		expect(result.url).toBeUndefined();
		expect(result.referrer).toBeUndefined();
	});
});
