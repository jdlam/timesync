import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { validateRedirectUrl } from "./stripe";
import { modules } from "./test.setup";

describe("validateRedirectUrl", () => {
	let originalAppUrl: string | undefined;

	beforeEach(() => {
		originalAppUrl = process.env.APP_URL;
	});

	afterEach(() => {
		if (originalAppUrl === undefined) {
			delete process.env.APP_URL;
		} else {
			process.env.APP_URL = originalAppUrl;
		}
	});

	describe("without APP_URL configured", () => {
		beforeEach(() => {
			delete process.env.APP_URL;
		});

		it("should throw configuration error", () => {
			expect(() =>
				validateRedirectUrl("https://example.com/success"),
			).toThrow("APP_URL is not configured");
		});
	});

	describe("with invalid APP_URL configured", () => {
		it("should reject invalid APP_URL values", () => {
			process.env.APP_URL = "not-a-url";
			expect(() =>
				validateRedirectUrl("https://timesync.app/success"),
			).toThrow("APP_URL is invalid");
		});

		it("should reject non-http APP_URL schemes", () => {
			process.env.APP_URL = "ftp://timesync.app";
			expect(() =>
				validateRedirectUrl("https://timesync.app/success"),
			).toThrow("APP_URL must use HTTP(S)");
		});
	});

	describe("with APP_URL configured", () => {
		beforeEach(() => {
			process.env.APP_URL = "https://timesync.app";
		});

		it("should allow URLs matching the configured domain", () => {
			expect(() =>
				validateRedirectUrl("https://timesync.app/pricing?success=true"),
			).not.toThrow();
		});

		it("should allow URLs with paths on the configured domain", () => {
			expect(() =>
				validateRedirectUrl("https://timesync.app/events/123/admin/token"),
			).not.toThrow();
		});

		it("should reject URLs from different domains", () => {
			expect(() =>
				validateRedirectUrl("https://evil.com/steal"),
			).toThrow("Invalid redirect URL: domain mismatch");
		});

		it("should reject URLs from subdomains", () => {
			expect(() =>
				validateRedirectUrl("https://evil.timesync.app/steal"),
			).toThrow("Invalid redirect URL: domain mismatch");
		});

		it("should reject non-HTTP(S) schemes", () => {
			expect(() =>
				validateRedirectUrl("ftp://timesync.app/file"),
			).toThrow("Invalid redirect URL: must use HTTP(S)");
		});

		it("should reject invalid URLs", () => {
			expect(() => validateRedirectUrl("not-a-url")).toThrow(
				"Invalid redirect URL",
			);
		});
	});
});

describe("stripe actions", () => {
	let originalAppUrl: string | undefined;

	beforeEach(() => {
		originalAppUrl = process.env.APP_URL;
		process.env.APP_URL = "https://example.com";
	});

	afterEach(() => {
		if (originalAppUrl === undefined) {
			delete process.env.APP_URL;
		} else {
			process.env.APP_URL = originalAppUrl;
		}
	});

	describe("createCheckoutSession", () => {
		it("should throw error when not authenticated", async () => {
			const t = convexTest(schema, modules);

			await expect(
				t.action(api.stripe.createCheckoutSession, {
					successUrl: "https://example.com/success",
					cancelUrl: "https://example.com/cancel",
				}),
			).rejects.toThrow("Not authenticated");
		});

		it("should reject invalid redirect URLs", async () => {
			const t = convexTest(schema, modules);

			await expect(
				t.action(api.stripe.createCheckoutSession, {
					successUrl: "javascript:alert(1)",
					cancelUrl: "https://example.com/cancel",
				}),
			).rejects.toThrow("Invalid redirect URL");
		});
	});

	describe("createPortalSession", () => {
		it("should throw error when not authenticated", async () => {
			const t = convexTest(schema, modules);

			await expect(
				t.action(api.stripe.createPortalSession, {
					returnUrl: "https://example.com/return",
				}),
			).rejects.toThrow("Not authenticated");
		});

		it("should reject invalid redirect URLs", async () => {
			const t = convexTest(schema, modules);

			await expect(
				t.action(api.stripe.createPortalSession, {
					returnUrl: "data:text/html,<script>alert(1)</script>",
				}),
			).rejects.toThrow("Invalid redirect URL");
		});
	});
});
