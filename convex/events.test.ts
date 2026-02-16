import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

describe("events", () => {
	describe("create", () => {
		it("should create an event with all required fields", async () => {
			const t = convexTest(schema, modules);

			const result = await t.mutation(api.events.create, {
				title: "Team Meeting",
				description: "Weekly sync",
				timeZone: "America/New_York",
				dates: ["2025-01-20", "2025-01-21"],
				timeRangeStart: "09:00",
				timeRangeEnd: "17:00",
				slotDuration: 30,
				maxRespondents: 5,
			});

			expect(result.eventId).toBeDefined();
			expect(result.adminToken).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			);
		});

		it("should generate unique admin tokens for different events", async () => {
			const t = convexTest(schema, modules);

			const result1 = await t.mutation(api.events.create, {
				title: "Event 1",
				timeZone: "UTC",
				dates: ["2025-01-20"],
				timeRangeStart: "09:00",
				timeRangeEnd: "17:00",
				slotDuration: 30,
				maxRespondents: 5,
			});

			const result2 = await t.mutation(api.events.create, {
				title: "Event 2",
				timeZone: "UTC",
				dates: ["2025-01-21"],
				timeRangeStart: "09:00",
				timeRangeEnd: "17:00",
				slotDuration: 30,
				maxRespondents: 5,
			});

			expect(result1.adminToken).not.toBe(result2.adminToken);
		});

		it("should create an event without optional description", async () => {
			const t = convexTest(schema, modules);

			const result = await t.mutation(api.events.create, {
				title: "Quick Meeting",
				timeZone: "UTC",
				dates: ["2025-01-20"],
				timeRangeStart: "10:00",
				timeRangeEnd: "12:00",
				slotDuration: 15,
				maxRespondents: 10,
			});

			expect(result.eventId).toBeDefined();
		});

		it("should set default values correctly", async () => {
			const t = convexTest(schema, modules);

			const result = await t.mutation(api.events.create, {
				title: "Test Event",
				timeZone: "UTC",
				dates: ["2025-01-20"],
				timeRangeStart: "09:00",
				timeRangeEnd: "17:00",
				slotDuration: 30,
				maxRespondents: 5,
			});

			// Verify the event was created with correct defaults
			const event = await t.run(async (ctx) => {
				return await ctx.db.get(result.eventId);
			});

			expect(event).not.toBeNull();
			expect(event?.isPremium).toBe(false);
			expect(event?.isActive).toBe(true);
			expect(event?.creatorId).toBeUndefined();
			expect(event?.createdAt).toBeDefined();
			expect(event?.updatedAt).toBeDefined();
		});

		it("should reject title longer than 255 characters", async () => {
			const t = convexTest(schema, modules);

			await expect(
				t.mutation(api.events.create, {
					title: "a".repeat(256),
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					maxRespondents: 5,
				}),
			).rejects.toThrow("Title must be between 1 and 255 characters");
		});

		it("should reject invalid slot duration", async () => {
			const t = convexTest(schema, modules);

			await expect(
				t.mutation(api.events.create, {
					title: "Test",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 45,
					maxRespondents: 5,
				}),
			).rejects.toThrow("Slot duration must be 15, 30, or 60 minutes");
		});

		it("should reject invalid time format", async () => {
			const t = convexTest(schema, modules);

			await expect(
				t.mutation(api.events.create, {
					title: "Test",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "9am",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					maxRespondents: 5,
				}),
			).rejects.toThrow("Time range must be in HH:mm format");
		});

		it("should reject out-of-range time values like 99:99", async () => {
			const t = convexTest(schema, modules);

			await expect(
				t.mutation(api.events.create, {
					title: "Test",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "99:99",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					maxRespondents: 5,
				}),
			).rejects.toThrow("Time range must be in HH:mm format");
		});

		it("should reject out-of-range hour 25:00", async () => {
			const t = convexTest(schema, modules);

			await expect(
				t.mutation(api.events.create, {
					title: "Test",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "25:00",
					slotDuration: 30,
					maxRespondents: 5,
				}),
			).rejects.toThrow("Time range must be in HH:mm format");
		});

		it("should reject end time before start time", async () => {
			const t = convexTest(schema, modules);

			await expect(
				t.mutation(api.events.create, {
					title: "Test",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "17:00",
					timeRangeEnd: "09:00",
					slotDuration: 30,
					maxRespondents: 5,
				}),
			).rejects.toThrow("End time must be after start time");
		});

		it("should reject invalid date format", async () => {
			const t = convexTest(schema, modules);

			await expect(
				t.mutation(api.events.create, {
					title: "Test",
					timeZone: "UTC",
					dates: ["not-a-date"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					maxRespondents: 5,
				}),
			).rejects.toThrow("Each date must be a valid calendar date in YYYY-MM-DD format");
		});

		it("should reject impossible date like Feb 31", async () => {
			const t = convexTest(schema, modules);

			await expect(
				t.mutation(api.events.create, {
					title: "Test",
					timeZone: "UTC",
					dates: ["2025-02-31"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					maxRespondents: 5,
				}),
			).rejects.toThrow("Each date must be a valid calendar date in YYYY-MM-DD format");
		});

		it("should reject empty password", async () => {
			const t = convexTest(schema, modules);

			await expect(
				t.mutation(api.events.create, {
					title: "Test",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					maxRespondents: 5,
					password: "",
				}),
			).rejects.toThrow("Password protection is a premium feature");
		});

		it("should enforce free-tier date limit of 14", async () => {
			const t = convexTest(schema, modules);

			const tooManyDates = Array.from({ length: 15 }, (_, i) => `2025-02-${String(i + 1).padStart(2, "0")}`);
			await expect(
				t.mutation(api.events.create, {
					title: "Test",
					timeZone: "UTC",
					dates: tooManyDates,
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					maxRespondents: 5,
				}),
			).rejects.toThrow("Must have between 1 and 14 dates");
		});

		it("should clamp maxRespondents for free tier", async () => {
			const t = convexTest(schema, modules);

			// Free user tries to pass -1 (unlimited) — server should clamp to free-tier max
			const result = await t.mutation(api.events.create, {
				title: "Free Event",
				timeZone: "UTC",
				dates: ["2025-01-20"],
				timeRangeStart: "09:00",
				timeRangeEnd: "17:00",
				slotDuration: 30,
				maxRespondents: -1,
			});

			const event = await t.run(async (ctx) => {
				return await ctx.db.get(result.eventId);
			});

			// Free tier clamped to min 1, max 5
			expect(event?.maxRespondents).toBe(1);
		});

		it("should cap maxRespondents at 5 for free tier", async () => {
			const t = convexTest(schema, modules);

			const result = await t.mutation(api.events.create, {
				title: "Free Event",
				timeZone: "UTC",
				dates: ["2025-01-20"],
				timeRangeStart: "09:00",
				timeRangeEnd: "17:00",
				slotDuration: 30,
				maxRespondents: 100,
			});

			const event = await t.run(async (ctx) => {
				return await ctx.db.get(result.eventId);
			});

			expect(event?.maxRespondents).toBe(5);
		});

		it("should set maxRespondents to -1 for premium users", async () => {
			const t = convexTest(schema, modules);

			await t.run(async (ctx) => {
				await ctx.db.insert("users", {
					email: "premium@example.com",
					name: "Premium User",
					emailVerified: true,
					clerkId: "premium_max_resp",
					subscriptionTier: "premium",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const result = await t
				.withIdentity({
					subject: "premium_max_resp",
					email: "premium@example.com",
				})
				.mutation(api.events.create, {
					title: "Premium Event",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					maxRespondents: 5,
				});

			const event = await t.run(async (ctx) => {
				return await ctx.db.get(result.eventId);
			});

			// Premium users always get unlimited, regardless of what was passed
			expect(event?.maxRespondents).toBe(-1);
		});

		it("should reject event creation when per-user rate limit is exceeded", async () => {
			const t = convexTest(schema, modules);
			const now = Date.now();

			await t.run(async (ctx) => {
				await ctx.db.insert("rateLimits", {
					key: "events:create:user:rate_limited_user",
					count: 30,
					windowStart: now,
					updatedAt: now,
				});
			});

			await expect(
				t
					.withIdentity({
						subject: "rate_limited_user",
						email: "rate-limited@example.com",
					})
					.mutation(api.events.create, {
						title: "Rate Limited Event",
						timeZone: "UTC",
						dates: ["2025-01-20"],
						timeRangeStart: "09:00",
						timeRangeEnd: "17:00",
						slotDuration: 30,
						maxRespondents: 5,
					}),
			).rejects.toThrow(
				"Too many events created from this account. Please try again later.",
			);
		});
	});

	describe("getById", () => {
		it("should return an active event", async () => {
			const t = convexTest(schema, modules);

			// Create an event first
			const eventId = await t.run(async (ctx) => {
				return await ctx.db.insert("events", {
					title: "Test Event",
					timeZone: "UTC",
					dates: ["2025-01-20"],
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
			});

			const event = await t.query(api.events.getById, { eventId });

			expect(event.title).toBe("Test Event");
			expect(event.timeZone).toBe("UTC");
		});

		it("should throw error for non-existent event", async () => {
			const t = convexTest(schema, modules);

			// Create a dummy event to get a valid ID format, then delete it
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

			await expect(t.query(api.events.getById, { eventId })).rejects.toThrow(
				"Event not found",
			);
		});

		it("should not return adminToken or password in response", async () => {
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
					password: "hashed:password",
					maxRespondents: 5,
					isPremium: true,
					isActive: true,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			// Create a response so we have a valid editToken to bypass the password gate
			await t.run(async (ctx) => {
				await ctx.db.insert("responses", {
					eventId,
					respondentName: "Alice",
					selectedSlots: ["2025-01-20T10:00:00Z"],
					editToken: "valid-edit-token",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const event = await t.query(api.events.getById, {
				eventId,
				editToken: "valid-edit-token",
			});

			expect(event.title).toBe("Test Event");
			expect(
				(event as Record<string, unknown>).adminToken,
			).toBeUndefined();
			expect(
				(event as Record<string, unknown>).password,
			).toBeUndefined();
		});

		it("should block password-protected events without valid editToken", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				return await ctx.db.insert("events", {
					title: "Protected Event",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: "admin-token",
					password: "hashed:password",
					maxRespondents: 5,
					isPremium: true,
					isActive: true,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			// Without editToken
			await expect(
				t.query(api.events.getById, { eventId }),
			).rejects.toThrow("This event is password-protected");

			// With invalid editToken
			await expect(
				t.query(api.events.getById, {
					eventId,
					editToken: "wrong-token",
				}),
			).rejects.toThrow("This event is password-protected");
		});

		it("should throw error for inactive event", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				return await ctx.db.insert("events", {
					title: "Inactive Event",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: "token",
					maxRespondents: 5,
					isPremium: false,
					isActive: false,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			await expect(t.query(api.events.getById, { eventId })).rejects.toThrow(
				"This event is no longer accepting responses",
			);
		});
	});

	describe("getByIdWithResponseCount", () => {
		it("should not return adminToken in response", async () => {
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
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const result = await t.query(api.events.getByIdWithResponseCount, {
				eventId,
			});

			expect(result.event).not.toBeNull();
			expect(
				(result.event as Record<string, unknown>)?.adminToken,
			).toBeUndefined();
		});

		it("should return event with zero response count", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				return await ctx.db.insert("events", {
					title: "Event With No Responses",
					timeZone: "UTC",
					dates: ["2025-01-20"],
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
			});

			const result = await t.query(api.events.getByIdWithResponseCount, {
				eventId,
			});

			expect(result.event?.title).toBe("Event With No Responses");
			expect(result.responseCount).toBe(0);
		});

		it("should return correct response count", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				const id = await ctx.db.insert("events", {
					title: "Event With Responses",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: "token",
					maxRespondents: 10,
					isPremium: false,
					isActive: true,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});

				// Add some responses
				await ctx.db.insert("responses", {
					eventId: id,
					respondentName: "Alice",
					selectedSlots: ["2025-01-20T10:00:00Z"],
					editToken: "token-1",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
				await ctx.db.insert("responses", {
					eventId: id,
					respondentName: "Bob",
					selectedSlots: ["2025-01-20T11:00:00Z"],
					editToken: "token-2",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});

				return id;
			});

			const result = await t.query(api.events.getByIdWithResponseCount, {
				eventId,
			});

			expect(result.responseCount).toBe(2);
		});
	});

	describe("getByAdminToken", () => {
		it("should return event with valid admin token", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				return await ctx.db.insert("events", {
					title: "Admin Event",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: "secret-admin-token",
					maxRespondents: 5,
					isPremium: false,
					isActive: true,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const event = await t.query(api.events.getByAdminToken, {
				eventId,
				adminToken: "secret-admin-token",
			});

			expect(event.title).toBe("Admin Event");
		});

		it("should throw error for invalid admin token", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				return await ctx.db.insert("events", {
					title: "Admin Event",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: "correct-token",
					maxRespondents: 5,
					isPremium: false,
					isActive: true,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			await expect(
				t.query(api.events.getByAdminToken, {
					eventId,
					adminToken: "wrong-token",
				}),
			).rejects.toThrow("Event not found or invalid admin token");
		});
	});

	describe("getResponseCount", () => {
		it("should return response count with valid admin token", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				const id = await ctx.db.insert("events", {
					title: "Event With Responses",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: "admin-token",
					maxRespondents: 10,
					isPremium: false,
					isActive: true,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});

				// Add responses
				await ctx.db.insert("responses", {
					eventId: id,
					respondentName: "Alice",
					selectedSlots: ["2025-01-20T10:00:00Z"],
					editToken: "token-1",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
				await ctx.db.insert("responses", {
					eventId: id,
					respondentName: "Bob",
					selectedSlots: ["2025-01-20T11:00:00Z"],
					editToken: "token-2",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});

				return id;
			});

			const result = await t.query(api.events.getResponseCount, {
				eventId,
				adminToken: "admin-token",
			});

			expect(result).not.toBeNull();
			expect(result?.count).toBe(2);
		});

		it("should return zero count for event with no responses", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				return await ctx.db.insert("events", {
					title: "Empty Event",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: "admin-token",
					maxRespondents: 5,
					isPremium: false,
					isActive: true,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const result = await t.query(api.events.getResponseCount, {
				eventId,
				adminToken: "admin-token",
			});

			expect(result).not.toBeNull();
			expect(result?.count).toBe(0);
		});

		it("should return null for invalid admin token", async () => {
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
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const result = await t.query(api.events.getResponseCount, {
				eventId,
				adminToken: "wrong-token",
			});

			expect(result).toBeNull();
		});
	});

	describe("update", () => {
		it("should update event title with valid admin token", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				return await ctx.db.insert("events", {
					title: "Original Title",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: "admin-token",
					maxRespondents: 5,
					isPremium: false,
					isActive: true,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const updatedEvent = await t.mutation(api.events.update, {
				eventId,
				adminToken: "admin-token",
				title: "Updated Title",
			});

			expect(updatedEvent?.title).toBe("Updated Title");
		});

		it("should update multiple fields at once", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				return await ctx.db.insert("events", {
					title: "Original",
					description: "Original description",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: "admin-token",
					maxRespondents: 5,
					isPremium: false,
					isActive: true,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const updatedEvent = await t.mutation(api.events.update, {
				eventId,
				adminToken: "admin-token",
				title: "New Title",
				description: "New description",
				dates: ["2025-01-21", "2025-01-22"],
				timeRangeStart: "10:00",
				timeRangeEnd: "18:00",
			});

			expect(updatedEvent?.title).toBe("New Title");
			expect(updatedEvent?.description).toBe("New description");
			expect(updatedEvent?.dates).toEqual(["2025-01-21", "2025-01-22"]);
			expect(updatedEvent?.timeRangeStart).toBe("10:00");
			expect(updatedEvent?.timeRangeEnd).toBe("18:00");
		});

		it("should clear description when set to null", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				return await ctx.db.insert("events", {
					title: "Test Event",
					description: "Has a description",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: "admin-token",
					maxRespondents: 5,
					isPremium: false,
					isActive: true,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const updatedEvent = await t.mutation(api.events.update, {
				eventId,
				adminToken: "admin-token",
				description: null,
			});

			expect(updatedEvent?.description).toBeUndefined();
		});

		it("should update updatedAt timestamp", async () => {
			const t = convexTest(schema, modules);

			const originalTime = Date.now();
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
					createdAt: originalTime,
					updatedAt: originalTime,
				});
			});

			const updatedEvent = await t.mutation(api.events.update, {
				eventId,
				adminToken: "admin-token",
				title: "Updated",
			});

			expect(updatedEvent?.updatedAt).toBeGreaterThanOrEqual(originalTime);
		});

		it("should throw error for invalid admin token", async () => {
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
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			await expect(
				t.mutation(api.events.update, {
					eventId,
					adminToken: "wrong-token",
					title: "Should Fail",
				}),
			).rejects.toThrow("Event not found or invalid admin token");
		});

		it("should reject invalid time format in update", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				return await ctx.db.insert("events", {
					title: "Test",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: "admin-token",
					maxRespondents: 5,
					isPremium: false,
					isActive: true,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			await expect(
				t.mutation(api.events.update, {
					eventId,
					adminToken: "admin-token",
					timeRangeStart: "99:99",
				}),
			).rejects.toThrow("Time range must be in HH:mm format");
		});

		it("should reject end time before start time in update", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				return await ctx.db.insert("events", {
					title: "Test",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: "admin-token",
					maxRespondents: 5,
					isPremium: false,
					isActive: true,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			await expect(
				t.mutation(api.events.update, {
					eventId,
					adminToken: "admin-token",
					timeRangeStart: "17:00",
					timeRangeEnd: "09:00",
				}),
			).rejects.toThrow("End time must be after start time");
		});

		it("should reject single-field time update that creates invalid range", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				return await ctx.db.insert("events", {
					title: "Test",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "12:00",
					slotDuration: 30,
					adminToken: "admin-token",
					maxRespondents: 5,
					isPremium: false,
					isActive: true,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			// Only updating start to after existing end (12:00)
			await expect(
				t.mutation(api.events.update, {
					eventId,
					adminToken: "admin-token",
					timeRangeStart: "14:00",
				}),
			).rejects.toThrow("End time must be after start time");
		});

		it("should reject too many dates for free-tier event", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				return await ctx.db.insert("events", {
					title: "Free Event",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: "admin-token",
					maxRespondents: 5,
					isPremium: false,
					isActive: true,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const tooManyDates = Array.from({ length: 15 }, (_, i) => `2025-02-${String(i + 1).padStart(2, "0")}`);
			await expect(
				t.mutation(api.events.update, {
					eventId,
					adminToken: "admin-token",
					dates: tooManyDates,
				}),
			).rejects.toThrow("Must have between 1 and 14 dates");
		});

		it("should allow many dates for premium-tier event", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				return await ctx.db.insert("events", {
					title: "Premium Event",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: "admin-token",
					maxRespondents: -1,
					isPremium: true,
					isActive: true,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const manyDates = Array.from({ length: 30 }, (_, i) => `2025-01-${String(i + 1).padStart(2, "0")}`);
			const result = await t.mutation(api.events.update, {
				eventId,
				adminToken: "admin-token",
				dates: manyDates,
			});

			expect(result?.dates).toHaveLength(30);
		});

		it("should reject password update on non-premium event", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				return await ctx.db.insert("events", {
					title: "Free Event",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: "admin-token",
					maxRespondents: 5,
					isPremium: false,
					isActive: true,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			await expect(
				t.mutation(api.events.update, {
					eventId,
					adminToken: "admin-token",
					password: "secret123",
				}),
			).rejects.toThrow("Password protection is a premium feature");
		});

		it("should reject description over 1000 characters in update", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				return await ctx.db.insert("events", {
					title: "Test",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: "admin-token",
					maxRespondents: 5,
					isPremium: false,
					isActive: true,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			await expect(
				t.mutation(api.events.update, {
					eventId,
					adminToken: "admin-token",
					description: "a".repeat(1001),
				}),
			).rejects.toThrow("Description must be at most 1000 characters");
		});
	});

	describe("toggleStatusByAdminToken", () => {
		it("should toggle active event to inactive", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				return await ctx.db.insert("events", {
					title: "Active Event",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: "admin-token",
					maxRespondents: 5,
					isPremium: false,
					isActive: true,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const result = await t.mutation(api.events.toggleStatusByAdminToken, {
				eventId,
				adminToken: "admin-token",
			});

			expect(result.success).toBe(true);
			expect(result.newStatus).toBe(false);

			const event = await t.run(async (ctx) => {
				return await ctx.db.get(eventId);
			});
			expect(event?.isActive).toBe(false);
		});

		it("should toggle inactive event to active", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				return await ctx.db.insert("events", {
					title: "Inactive Event",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: "admin-token",
					maxRespondents: 5,
					isPremium: false,
					isActive: false,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const result = await t.mutation(api.events.toggleStatusByAdminToken, {
				eventId,
				adminToken: "admin-token",
			});

			expect(result.success).toBe(true);
			expect(result.newStatus).toBe(true);

			const event = await t.run(async (ctx) => {
				return await ctx.db.get(eventId);
			});
			expect(event?.isActive).toBe(true);
		});

		it("should throw error for invalid admin token", async () => {
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
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			await expect(
				t.mutation(api.events.toggleStatusByAdminToken, {
					eventId,
					adminToken: "wrong-token",
				}),
			).rejects.toThrow("Event not found or invalid admin token");
		});
	});

	describe("deleteByAdminToken", () => {
		it("should delete event with valid admin token", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				return await ctx.db.insert("events", {
					title: "Event To Delete",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: "admin-token",
					maxRespondents: 5,
					isPremium: false,
					isActive: true,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const result = await t.mutation(api.events.deleteByAdminToken, {
				eventId,
				adminToken: "admin-token",
			});

			expect(result.success).toBe(true);

			const event = await t.run(async (ctx) => {
				return await ctx.db.get(eventId);
			});
			expect(event).toBeNull();
		});

		it("should cascade delete all responses", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				const id = await ctx.db.insert("events", {
					title: "Event With Responses",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: "admin-token",
					maxRespondents: 10,
					isPremium: false,
					isActive: true,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});

				await ctx.db.insert("responses", {
					eventId: id,
					respondentName: "Alice",
					selectedSlots: ["2025-01-20T10:00:00Z"],
					editToken: "token-1",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
				await ctx.db.insert("responses", {
					eventId: id,
					respondentName: "Bob",
					selectedSlots: ["2025-01-20T11:00:00Z"],
					editToken: "token-2",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});

				return id;
			});

			await t.mutation(api.events.deleteByAdminToken, {
				eventId,
				adminToken: "admin-token",
			});

			const responses = await t.run(async (ctx) => {
				return await ctx.db
					.query("responses")
					.withIndex("by_event", (q) => q.eq("eventId", eventId))
					.collect();
			});
			expect(responses).toHaveLength(0);
		});

		it("should throw error for invalid admin token", async () => {
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
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			await expect(
				t.mutation(api.events.deleteByAdminToken, {
					eventId,
					adminToken: "wrong-token",
				}),
			).rejects.toThrow("Event not found or invalid admin token");
		});

		it("should throw error for non-existent event", async () => {
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

			await expect(
				t.mutation(api.events.deleteByAdminToken, {
					eventId,
					adminToken: "token",
				}),
			).rejects.toThrow("Event not found or invalid admin token");
		});
	});

	describe("create with notifyOnResponse", () => {
		it("should store notifyOnResponse for authenticated users", async () => {
			const t = convexTest(schema, modules);

			const result = await t
				.withIdentity({
					subject: "user_notify",
					email: "user@example.com",
				})
				.mutation(api.events.create, {
					title: "Notify Event",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					maxRespondents: 5,
					notifyOnResponse: true,
				});

			const event = await t.run(async (ctx) => {
				return await ctx.db.get(result.eventId);
			});

			expect(event?.notifyOnResponse).toBe(true);
		});

		it("should not store notifyOnResponse for guest users", async () => {
			const t = convexTest(schema, modules);

			const result = await t.mutation(api.events.create, {
				title: "Guest Event",
				timeZone: "UTC",
				dates: ["2025-01-20"],
				timeRangeStart: "09:00",
				timeRangeEnd: "17:00",
				slotDuration: 30,
				maxRespondents: 5,
				notifyOnResponse: true,
			});

			const event = await t.run(async (ctx) => {
				return await ctx.db.get(result.eventId);
			});

			expect(event?.notifyOnResponse).toBeUndefined();
		});

		it("should default notifyOnResponse to undefined when not provided", async () => {
			const t = convexTest(schema, modules);

			const result = await t
				.withIdentity({
					subject: "user_default",
					email: "user@example.com",
				})
				.mutation(api.events.create, {
					title: "Default Event",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					maxRespondents: 5,
				});

			const event = await t.run(async (ctx) => {
				return await ctx.db.get(result.eventId);
			});

			expect(event?.notifyOnResponse).toBeUndefined();
		});
	});

	describe("update with notifyOnResponse", () => {
		it("should update notifyOnResponse to true", async () => {
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
					creatorId: "user_123",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const updatedEvent = await t.mutation(api.events.update, {
				eventId,
				adminToken: "admin-token",
				notifyOnResponse: true,
			});

			expect(updatedEvent?.notifyOnResponse).toBe(true);
		});

		it("should update notifyOnResponse to false", async () => {
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

			const updatedEvent = await t.mutation(api.events.update, {
				eventId,
				adminToken: "admin-token",
				notifyOnResponse: false,
			});

			expect(updatedEvent?.notifyOnResponse).toBe(false);
		});

		it("should not change notifyOnResponse when not provided", async () => {
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

			await t.mutation(api.events.update, {
				eventId,
				adminToken: "admin-token",
				title: "Updated Title",
			});

			const event = await t.run(async (ctx) => {
				return await ctx.db.get(eventId);
			});

			expect(event?.notifyOnResponse).toBe(true);
		});
	});

	describe("creator identity from auth context", () => {
		it("should reject client-provided creator metadata", async () => {
			const t = convexTest(schema, modules);

			await expect(
				t
					.withIdentity({
						subject: "user_12345",
						email: "user@example.com",
					})
					.mutation(
						api.events.create,
						{
							title: "Logged In User Event",
							timeZone: "UTC",
							dates: ["2025-01-20"],
							timeRangeStart: "09:00",
							timeRangeEnd: "17:00",
							slotDuration: 30,
							maxRespondents: 5,
							creatorId: "spoofed-id",
							creatorEmail: "spoofed@example.com",
						} as any,
					),
			).rejects.toThrow(/creatorId|creatorEmail/);
		});

		it("should store creator identity from auth context", async () => {
			const t = convexTest(schema, modules);

			const result = await t
				.withIdentity({
					subject: "user_12345",
					email: "user@example.com",
				})
				.mutation(api.events.create, {
					title: "Logged In User Event",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					maxRespondents: 5,
				});

			const event = await t.run(async (ctx) => {
				return await ctx.db.get(result.eventId);
			});

			expect(event?.creatorId).toBe("user_12345");
			expect(event?.creatorEmail).toBe("user@example.com");
		});

		it("should allow undefined creatorEmail for guest users", async () => {
			const t = convexTest(schema, modules);

			const result = await t.mutation(api.events.create, {
				title: "Guest Event",
				timeZone: "UTC",
				dates: ["2025-01-20"],
				timeRangeStart: "09:00",
				timeRangeEnd: "17:00",
				slotDuration: 30,
				maxRespondents: 5,
			});

			const event = await t.run(async (ctx) => {
				return await ctx.db.get(result.eventId);
			});

			expect(event?.creatorId).toBeUndefined();
			expect(event?.creatorEmail).toBeUndefined();
		});
	});

	describe("create with password", () => {
		it("should store hashed password for premium event", async () => {
			const t = convexTest(schema, modules);

			// Create a premium user first
			await t.run(async (ctx) => {
				await ctx.db.insert("users", {
					email: "premium@example.com",
					name: "Premium User",
					emailVerified: true,
					clerkId: "premium_user_123",
					subscriptionTier: "premium",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const result = await t
				.withIdentity({
					subject: "premium_user_123",
					email: "premium@example.com",
				})
				.mutation(api.events.create, {
					title: "Premium Event",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					maxRespondents: 5,
					password: "secret123",
				});

			const event = await t.run(async (ctx) => {
				return await ctx.db.get(result.eventId);
			});

			expect(event?.password).toBeDefined();
			expect(event?.password).not.toBe("secret123"); // Should be hashed
			expect(event?.password).toContain("pbkdf2_sha256$");
		});

		it("should reject password for non-premium event", async () => {
			const t = convexTest(schema, modules);

			await expect(
				t.mutation(api.events.create, {
					title: "Free Event",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					maxRespondents: 5,
					password: "secret123",
				}),
			).rejects.toThrow("Password protection is a premium feature");
		});

		it("should not store password when premium user leaves it empty", async () => {
			const t = convexTest(schema, modules);

			await t.run(async (ctx) => {
				await ctx.db.insert("users", {
					email: "premium@example.com",
					name: "Premium User",
					emailVerified: true,
					clerkId: "premium_user_empty_pw",
					subscriptionTier: "premium",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const result = await t
				.withIdentity({
					subject: "premium_user_empty_pw",
					email: "premium@example.com",
				})
				.mutation(api.events.create, {
					title: "Premium No Password",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					maxRespondents: 5,
				});

			const event = await t.run(async (ctx) => {
				return await ctx.db.get(result.eventId);
			});

			expect(event?.password).toBeUndefined();
		});

		it("should reject password for non-premium event even with valid length", async () => {
			const t = convexTest(schema, modules);

			await expect(
				t.mutation(api.events.create, {
					title: "Free Event With Password Attempt",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					maxRespondents: 5,
					password: "should-be-rejected",
				}),
			).rejects.toThrow("Password protection is a premium feature");
		});
	});

	describe("getByIdWithResponseCount with password", () => {
		it("should return full event when no password is set", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				return await ctx.db.insert("events", {
					title: "No Password Event",
					timeZone: "UTC",
					dates: ["2025-01-20"],
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
			});

			const result = await t.query(api.events.getByIdWithResponseCount, {
				eventId,
			});

			expect(result.event).not.toBeNull();
			expect(result.passwordRequired).toBe(false);
		});

		it("should require password when event has one", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				return await ctx.db.insert("events", {
					title: "Protected Event",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: "token",
					maxRespondents: 5,
					isPremium: true,
					password:
						"abcdef0123456789abcdef0123456789:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
					isActive: true,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const result = await t.query(api.events.getByIdWithResponseCount, {
				eventId,
			});

			expect(result.event).toBeNull();
			expect(result.passwordRequired).toBe(true);
			expect(result.wrongPassword).toBe(false);
			expect(result.eventTitle).toBe("Protected Event");
		});

		it("should reject wrong password", async () => {
			const t = convexTest(schema, modules);

			// Create a premium user and event with password via mutation
			await t.run(async (ctx) => {
				await ctx.db.insert("users", {
					email: "premium@example.com",
					name: "Premium User",
					emailVerified: true,
					clerkId: "premium_user_pw",
					subscriptionTier: "premium",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const createResult = await t
				.withIdentity({
					subject: "premium_user_pw",
					email: "premium@example.com",
				})
				.mutation(api.events.create, {
					title: "Protected Event",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					maxRespondents: 5,
					password: "correct-password",
				});

			const result = await t.query(api.events.getByIdWithResponseCount, {
				eventId: createResult.eventId,
				password: "wrong-password",
			});

			expect(result.event).toBeNull();
			expect(result.passwordRequired).toBe(true);
			expect(result.wrongPassword).toBe(true);
		});

		it("should return full event with correct password", async () => {
			const t = convexTest(schema, modules);

			await t.run(async (ctx) => {
				await ctx.db.insert("users", {
					email: "premium@example.com",
					name: "Premium User",
					emailVerified: true,
					clerkId: "premium_user_pw2",
					subscriptionTier: "premium",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const createResult = await t
				.withIdentity({
					subject: "premium_user_pw2",
					email: "premium@example.com",
				})
				.mutation(api.events.create, {
					title: "Protected Event",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					maxRespondents: 5,
					password: "correct-password",
				});

			const result = await t.query(api.events.getByIdWithResponseCount, {
				eventId: createResult.eventId,
				password: "correct-password",
			});

			expect(result.event).not.toBeNull();
			expect(result.passwordRequired).toBe(false);
			expect(result.event?.title).toBe("Protected Event");
		});

		it("should strip password hash from returned event", async () => {
			const t = convexTest(schema, modules);

			await t.run(async (ctx) => {
				await ctx.db.insert("users", {
					email: "premium@example.com",
					name: "Premium User",
					emailVerified: true,
					clerkId: "premium_user_pw3",
					subscriptionTier: "premium",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const createResult = await t
				.withIdentity({
					subject: "premium_user_pw3",
					email: "premium@example.com",
				})
				.mutation(api.events.create, {
					title: "Protected Event",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					maxRespondents: 5,
					password: "my-password",
				});

			const result = await t.query(api.events.getByIdWithResponseCount, {
				eventId: createResult.eventId,
				password: "my-password",
			});

			expect(result.event).not.toBeNull();
			// Password hash should not be in the returned event
			expect((result.event as Record<string, unknown>)?.password).toBeUndefined();
			expect(result.event?.isPasswordProtected).toBe(true);
		});
	});

	describe("update with password", () => {
		it("should set password on premium event", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				return await ctx.db.insert("events", {
					title: "Premium Event",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: "admin-token",
					maxRespondents: -1,
					isPremium: true,
					isActive: true,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			await t.mutation(api.events.update, {
				eventId,
				adminToken: "admin-token",
				password: "new-password",
			});

			const event = await t.run(async (ctx) => {
				return await ctx.db.get(eventId);
			});

			expect(event?.password).toBeDefined();
			expect(event?.password).toContain("pbkdf2_sha256$");
		});

		it("should remove password with null", async () => {
			const t = convexTest(schema, modules);

			const eventId = await t.run(async (ctx) => {
				return await ctx.db.insert("events", {
					title: "Premium Event",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: "admin-token",
					maxRespondents: -1,
					isPremium: true,
					password: "some-hash:value",
					isActive: true,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			await t.mutation(api.events.update, {
				eventId,
				adminToken: "admin-token",
				password: null,
			});

			const event = await t.run(async (ctx) => {
				return await ctx.db.get(eventId);
			});

			expect(event?.password).toBeUndefined();
		});

		it("should not change password when undefined", async () => {
			const t = convexTest(schema, modules);

			const originalPassword = "original-hash:value";
			const eventId = await t.run(async (ctx) => {
				return await ctx.db.insert("events", {
					title: "Premium Event",
					timeZone: "UTC",
					dates: ["2025-01-20"],
					timeRangeStart: "09:00",
					timeRangeEnd: "17:00",
					slotDuration: 30,
					adminToken: "admin-token",
					maxRespondents: -1,
					isPremium: true,
					password: originalPassword,
					isActive: true,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			await t.mutation(api.events.update, {
				eventId,
				adminToken: "admin-token",
				title: "Updated Title",
			});

			const event = await t.run(async (ctx) => {
				return await ctx.db.get(eventId);
			});

			expect(event?.password).toBe(originalPassword);
		});
	});
});
