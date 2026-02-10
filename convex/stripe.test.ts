import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { validateRedirectUrl } from "./stripe";
import { modules } from "./test.setup";

describe("validateRedirectUrl", () => {
	describe("without APP_URL configured", () => {
		beforeEach(() => {
			delete process.env.APP_URL;
		});

		it("should allow valid HTTPS URLs", () => {
			expect(() =>
				validateRedirectUrl("https://example.com/success"),
			).not.toThrow();
		});

		it("should allow valid HTTP URLs", () => {
			expect(() =>
				validateRedirectUrl("http://localhost:3000/success"),
			).not.toThrow();
		});

		it("should reject javascript: URLs", () => {
			expect(() =>
				validateRedirectUrl("javascript:alert(1)"),
			).toThrow("Invalid redirect URL");
		});

		it("should reject data: URLs", () => {
			expect(() =>
				validateRedirectUrl("data:text/html,<script>alert(1)</script>"),
			).toThrow("Invalid redirect URL");
		});

		it("should reject invalid URLs", () => {
			expect(() => validateRedirectUrl("not-a-url")).toThrow(
				"Invalid redirect URL",
			);
		});
	});

	describe("with APP_URL configured", () => {
		beforeEach(() => {
			process.env.APP_URL = "https://timesync.app";
		});

		afterEach(() => {
			delete process.env.APP_URL;
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

		it("should reject invalid URLs", () => {
			expect(() => validateRedirectUrl("not-a-url")).toThrow(
				"Invalid redirect URL",
			);
		});
	});
});

describe("stripe actions", () => {
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
