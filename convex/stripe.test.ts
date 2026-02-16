import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { validateRedirectUrl } from "./stripe";
import { modules } from "./test.setup";

describe("validateRedirectUrl", () => {
	let originalAppUrl: string | undefined;
	let originalAdditionalOrigins: string | undefined;

	beforeEach(() => {
		originalAppUrl = process.env.APP_URL;
		originalAdditionalOrigins = process.env.APP_URL_ADDITIONAL_ORIGINS;
	});

	afterEach(() => {
		if (originalAppUrl === undefined) {
			delete process.env.APP_URL;
		} else {
			process.env.APP_URL = originalAppUrl;
		}
		if (originalAdditionalOrigins === undefined) {
			delete process.env.APP_URL_ADDITIONAL_ORIGINS;
		} else {
			process.env.APP_URL_ADDITIONAL_ORIGINS = originalAdditionalOrigins;
		}
	});

	describe("without APP_URL configured", () => {
		beforeEach(() => {
			delete process.env.APP_URL;
			delete process.env.APP_URL_ADDITIONAL_ORIGINS;
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
			delete process.env.APP_URL_ADDITIONAL_ORIGINS;
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

		it("should allow URLs matching additional configured origins", () => {
			process.env.APP_URL_ADDITIONAL_ORIGINS =
				"https://www.timesync.app, https://timesync.me";

			expect(() =>
				validateRedirectUrl("https://www.timesync.app/pricing?success=true"),
			).not.toThrow();
			expect(() =>
				validateRedirectUrl("https://timesync.me/pricing?success=true"),
			).not.toThrow();
		});

		it("should reject invalid APP_URL_ADDITIONAL_ORIGINS values", () => {
			process.env.APP_URL_ADDITIONAL_ORIGINS = "https://www.timesync.app,not-a-url";

			expect(() =>
				validateRedirectUrl("https://www.timesync.app/pricing?success=true"),
			).toThrow("APP_URL_ADDITIONAL_ORIGINS contains an invalid URL");
		});

		it("should reject non-http APP_URL_ADDITIONAL_ORIGINS values", () => {
			process.env.APP_URL_ADDITIONAL_ORIGINS = "ftp://timesync.app";

			expect(() =>
				validateRedirectUrl("https://timesync.app/pricing?success=true"),
			).toThrow("APP_URL_ADDITIONAL_ORIGINS must use HTTP(S)");
		});
	});
});

describe("stripe actions", () => {
	let originalAppUrl: string | undefined;
	let originalAdditionalOrigins: string | undefined;
	let originalSuperAdminEmails: string | undefined;

	beforeEach(() => {
		originalAppUrl = process.env.APP_URL;
		originalAdditionalOrigins = process.env.APP_URL_ADDITIONAL_ORIGINS;
		originalSuperAdminEmails = process.env.SUPER_ADMIN_EMAILS;
		process.env.APP_URL = "https://example.com";
		delete process.env.APP_URL_ADDITIONAL_ORIGINS;
	});

	afterEach(() => {
		if (originalAppUrl === undefined) {
			delete process.env.APP_URL;
		} else {
			process.env.APP_URL = originalAppUrl;
		}
		if (originalAdditionalOrigins === undefined) {
			delete process.env.APP_URL_ADDITIONAL_ORIGINS;
		} else {
			process.env.APP_URL_ADDITIONAL_ORIGINS = originalAdditionalOrigins;
		}
		if (originalSuperAdminEmails === undefined) {
			delete process.env.SUPER_ADMIN_EMAILS;
		} else {
			process.env.SUPER_ADMIN_EMAILS = originalSuperAdminEmails;
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

		it("should reject checkout when user already has active premium", async () => {
			const t = convexTest(schema, modules);

			await t.run(async (ctx) => {
				await ctx.db.insert("users", {
					email: "premium@example.com",
					name: "Premium User",
					emailVerified: true,
					clerkId: "premium_user_123",
					subscriptionTier: "premium",
					subscriptionId: "sub_123",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			await expect(
				t
					.withIdentity({
						subject: "premium_user_123",
						email: "premium@example.com",
					})
					.action(api.stripe.createCheckoutSession, {
						successUrl: "https://example.com/success",
						cancelUrl: "https://example.com/cancel",
					}),
			).rejects.toThrow("You already have an active premium subscription.");
		});

		it("should reject checkout for super admins (already premium)", async () => {
			process.env.SUPER_ADMIN_EMAILS = "admin@example.com";
			const t = convexTest(schema, modules);

			await expect(
				t
					.withIdentity({
						subject: "admin_user",
						email: "admin@example.com",
					})
					.action(api.stripe.createCheckoutSession, {
						successUrl: "https://example.com/success",
						cancelUrl: "https://example.com/cancel",
					}),
			).rejects.toThrow("You already have an active premium subscription.");
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
