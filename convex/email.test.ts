import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "./_generated/api";
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
			notificationToken: "notification-token",
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

	// QA regression: the public unsubscribe-portal functions (getUnsubscribeInfo,
	// unsubscribe, resubscribe) shipped with zero direct convex-test coverage —
	// only a UI test that mocks them out. These probe the actual auth rule
	// (authorizeNotificationToken) and the public/client-facing surface.
	describe("QA regression: public unsubscribe-portal functions", () => {
		async function insertEvent(
			t: ReturnType<typeof convexTest>,
			overrides: Partial<{
				notificationToken: string;
				adminToken: string;
				notifyOnResponse: boolean;
			}> = {},
		) {
			return await t.run(async (ctx) => {
				return await ctx.db.insert("events", {
					title: "Team Sync",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: overrides.adminToken ?? "admin-token",
					notificationToken: overrides.notificationToken ?? "notif-token",
					maxRespondents: 5,
					isPremium: false,
					isActive: true,
					notifyOnResponse: overrides.notifyOnResponse,
					creatorEmail: "creator@example.com",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});
		}

		describe("getUnsubscribeInfo", () => {
			it("resolves title/notifyOnResponse for a correct notificationToken", async () => {
				const t = convexTest(schema, modules);
				const eventId = await insertEvent(t, { notifyOnResponse: true });

				const info = await t.query(api.email.getUnsubscribeInfo, {
					eventId,
					token: "notif-token",
				});

				expect(info).toEqual({ title: "Team Sync", notifyOnResponse: true });
			});

			it("also resolves via the legacy adminToken fallback", async () => {
				const t = convexTest(schema, modules);
				const eventId = await insertEvent(t, { notifyOnResponse: true });

				const info = await t.query(api.email.getUnsubscribeInfo, {
					eventId,
					token: "admin-token",
				});

				expect(info).toEqual({ title: "Team Sync", notifyOnResponse: true });
			});

			it("returns null (not an error) for a wrong-but-valid-format token", async () => {
				const t = convexTest(schema, modules);
				const eventId = await insertEvent(t);

				const info = await t.query(api.email.getUnsubscribeInfo, {
					eventId,
					token: "not-the-right-token",
				});

				expect(info).toBeNull();
			});

			it("returns null for an empty-string token against a real event (non-empty tokens)", async () => {
				const t = convexTest(schema, modules);
				const eventId = await insertEvent(t);

				const info = await t.query(api.email.getUnsubscribeInfo, {
					eventId,
					token: "",
				});

				expect(info).toBeNull();
			});

			it("rejects an empty-string token even if adminToken/notificationToken are empty (defense-in-depth)", async () => {
				const t = convexTest(schema, modules);
				const eventId = await t.run(async (ctx) => {
					return await ctx.db.insert("events", {
						title: "No Token Event",
						timeZone: "UTC",
						dates: ["2025-01-20"],
						timeRangeStart: "09:00",
						timeRangeEnd: "17:00",
						slotDuration: 30,
						adminToken: "",
						maxRespondents: 5,
						isPremium: false,
						isActive: true,
						createdAt: Date.now(),
						updatedAt: Date.now(),
					});
				});

				const info = await t.query(api.email.getUnsubscribeInfo, {
					eventId,
					token: "",
				});

				// Even if adminToken is empty (violates schema invariant), empty
				// token is explicitly rejected before any comparison.
				expect(info).toBeNull();
			});

			it("rejects a token that is valid for a DIFFERENT event", async () => {
				const t = convexTest(schema, modules);
				await insertEvent(t, { notificationToken: "notif-token-A" });
				const eventB = await insertEvent(t, {
					notificationToken: "notif-token-B",
					adminToken: "admin-token-B",
				});

				const info = await t.query(api.email.getUnsubscribeInfo, {
					eventId: eventB,
					token: "notif-token-A",
				});

				expect(info).toBeNull();
			});

			it("does not throw on a malformed eventId (not a Convex id)", async () => {
				const t = convexTest(schema, modules);

				const info = await t.query(api.email.getUnsubscribeInfo, {
					eventId: "abc",
					token: "notif-token",
				});

				expect(info).toBeNull();
			});

			it("does not throw for a garbage eventId shaped like an id from another table", async () => {
				const t = convexTest(schema, modules);

				const info = await t.query(api.email.getUnsubscribeInfo, {
					eventId: "not_a_real_convex_id_at_all_12345",
					token: "notif-token",
				});

				expect(info).toBeNull();
			});
		});

		describe("unsubscribe / resubscribe", () => {
			it("unsubscribe flips notifyOnResponse to false with a valid notificationToken", async () => {
				const t = convexTest(schema, modules);
				const eventId = await insertEvent(t, { notifyOnResponse: true });

				const result = await t.mutation(api.email.unsubscribe, {
					eventId,
					token: "notif-token",
				});

				expect(result).toEqual({ success: true });
				const event = await t.run((ctx) => ctx.db.get(eventId));
				expect(event?.notifyOnResponse).toBe(false);
			});

			it("resubscribe flips notifyOnResponse back to true with a valid notificationToken", async () => {
				const t = convexTest(schema, modules);
				const eventId = await insertEvent(t, { notifyOnResponse: false });

				const result = await t.mutation(api.email.resubscribe, {
					eventId,
					token: "notif-token",
				});

				expect(result).toEqual({ success: true });
				const event = await t.run((ctx) => ctx.db.get(eventId));
				expect(event?.notifyOnResponse).toBe(true);
			});

			it("unsubscribe is idempotent: calling it twice still reports success and stays off", async () => {
				const t = convexTest(schema, modules);
				const eventId = await insertEvent(t, { notifyOnResponse: true });

				const first = await t.mutation(api.email.unsubscribe, {
					eventId,
					token: "notif-token",
				});
				const second = await t.mutation(api.email.unsubscribe, {
					eventId,
					token: "notif-token",
				});

				expect(first).toEqual({ success: true });
				expect(second).toEqual({ success: true });
				const event = await t.run((ctx) => ctx.db.get(eventId));
				expect(event?.notifyOnResponse).toBe(false);
			});

			it("unsubscribe reports failure (not a thrown error) for a wrong token, and leaves state untouched", async () => {
				const t = convexTest(schema, modules);
				const eventId = await insertEvent(t, { notifyOnResponse: true });

				const result = await t.mutation(api.email.unsubscribe, {
					eventId,
					token: "wrong-token",
				});

				expect(result).toEqual({ success: false });
				const event = await t.run((ctx) => ctx.db.get(eventId));
				expect(event?.notifyOnResponse).toBe(true);
			});

			it("resubscribe reports failure (not a thrown error) for a malformed eventId", async () => {
				const t = convexTest(schema, modules);

				const result = await t.mutation(api.email.resubscribe, {
					eventId: "not-an-id",
					token: "notif-token",
				});

				expect(result).toEqual({ success: false });
			});
		});
	});

	describe("lame-mail request body (branded notification fields)", () => {
		afterEach(() => {
			vi.unstubAllEnvs();
			vi.unstubAllGlobals();
			vi.restoreAllMocks();
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

		it("sendResponseNotification: includes highlight, a primary results link, and a branded unsubscribeUrl in the footer slot", async () => {
			const t = convexTest(schema, modules);
			const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
			vi.stubEnv("LAME_MAIL_URL", "https://lame-mail.example.com/prod");
			vi.stubEnv("LAME_MAIL_API_KEY", "test-key");
			vi.stubEnv("APP_URL", "https://timesync.example.com");
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
			// Unsubscribe must ride in `data.unsubscribeUrl`, on our own branded
			// domain (not the raw Convex .site deployment URL), carrying a
			// least-privilege token — not the full-power adminToken.
			expect(requestBody.data.unsubscribeUrl).toBe(
				`https://timesync.example.com/unsubscribe?eventId=${eventId}&token=notification-token`,
			);
			expect(requestBody.data.unsubscribeUrl).not.toContain("adminToken=");
			// Neither the admin link nor the unsubscribe link should leak into
			// the plain-text body now that they have dedicated fields.
			expect(requestBody.data.body).not.toMatch(/https?:\/\//);

			logSpy.mockRestore();
		});

		it("sendResponseNotification: falls back to adminToken in unsubscribeUrl for pre-existing events with no notificationToken", async () => {
			const t = convexTest(schema, modules);
			const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
			vi.stubEnv("LAME_MAIL_URL", "https://lame-mail.example.com/prod");
			vi.stubEnv("LAME_MAIL_API_KEY", "test-key");
			vi.stubEnv("APP_URL", "https://timesync.example.com");
			const { getRequestBody } = mockLameMailFetch();

			// Simulate an event created before notificationToken existed: no
			// notificationToken field on the doc at all.
			const eventId = await t.run(async (ctx) => {
				return await ctx.db.insert("events", {
					title: "Legacy Event",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: "admin-token",
					maxRespondents: 5,
					isPremium: false,
					isActive: true,
					creatorEmail: "creator@example.com",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			await t.action(internal.email_actions.sendResponseNotification, {
				eventId,
				respondentName: "Alice",
				responseCount: 1,
			});

			const requestBody = getRequestBody();
			expect(requestBody.data.unsubscribeUrl).toBe(
				`https://timesync.example.com/unsubscribe?eventId=${eventId}&token=admin-token`,
			);

			logSpy.mockRestore();
		});

		it("sendResponseNotification: omits `links` and `unsubscribeUrl` when APP_URL is unset, since lame-mail treats presence as validity and no portal URL can be built", async () => {
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
			expect("unsubscribeUrl" in requestBody.data).toBe(false);

			logSpy.mockRestore();
		});

		// QA regression: title newlines must not survive sanitization into
		// heading — a raw \n in the title would break the branded heading slot
		// or, if lame-mail interprets structure, could be used to inject content.
		it("sendEventCreatedEmail: strips newlines from title in heading (not just subject)", async () => {
			const t = convexTest(schema, modules);
			const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
			vi.stubEnv("LAME_MAIL_URL", "https://lame-mail.example.com/prod");
			vi.stubEnv("LAME_MAIL_API_KEY", "test-key");
			vi.stubEnv("APP_URL", "https://timesync.example.com");
			const { getRequestBody } = mockLameMailFetch();

			const eventId = await createTestEvent(t, {
				title: "Line1\nLine2\rLine3",
			});

			await t.action(internal.email_actions.sendEventCreatedEmail, { eventId });

			const requestBody = getRequestBody();
			expect(requestBody.data.heading).not.toMatch(/[\r\n]/);
			expect(requestBody.data.heading).toBe('Your event "Line1 Line2 Line3" is ready');

			logSpy.mockRestore();
		});

		// QA regression: HTML in the title must pass through as literal text in
		// the request body — lame-mail escapes at render time, so pre-escaping
		// or stripping here would double-escape or silently drop markup chars.
		it("sendEventCreatedEmail: passes HTML-like title characters through unescaped in the request payload", async () => {
			const t = convexTest(schema, modules);
			const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
			vi.stubEnv("LAME_MAIL_URL", "https://lame-mail.example.com/prod");
			vi.stubEnv("LAME_MAIL_API_KEY", "test-key");
			vi.stubEnv("APP_URL", "https://timesync.example.com");
			const { getRequestBody } = mockLameMailFetch();

			const eventId = await createTestEvent(t, {
				title: '<b>"quoted"</b> & stuff',
			});

			await t.action(internal.email_actions.sendEventCreatedEmail, { eventId });

			const requestBody = getRequestBody();
			expect(requestBody.data.heading).toBe(
				'Your event "<b>"quoted"</b> & stuff" is ready',
			);

			logSpy.mockRestore();
		});

		// QA regression: respondent name newlines must not survive sanitization
		// into the body prose. A name containing \r\n would inject literal newlines
		// into the plain-text body sent to lame-mail. The body must sanitize
		// respondent name consistently with title to maintain message integrity.
		it("sendResponseNotification: strips newlines from respondent name in body", async () => {
			const t = convexTest(schema, modules);
			const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
			vi.stubEnv("LAME_MAIL_URL", "https://lame-mail.example.com/prod");
			vi.stubEnv("LAME_MAIL_API_KEY", "test-key");
			vi.stubEnv("APP_URL", "https://timesync.example.com");
			const { getRequestBody } = mockLameMailFetch();

			const eventId = await createTestEvent(t, { title: "Team Sync" });

			await t.action(internal.email_actions.sendResponseNotification, {
				eventId,
				respondentName: "Line1\nLine2",
				responseCount: 1,
			});

			const requestBody = getRequestBody();
			// Control chars in user input must not break the single-line prose or template layout.
			expect(requestBody.data.body).toContain("Line1 Line2");
			expect(requestBody.data.body).not.toMatch(/[\r\n]/);

			logSpy.mockRestore();
		});

		// QA regression: title newlines must not survive sanitization into
		// the body prose. A title containing \r\n would inject literal newlines
		// into the plain-text body sent to lame-mail. The body must sanitize
		// consistently with subject/heading to maintain message integrity.
		it("sendResponseNotification: body prose uses the sanitized title, no raw newlines", async () => {
			const t = convexTest(schema, modules);
			const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
			vi.stubEnv("LAME_MAIL_URL", "https://lame-mail.example.com/prod");
			vi.stubEnv("LAME_MAIL_API_KEY", "test-key");
			vi.stubEnv("APP_URL", "https://timesync.example.com");
			const { getRequestBody } = mockLameMailFetch();

			const eventId = await createTestEvent(t, { title: "Line1\nLine2" });

			await t.action(internal.email_actions.sendResponseNotification, {
				eventId,
				respondentName: "Alice",
				responseCount: 1,
			});

			const requestBody = getRequestBody();
			// heading is sanitized...
			expect(requestBody.data.heading).toBe('New response to "Line1 Line2"');
			// ...body must also be sanitized consistently for message integrity.
			expect(requestBody.data.body).toContain("Line1 Line2");
			expect(requestBody.data.body).not.toMatch(/[\r\n]/);

			logSpy.mockRestore();
		});
	});
});
