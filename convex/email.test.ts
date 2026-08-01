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

// Helper to create a test response (needed for update-notification args,
// which require a real responseId).
async function createTestResponse(
	t: ReturnType<typeof convexTest>,
	eventId: Awaited<ReturnType<typeof createTestEvent>>,
	respondentName = "Alice",
) {
	return await t.run(async (ctx) => {
		return await ctx.db.insert("responses", {
			eventId,
			respondentName,
			selectedSlots: ["2025-01-20T10:00:00Z"],
			editToken: "test-token",
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
			expect(requestBody.data.subject).toBe('New response to "Team Sync"');
			expect(requestBody.data.heading).toBe('New response to "Team Sync"');
			expect(requestBody.data.highlight).toBe("3 responses so far");
			expect(requestBody.data.preheader).toBe(
				"Alice just submitted their availability — 3 responses so far.",
			);
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
			expect(requestBody.data.highlight).toBe("1 response so far");
			expect("links" in requestBody.data).toBe(false);
			expect("unsubscribeUrl" in requestBody.data).toBe(false);

			logSpy.mockRestore();
		});

		// Product decision: subject must stay IDENTICAL across every response
		// notification for a given event (matching the heading) so mail clients
		// thread them into one conversation instead of spawning a new thread
		// per responder — this is spam-prevention for events with many
		// responders. Who/what changed lives entirely in the content instead.
		it("sendResponseNotification: subject is identical across different respondents for the same event (threading)", async () => {
			const t = convexTest(schema, modules);
			const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
			vi.stubEnv("LAME_MAIL_URL", "https://lame-mail.example.com/prod");
			vi.stubEnv("LAME_MAIL_API_KEY", "test-key");
			vi.stubEnv("APP_URL", "https://timesync.example.com");

			const eventId = await createTestEvent(t, { title: "Team Sync" });

			const { getRequestBody: getFirstBody } = mockLameMailFetch();
			await t.action(internal.email_actions.sendResponseNotification, {
				eventId,
				respondentName: "Alice",
				responseCount: 1,
			});
			const firstSubject = getFirstBody().data.subject;

			const { getRequestBody: getSecondBody } = mockLameMailFetch();
			await t.action(internal.email_actions.sendResponseNotification, {
				eventId,
				respondentName: "Bob",
				responseCount: 2,
			});
			const secondSubject = getSecondBody().data.subject;

			expect(firstSubject).toBe('New response to "Team Sync"');
			expect(secondSubject).toBe('New response to "Team Sync"');
			expect(firstSubject).toBe(secondSubject);

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

		// QA regression: title newlines must not survive sanitization into the
		// subject line. A title containing \r\n would inject literal newlines
		// into the subject/heading sent to lame-mail. Sanitization must be
		// consistent across subject and heading to maintain message integrity.
		it("sendResponseNotification: subject and heading use the sanitized title, no raw newlines", async () => {
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
			// Subject no longer embeds the responder name (it must stay identical
			// per event for threading), so title sanitization is what covers it.
			expect(requestBody.data.subject).toBe('New response to "Line1 Line2"');
			expect(requestBody.data.subject).not.toMatch(/[\r\n]/);
			expect(requestBody.data.heading).toBe('New response to "Line1 Line2"');
			expect(requestBody.data.heading).not.toMatch(/[\r\n]/);

			logSpy.mockRestore();
		});

		// QA regression: the responder name still lands in the body and
		// preheader (subject stays name-free for threading), so a name
		// containing \r\n must be sanitized there — otherwise raw newlines
		// would inject into those fields.
		it("sendResponseNotification: strips newlines from respondent name in body and preheader", async () => {
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
			expect(requestBody.data.body).toContain("Line1 Line2");
			expect(requestBody.data.body).not.toMatch(/[\r\n]/);
			expect(requestBody.data.preheader).toBe(
				"Line1 Line2 just submitted their availability — 1 response so far.",
			);
			expect(requestBody.data.preheader).not.toMatch(/[\r\n]/);

			logSpy.mockRestore();
		});

		describe("sendResponseNotification: isUpdate", () => {
			it("uses updated-availability copy for heading/body/preheader, but keeps subject byte-identical to a new-response email for the same event (threading invariant)", async () => {
				const t = convexTest(schema, modules);
				const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
				vi.stubEnv("LAME_MAIL_URL", "https://lame-mail.example.com/prod");
				vi.stubEnv("LAME_MAIL_API_KEY", "test-key");
				vi.stubEnv("APP_URL", "https://timesync.example.com");

				const eventId = await createTestEvent(t, { title: "Team Sync" });
				const responseId = await createTestResponse(t, eventId, "Alice");

				const { getRequestBody: getSubmitBody } = mockLameMailFetch();
				await t.action(internal.email_actions.sendResponseNotification, {
					eventId,
					respondentName: "Alice",
					responseCount: 2,
				});
				const submitSubject = getSubmitBody().data.subject;

				const { getRequestBody: getUpdateBody } = mockLameMailFetch();
				await t.action(internal.email_actions.sendResponseNotification, {
					eventId,
					respondentName: "Alice",
					responseCount: 2,
					isUpdate: true,
					updateTimestamp: 1700000000000,
					responseId,
				});
				const requestBody = getUpdateBody();

				// Content reflects the update...
				expect(requestBody.data.heading).toBe('Updated response to "Team Sync"');
				expect(requestBody.data.body).toBe(
					"Alice just updated their availability.",
				);
				expect(requestBody.data.preheader).toBe(
					"Alice just updated their availability — 2 responses so far.",
				);
				expect(requestBody.data.highlight).toBe("2 responses so far");
				// ...but subject stays the stable per-event string, identical to a
				// submit email for the same event, so mail clients thread them.
				expect(requestBody.data.subject).toBe('New response to "Team Sync"');
				expect(requestBody.data.subject).toBe(submitSubject);

				logSpy.mockRestore();
			});

			it("defaults isUpdate to false: omitting it produces byte-identical submit copy", async () => {
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
					responseCount: 1,
				});

				const requestBody = getRequestBody();
				expect(requestBody.data.heading).toBe('New response to "Team Sync"');
				expect(requestBody.data.body).toBe(
					"Alice just submitted their availability.",
				);
				expect(requestBody.data.preheader).toBe(
					"Alice just submitted their availability — 1 response so far.",
				);

				logSpy.mockRestore();
			});

			// CRITICAL correctness point: responseCount doesn't change on an
			// update, so reusing the submit idempotency key format would collide
			// with the original submit email (and with a second update sharing
			// the same count) and get silently suppressed by lame-mail's 24h
			// dedup. The update path must mint a distinct, per-update key.
			it("idempotency key: update key differs from the submit key and from a second update's key", async () => {
				const t = convexTest(schema, modules);
				const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
				vi.stubEnv("LAME_MAIL_URL", "https://lame-mail.example.com/prod");
				vi.stubEnv("LAME_MAIL_API_KEY", "test-key");
				vi.stubEnv("APP_URL", "https://timesync.example.com");

				const eventId = await createTestEvent(t, { title: "Team Sync" });
				const responseId = await createTestResponse(t, eventId, "Alice");

				const { fetchMock: submitFetch } = mockLameMailFetch();
				await t.action(internal.email_actions.sendResponseNotification, {
					eventId,
					respondentName: "Alice",
					responseCount: 1,
				});
				const submitKey = JSON.parse(submitFetch.mock.calls[0]?.[1].body)
					.idempotencyKey;

				const { fetchMock: update1Fetch } = mockLameMailFetch();
				await t.action(internal.email_actions.sendResponseNotification, {
					eventId,
					respondentName: "Alice",
					responseCount: 1,
					isUpdate: true,
					updateTimestamp: 1700000000000,
					responseId,
				});
				const update1Key = JSON.parse(update1Fetch.mock.calls[0]?.[1].body)
					.idempotencyKey;

				const { fetchMock: update2Fetch } = mockLameMailFetch();
				await t.action(internal.email_actions.sendResponseNotification, {
					eventId,
					respondentName: "Alice",
					responseCount: 1,
					isUpdate: true,
					updateTimestamp: 1700000005000,
					responseId,
				});
				const update2Key = JSON.parse(update2Fetch.mock.calls[0]?.[1].body)
					.idempotencyKey;

				expect(submitKey).toBe(`response-${eventId}-1`);
				expect(update1Key).toBe(
					`response-update-${eventId}-${responseId}-1700000000000`,
				);
				expect(update2Key).toBe(
					`response-update-${eventId}-${responseId}-1700000005000`,
				);
				expect(update1Key).not.toBe(submitKey);
				expect(update2Key).not.toBe(submitKey);
				expect(update1Key).not.toBe(update2Key);

				logSpy.mockRestore();
			});

			// Copilot-found bug (PR #80): the old key format
			// `response-update-{eventId}-{updateTimestamp}` had no per-responder
			// component, so two different responders editing the same event in
			// the same millisecond minted an identical idempotency key — and
			// lame-mail's 24h dedup would silently drop one of the two emails.
			// This pins the fix: distinct responseIds must always yield distinct
			// keys even when eventId and updateTimestamp are identical. (Against
			// the old format both keys below would equal
			// `response-update-{eventId}-1700000000000`, so this test fails on
			// that regression.)
			it("idempotency key: two different responses on the same event updated at the same millisecond get different keys", async () => {
				const t = convexTest(schema, modules);
				const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
				vi.stubEnv("LAME_MAIL_URL", "https://lame-mail.example.com/prod");
				vi.stubEnv("LAME_MAIL_API_KEY", "test-key");
				vi.stubEnv("APP_URL", "https://timesync.example.com");

				const eventId = await createTestEvent(t, { title: "Team Sync" });
				const responseIdA = await createTestResponse(t, eventId, "Alice");
				const responseIdB = await createTestResponse(t, eventId, "Bob");
				const sharedTimestamp = 1700000000000;

				const { fetchMock: updateAFetch } = mockLameMailFetch();
				await t.action(internal.email_actions.sendResponseNotification, {
					eventId,
					respondentName: "Alice",
					responseCount: 2,
					isUpdate: true,
					updateTimestamp: sharedTimestamp,
					responseId: responseIdA,
				});
				const updateAKey = JSON.parse(updateAFetch.mock.calls[0]?.[1].body)
					.idempotencyKey;

				const { fetchMock: updateBFetch } = mockLameMailFetch();
				await t.action(internal.email_actions.sendResponseNotification, {
					eventId,
					respondentName: "Bob",
					responseCount: 2,
					isUpdate: true,
					updateTimestamp: sharedTimestamp,
					responseId: responseIdB,
				});
				const updateBKey = JSON.parse(updateBFetch.mock.calls[0]?.[1].body)
					.idempotencyKey;

				expect(updateAKey).toBe(
					`response-update-${eventId}-${responseIdA}-${sharedTimestamp}`,
				);
				expect(updateBKey).toBe(
					`response-update-${eventId}-${responseIdB}-${sharedTimestamp}`,
				);
				expect(updateAKey).not.toBe(updateBKey);

				logSpy.mockRestore();
			});

			// Runtime guard (PR #80 review, revised after the deploy failure this
			// caused — Convex rejects a union `args` validator at push time, so
			// the "updateTimestamp/responseId required when isUpdate is true"
			// invariant can no longer be enforced at the type level). The
			// handler must fail loudly instead of silently building a key
			// containing "undefined", which would recreate the exact dedup
			// collision this guards against.
			it("throws when isUpdate is true but responseId is missing", async () => {
				const t = convexTest(schema, modules);
				vi.stubEnv("LAME_MAIL_URL", "https://lame-mail.example.com/prod");
				vi.stubEnv("LAME_MAIL_API_KEY", "test-key");
				vi.stubEnv("APP_URL", "https://timesync.example.com");
				mockLameMailFetch();

				const eventId = await createTestEvent(t, { title: "Team Sync" });

				await expect(
					t.action(internal.email_actions.sendResponseNotification, {
						eventId,
						respondentName: "Alice",
						responseCount: 1,
						isUpdate: true,
						updateTimestamp: 1700000000000,
					}),
				).rejects.toThrow(/responseId is required/);
			});

			it("throws when isUpdate is true but updateTimestamp is missing", async () => {
				const t = convexTest(schema, modules);
				vi.stubEnv("LAME_MAIL_URL", "https://lame-mail.example.com/prod");
				vi.stubEnv("LAME_MAIL_API_KEY", "test-key");
				vi.stubEnv("APP_URL", "https://timesync.example.com");
				mockLameMailFetch();

				const eventId = await createTestEvent(t, { title: "Team Sync" });
				const responseId = await createTestResponse(t, eventId, "Alice");

				await expect(
					t.action(internal.email_actions.sendResponseNotification, {
						eventId,
						respondentName: "Alice",
						responseCount: 1,
						isUpdate: true,
						responseId,
					}),
				).rejects.toThrow(/updateTimestamp is required/);
			});
		});
	});
});
