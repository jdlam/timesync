import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";
import { modules } from "./test.setup";

const userIdentity = {
	subject: "user_abc",
	email: "user@example.com",
	name: "Test User",
	emailVerified: true,
};

const otherUserIdentity = {
	subject: "user_other",
	email: "other@example.com",
	name: "Other User",
	emailVerified: true,
};

// Helper to create a test event with a creatorId
async function createTestEvent(
	t: ReturnType<typeof convexTest>,
	overrides: Partial<{
		creatorId: string;
		adminToken: string;
		isActive: boolean;
		isPremium: boolean;
		title: string;
	}> = {},
): Promise<Id<"events">> {
	return await t.run(async (ctx) => {
		return await ctx.db.insert("events", {
			title: overrides.title ?? "Test Event",
			timeZone: "UTC",
			dates: ["2025-01-20"],
			timeRangeStart: "09:00",
			timeRangeEnd: "17:00",
			slotDuration: 30,
			adminToken: overrides.adminToken ?? "admin-token-123",
			maxRespondents: 5,
			isPremium: overrides.isPremium ?? false,
			isActive: overrides.isActive ?? true,
			creatorId: overrides.creatorId ?? "user_abc",
			createdAt: Date.now(),
			updatedAt: Date.now(),
		});
	});
}

describe("myEvents", () => {
	describe("getMyEvents", () => {
		it("should return null when user is not authenticated", async () => {
			const t = convexTest(schema, modules);

			const result = await t.query(api.myEvents.getMyEvents, {});

			expect(result).toBeNull();
		});

		it("should return events created by the authenticated user", async () => {
			const t = convexTest(schema, modules);
			await createTestEvent(t, {
				creatorId: "user_abc",
				title: "My Event",
			});

			const result = await t
				.withIdentity(userIdentity)
				.query(api.myEvents.getMyEvents, {});

			expect(result).not.toBeNull();
			expect(result!.events).toHaveLength(1);
			expect(result!.events[0].title).toBe("My Event");
		});

		it("should not return events created by other users", async () => {
			const t = convexTest(schema, modules);
			await createTestEvent(t, {
				creatorId: "user_other",
				title: "Other's Event",
			});

			const result = await t
				.withIdentity(userIdentity)
				.query(api.myEvents.getMyEvents, {});

			expect(result).not.toBeNull();
			expect(result!.events).toHaveLength(0);
		});

		it("should include adminToken in returned events", async () => {
			const t = convexTest(schema, modules);
			await createTestEvent(t, {
				creatorId: "user_abc",
				adminToken: "secret-admin-token",
			});

			const result = await t
				.withIdentity(userIdentity)
				.query(api.myEvents.getMyEvents, {});

			expect(result).not.toBeNull();
			expect(result!.events).toHaveLength(1);
			expect(result!.events[0].adminToken).toBe("secret-admin-token");
		});

		it("should include response count for each event", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t, { creatorId: "user_abc" });

			// Add some responses
			await t.run(async (ctx) => {
				for (let i = 0; i < 3; i++) {
					await ctx.db.insert("responses", {
						eventId,
						respondentName: `User ${i}`,
						selectedSlots: [],
						editToken: `token-${i}`,
						createdAt: Date.now(),
						updatedAt: Date.now(),
					});
				}
			});

			const result = await t
				.withIdentity(userIdentity)
				.query(api.myEvents.getMyEvents, {});

			expect(result!.events[0].responseCount).toBe(3);
		});

		it("should filter by search term", async () => {
			const t = convexTest(schema, modules);
			await createTestEvent(t, {
				creatorId: "user_abc",
				title: "Team Standup",
			});
			await createTestEvent(t, {
				creatorId: "user_abc",
				title: "Lunch Meeting",
			});

			const result = await t
				.withIdentity(userIdentity)
				.query(api.myEvents.getMyEvents, { search: "standup" });

			expect(result!.events).toHaveLength(1);
			expect(result!.events[0].title).toBe("Team Standup");
		});

		it("should filter by active status", async () => {
			const t = convexTest(schema, modules);
			await createTestEvent(t, {
				creatorId: "user_abc",
				title: "Active Event",
				isActive: true,
			});
			await createTestEvent(t, {
				creatorId: "user_abc",
				title: "Inactive Event",
				isActive: false,
			});

			const activeResult = await t
				.withIdentity(userIdentity)
				.query(api.myEvents.getMyEvents, { statusFilter: "active" });
			expect(activeResult!.events).toHaveLength(1);
			expect(activeResult!.events[0].title).toBe("Active Event");

			const inactiveResult = await t
				.withIdentity(userIdentity)
				.query(api.myEvents.getMyEvents, { statusFilter: "inactive" });
			expect(inactiveResult!.events).toHaveLength(1);
			expect(inactiveResult!.events[0].title).toBe("Inactive Event");
		});
	});

	describe("getMyEventById", () => {
		it("should return null when user is not authenticated", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t, { creatorId: "user_abc" });

			const result = await t.query(api.myEvents.getMyEventById, {
				eventId,
			});

			expect(result).toBeNull();
		});

		it("should return event with adminToken and responses for the owner", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t, {
				creatorId: "user_abc",
				adminToken: "my-admin-token",
			});

			await t.run(async (ctx) => {
				await ctx.db.insert("responses", {
					eventId,
					respondentName: "Alice",
					selectedSlots: ["2025-01-20T10:00:00Z"],
					editToken: "token-alice",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const result = await t
				.withIdentity(userIdentity)
				.query(api.myEvents.getMyEventById, { eventId });

			expect(result).not.toBeNull();
			expect(result!.event.adminToken).toBe("my-admin-token");
			expect(result!.responses).toHaveLength(1);
			expect(result!.responses[0].respondentName).toBe("Alice");
		});

		it("should throw when non-owner tries to access event", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t, { creatorId: "user_abc" });

			await expect(
				t
					.withIdentity(otherUserIdentity)
					.query(api.myEvents.getMyEventById, { eventId }),
			).rejects.toThrow("Not authorized");
		});
	});

	describe("toggleMyEventStatus", () => {
		it("should throw when user is not authenticated", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t, { creatorId: "user_abc" });

			await expect(
				t.mutation(api.myEvents.toggleMyEventStatus, { eventId }),
			).rejects.toThrow("Not authenticated");
		});

		it("should toggle event from active to inactive", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t, {
				creatorId: "user_abc",
				isActive: true,
			});

			const result = await t
				.withIdentity(userIdentity)
				.mutation(api.myEvents.toggleMyEventStatus, { eventId });

			expect(result.newStatus).toBe(false);
		});

		it("should throw when non-owner tries to toggle", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t, { creatorId: "user_abc" });

			await expect(
				t
					.withIdentity(otherUserIdentity)
					.mutation(api.myEvents.toggleMyEventStatus, { eventId }),
			).rejects.toThrow("Not authorized");
		});
	});

	describe("deleteMyEvent", () => {
		it("should throw when user is not authenticated", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t, { creatorId: "user_abc" });

			await expect(
				t.mutation(api.myEvents.deleteMyEvent, { eventId }),
			).rejects.toThrow("Not authenticated");
		});

		it("should delete event and its responses", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t, { creatorId: "user_abc" });

			await t.run(async (ctx) => {
				await ctx.db.insert("responses", {
					eventId,
					respondentName: "Alice",
					selectedSlots: [],
					editToken: "token-1",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const result = await t
				.withIdentity(userIdentity)
				.mutation(api.myEvents.deleteMyEvent, { eventId });

			expect(result.success).toBe(true);

			// Verify event is deleted
			const deleted = await t.run(async (ctx) => {
				return await ctx.db.get(eventId);
			});
			expect(deleted).toBeNull();
		});

		it("should throw when non-owner tries to delete", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t, { creatorId: "user_abc" });

			await expect(
				t
					.withIdentity(otherUserIdentity)
					.mutation(api.myEvents.deleteMyEvent, { eventId }),
			).rejects.toThrow("Not authorized");
		});
	});
});
