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
});
