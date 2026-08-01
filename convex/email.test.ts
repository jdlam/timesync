import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

// Helper to create a test event for the lame-mail request-body assertions below.
async function createTestEvent(
	t: ReturnType<typeof convexTest>,
	overrides: Partial<{ title: string; creatorEmail: string }> = {},
) {
	return await t.run(async (ctx) => {
		return await ctx.db.insert("events", {
			title: overrides.title ?? "Test Event",
			timeZone: "UTC",
			dates: ["2025-01-20"],
			timeRangeStart: "09:00",
			timeRangeEnd: "17:00",
			slotDuration: 30,
			adminToken: "admin-token",
			maxRespondents: 5,
			isPremium: false,
			isActive: true,
			creatorEmail: overrides.creatorEmail ?? "creator@example.com",
			createdAt: Date.now(),
			updatedAt: Date.now(),
		});
	});
}

// Captures the JSON body of the single fetch call made to lame-mail's /send
// endpoint, so tests can assert on the exact request shape sent.
function mockLameMailFetch() {
	const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
	vi.stubGlobal("fetch", fetchMock);
	return {
		fetchMock,
		getRequestBody: () => {
			const call = fetchMock.mock.calls[0];
			const init = call?.[1] as { body: string };
			return JSON.parse(init.body);
		},
	};
}

describe("email", () => {
	describe("getEventForEmail", () => {
		it("should return full event including adminToken", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				return await ctx.db.insert("events", {
					title: "Test Event",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: "secret-admin-token",
					maxRespondents: 5,
					isPremium: false,
					isActive: true,
					notifyOnResponse: true,
					creatorId: "user_123",
					creatorEmail: "creator@example.com",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const event = await t.query(internal.email.getEventForEmail, {
				eventId,
			});

			expect(event).not.toBeNull();
			expect(event?.title).toBe("Test Event");
			expect(event?.adminToken).toBe("secret-admin-token");
			expect(event?.notifyOnResponse).toBe(true);
		});

		it("should return null for non-existent event", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				const id = await ctx.db.insert("events", {
					title: "Temp",
					timeZone: "UTC",
					dates: [],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: "token",
					maxRespondents: 5,
					isPremium: false,
					isActive: true,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
				await ctx.db.delete(id);
				return id;
			});

			const event = await t.query(internal.email.getEventForEmail, {
				eventId,
			});

			expect(event).toBeNull();
		});
	});

	describe("getUserEmailByClerkId", () => {
		it("should return user email when user exists", async () => {
			const t = convexTest(schema, modules);

			await t.run(async (ctx) => {
				await ctx.db.insert("users", {
					email: "test@example.com",
					name: "Test User",
					emailVerified: true,
					clerkId: "clerk_123",
					subscriptionTier: "free",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const email = await t.query(internal.email.getUserEmailByClerkId, {
				clerkId: "clerk_123",
			});

			expect(email).toBe("test@example.com");
		});

		it("should return null when user does not exist", async () => {
			const t = convexTest(schema, modules);

			const email = await t.query(internal.email.getUserEmailByClerkId, {
				clerkId: "nonexistent_clerk_id",
			});

			expect(email).toBeNull();
		});
	});

	describe("disableNotifications", () => {
		it("should disable notifications with valid admin token", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				return await ctx.db.insert("events", {
					title: "Test Event",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: "admin-token",
					maxRespondents: 5,
					isPremium: false,
					isActive: true,
					notifyOnResponse: true,
					creatorId: "user_123",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const result = await t.mutation(internal.email.disableNotifications, {
				eventId,
				adminToken: "admin-token",
			});

			expect(result.success).toBe(true);

			const event = await t.run(async (ctx) => {
				return await ctx.db.get(eventId);
			});
			expect(event?.notifyOnResponse).toBe(false);
		});

		it("should fail with invalid admin token", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				return await ctx.db.insert("events", {
					title: "Test Event",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: "correct-token",
					maxRespondents: 5,
					isPremium: false,
					isActive: true,
					notifyOnResponse: true,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const result = await t.mutation(internal.email.disableNotifications, {
				eventId,
				adminToken: "wrong-token",
			});

			expect(result.success).toBe(false);

			// Notifications should still be enabled
			const event = await t.run(async (ctx) => {
				return await ctx.db.get(eventId);
			});
			expect(event?.notifyOnResponse).toBe(true);
		});

		it("should fail for non-existent event", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				const id = await ctx.db.insert("events", {
					title: "Temp",
					timeZone: "UTC",
					dates: [],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: "token",
					maxRespondents: 5,
					isPremium: false,
					isActive: true,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
				await ctx.db.delete(id);
				return id;
			});

			const result = await t.mutation(internal.email.disableNotifications, {
				eventId,
				adminToken: "token",
			});

			expect(result.success).toBe(false);
		});

		it("should fail for malformed event ID without throwing", async () => {
			const t = convexTest(schema, modules);

			const result = await t.mutation(internal.email.disableNotifications, {
				eventId: "malformed-id",
				adminToken: "token",
			});

			expect(result.success).toBe(false);
		});
	});

	describe("lame-mail request body (branded notification fields)", () => {
		afterEach(() => {
			vi.unstubAllEnvs();
			vi.unstubAllGlobals();
		});

		it("sendEventCreatedEmail: puts links in `links[]`, not in body prose, so they render as clickable buttons/links instead of unclickable text", async () => {
			const t = convexTest(schema, modules);
			const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
			vi.stubEnv("LAME_MAIL_URL", "https://lame-mail.example.com/prod");
			vi.stubEnv("LAME_MAIL_API_KEY", "test-key");
			vi.stubEnv("APP_URL", "https://timesync.example.com");
			const { getRequestBody } = mockLameMailFetch();

			const eventId = await createTestEvent(t, { title: "Team Sync" });

			await t.action(internal.email_actions.sendEventCreatedEmail, { eventId });

			const requestBody = getRequestBody();
			expect(requestBody.data.heading).toBe('Your event "Team Sync" is ready');
			expect(requestBody.data.links).toEqual([
				{
					text: "Share with participants",
					url: `https://timesync.example.com/events/${eventId}`,
					primary: true,
				},
				{
					text: "Open admin dashboard",
					url: `https://timesync.example.com/events/${eventId}/admin/admin-token`,
				},
			]);
			// The body must stay link-free: raw URLs in plain-text prose don't
			// render as clickable elements in the branded template.
			expect(requestBody.data.body).not.toMatch(/https?:\/\//);
			expect(requestBody.data.highlight).toBeUndefined();
			expect(requestBody.data.unsubscribeUrl).toBeUndefined();

			logSpy.mockRestore();
		});

		it("sendResponseNotification: includes highlight, a primary results link, and unsubscribeUrl in the footer slot", async () => {
			const t = convexTest(schema, modules);
			const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
			vi.stubEnv("LAME_MAIL_URL", "https://lame-mail.example.com/prod");
			vi.stubEnv("LAME_MAIL_API_KEY", "test-key");
			vi.stubEnv("APP_URL", "https://timesync.example.com");
			vi.stubEnv("CONVEX_CLOUD_URL", "https://my-deployment.convex.cloud");
			const { getRequestBody } = mockLameMailFetch();

			const eventId = await createTestEvent(t, { title: "Team Sync" });

			await t.action(internal.email_actions.sendResponseNotification, {
				eventId,
				respondentName: "Alice",
				responseCount: 3,
			});

			const requestBody = getRequestBody();
			expect(requestBody.data.heading).toBe('New response to "Team Sync"');
			expect(requestBody.data.highlight).toBe("3 responses");
			expect(requestBody.data.links).toEqual([
				{
					text: "View results",
					url: `https://timesync.example.com/events/${eventId}/admin/admin-token`,
					primary: true,
				},
			]);
			// Unsubscribe must ride in `data.unsubscribeUrl` — that's the only
			// field lame-mail renders into the footer; body prose would not.
			expect(requestBody.data.unsubscribeUrl).toBe(
				`https://my-deployment.convex.site/unsubscribe?eventId=${eventId}&adminToken=admin-token`,
			);
			// Neither the admin link nor the unsubscribe link should leak into
			// the plain-text body now that they have dedicated fields.
			expect(requestBody.data.body).not.toMatch(/https?:\/\//);

			logSpy.mockRestore();
		});

		it("sendResponseNotification: omits `links` entirely (not an empty array) when APP_URL is unset, since lame-mail treats presence as validity", async () => {
			const t = convexTest(schema, modules);
			const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
			vi.stubEnv("LAME_MAIL_URL", "https://lame-mail.example.com/prod");
			vi.stubEnv("LAME_MAIL_API_KEY", "test-key");
			vi.stubEnv("APP_URL", "");
			const { getRequestBody } = mockLameMailFetch();

			const eventId = await createTestEvent(t, { title: "Team Sync" });

			await t.action(internal.email_actions.sendResponseNotification, {
				eventId,
				respondentName: "Alice",
				responseCount: 1,
			});

			const requestBody = getRequestBody();
			expect(requestBody.data.highlight).toBe("1 response");
			expect("links" in requestBody.data).toBe(false);

			logSpy.mockRestore();
		});

		it("sendResponseNotification: omits `unsubscribeUrl` when CONVEX_CLOUD_URL is unset", async () => {
			const t = convexTest(schema, modules);
			const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
			vi.stubEnv("LAME_MAIL_URL", "https://lame-mail.example.com/prod");
			vi.stubEnv("LAME_MAIL_API_KEY", "test-key");
			vi.stubEnv("APP_URL", "https://timesync.example.com");
			vi.stubEnv("CONVEX_CLOUD_URL", "");
			const { getRequestBody } = mockLameMailFetch();

			const eventId = await createTestEvent(t, { title: "Team Sync" });

			await t.action(internal.email_actions.sendResponseNotification, {
				eventId,
				respondentName: "Alice",
				responseCount: 2,
			});

			const requestBody = getRequestBody();
			expect("unsubscribeUrl" in requestBody.data).toBe(false);

			logSpy.mockRestore();
		});
	});
});
