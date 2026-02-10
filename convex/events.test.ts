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
			expect(result.adminToken).toBeDefined();
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

	describe("create with creatorEmail", () => {
		it("should store creatorId and creatorEmail when provided", async () => {
			const t = convexTest(schema, modules);

			const result = await t.mutation(api.events.create, {
				title: "Logged In User Event",
				timeZone: "UTC",
				dates: ["2025-01-20"],
				timeRangeStart: "09:00",
				timeRangeEnd: "17:00",
				slotDuration: 30,
				maxRespondents: 5,
				creatorId: "user_12345",
				creatorEmail: "user@example.com",
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

			const result = await t.mutation(api.events.create, {
				title: "Premium Event",
				timeZone: "UTC",
				dates: ["2025-01-20"],
				timeRangeStart: "09:00",
				timeRangeEnd: "17:00",
				slotDuration: 30,
				maxRespondents: 5,
				creatorId: "premium_user_123",
				password: "secret123",
			});

			const event = await t.run(async (ctx) => {
				return await ctx.db.get(result.eventId);
			});

			expect(event?.password).toBeDefined();
			expect(event?.password).not.toBe("secret123"); // Should be hashed
			expect(event?.password).toContain(":"); // salt:hash format
		});

		it("should ignore password for non-premium event", async () => {
			const t = convexTest(schema, modules);

			const result = await t.mutation(api.events.create, {
				title: "Free Event",
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

			expect(event?.password).toBeUndefined();
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

			const result = await t.mutation(api.events.create, {
				title: "Premium No Password",
				timeZone: "UTC",
				dates: ["2025-01-20"],
				timeRangeStart: "09:00",
				timeRangeEnd: "17:00",
				slotDuration: 30,
				maxRespondents: 5,
				creatorId: "premium_user_empty_pw",
			});

			const event = await t.run(async (ctx) => {
				return await ctx.db.get(result.eventId);
			});

			expect(event?.password).toBeUndefined();
		});

		it("should not gate access when non-premium event was created with password arg", async () => {
			const t = convexTest(schema, modules);

			// Free user tries to set a password — backend ignores it
			const result = await t.mutation(api.events.create, {
				title: "Free Event With Password Attempt",
				timeZone: "UTC",
				dates: ["2025-01-20"],
				timeRangeStart: "09:00",
				timeRangeEnd: "17:00",
				slotDuration: 30,
				maxRespondents: 5,
				password: "should-be-ignored",
			});

			// Query should return full event without requiring password
			const queryResult = await t.query(
				api.events.getByIdWithResponseCount,
				{ eventId: result.eventId },
			);

			expect(queryResult.event).not.toBeNull();
			expect(queryResult.passwordRequired).toBe(false);
			expect(queryResult.event?.title).toBe(
				"Free Event With Password Attempt",
			);
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

			const createResult = await t.mutation(api.events.create, {
				title: "Protected Event",
				timeZone: "UTC",
				dates: ["2025-01-20"],
				timeRangeStart: "09:00",
				timeRangeEnd: "17:00",
				slotDuration: 30,
				maxRespondents: 5,
				creatorId: "premium_user_pw",
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

			const createResult = await t.mutation(api.events.create, {
				title: "Protected Event",
				timeZone: "UTC",
				dates: ["2025-01-20"],
				timeRangeStart: "09:00",
				timeRangeEnd: "17:00",
				slotDuration: 30,
				maxRespondents: 5,
				creatorId: "premium_user_pw2",
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

			const createResult = await t.mutation(api.events.create, {
				title: "Protected Event",
				timeZone: "UTC",
				dates: ["2025-01-20"],
				timeRangeStart: "09:00",
				timeRangeEnd: "17:00",
				slotDuration: 30,
				maxRespondents: 5,
				creatorId: "premium_user_pw3",
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
			expect(event?.password).toContain(":");
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
