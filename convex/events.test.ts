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
				adminToken: "test-admin-token",
				maxRespondents: 5,
			});

			expect(result.eventId).toBeDefined();
			expect(result.adminToken).toBe("test-admin-token");
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
				adminToken: "token-123",
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
				adminToken: "token",
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

			expect(result.event.title).toBe("Event With No Responses");
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
				adminToken: "token",
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
				adminToken: "token",
				maxRespondents: 5,
			});

			const event = await t.run(async (ctx) => {
				return await ctx.db.get(result.eventId);
			});

			expect(event?.creatorId).toBeUndefined();
			expect(event?.creatorEmail).toBeUndefined();
		});
	});
});
