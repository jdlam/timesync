import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

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
	});
});
