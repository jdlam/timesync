import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";
import { modules } from "./test.setup";

// Helper to create a test event
async function createTestEvent(
	t: ReturnType<typeof convexTest>,
	overrides: Partial<{
		maxRespondents: number;
		isActive: boolean;
		isPremium: boolean;
		password: string;
	}> = {},
): Promise<Id<"events">> {
	return await t.run(async (ctx) => {
		return await ctx.db.insert("events", {
			title: "Test Event",
			timeZone: "UTC",
			dates: ["2025-01-20"],
			timeRangeStart: "09:00",
			timeRangeEnd: "17:00",
			slotDuration: 30,
			adminToken: "admin-token",
			maxRespondents: overrides.maxRespondents ?? 5,
			isPremium: overrides.isPremium ?? false,
			password: overrides.password,
			isActive: overrides.isActive ?? true,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		});
	});
}

describe("responses", () => {
	describe("submit", () => {
		it("should submit a response successfully", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t);

			const result = await t.mutation(api.responses.submit, {
				eventId,
				respondentName: "Alice",
				respondentComment: "Looking forward to it!",
				selectedSlots: ["2025-01-20T10:00:00Z", "2025-01-20T10:30:00Z"],
			});

			expect(result.responseId).toBeDefined();
			expect(result.editToken).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			);
		});

		it("should generate unique edit tokens for different responses", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t);

			const result1 = await t.mutation(api.responses.submit, {
				eventId,
				respondentName: "Alice",
				selectedSlots: ["2025-01-20T10:00:00Z"],
			});

			const result2 = await t.mutation(api.responses.submit, {
				eventId,
				respondentName: "Bob",
				selectedSlots: ["2025-01-20T11:00:00Z"],
			});

			expect(result1.editToken).not.toBe(result2.editToken);
		});

		it("should submit a response without optional comment", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t);

			const result = await t.mutation(api.responses.submit, {
				eventId,
				respondentName: "Bob",
				selectedSlots: ["2025-01-20T14:00:00Z"],
			});

			expect(result.responseId).toBeDefined();
		});

		it("should throw error when event not found", async () => {
			const t = convexTest(schema, modules);

			// Create and delete an event to get a valid but non-existent ID
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
				t.mutation(api.responses.submit, {
					eventId,
					respondentName: "Test",
					selectedSlots: ["2025-01-20T10:00:00Z"],
				}),
			).rejects.toThrow("Event not found");
		});

		it("should throw error when max respondents reached", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t, { maxRespondents: 2 });

			// Add 2 responses to reach the limit
			await t.run(async (ctx) => {
				await ctx.db.insert("responses", {
					eventId,
					respondentName: "User 1",
					selectedSlots: ["2025-01-20T10:00:00Z"],
					editToken: "token-1",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
				await ctx.db.insert("responses", {
					eventId,
					respondentName: "User 2",
					selectedSlots: ["2025-01-20T11:00:00Z"],
					editToken: "token-2",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			// Try to add a third response
			await expect(
				t.mutation(api.responses.submit, {
					eventId,
					respondentName: "User 3",
					selectedSlots: ["2025-01-20T12:00:00Z"],
				}),
			).rejects.toThrow("Maximum number of respondents reached");
		});

		it("should allow unlimited responses when maxRespondents is -1", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t, {
				maxRespondents: -1,
				isPremium: true,
			});

			// Add several responses
			for (let i = 0; i < 10; i++) {
				await t.mutation(api.responses.submit, {
					eventId,
					respondentName: `User ${i}`,
					selectedSlots: ["2025-01-20T10:00:00Z"],
				});
			}

			// Should still allow more
			const result = await t.mutation(api.responses.submit, {
				eventId,
				respondentName: "User 11",
				selectedSlots: ["2025-01-20T10:00:00Z"],
			});

			expect(result.responseId).toBeDefined();
		});

		it("should allow response when under max respondents limit", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t, { maxRespondents: 3 });

			// Add 2 responses
			await t.run(async (ctx) => {
				await ctx.db.insert("responses", {
					eventId,
					respondentName: "User 1",
					selectedSlots: [],
					editToken: "token-1",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
				await ctx.db.insert("responses", {
					eventId,
					respondentName: "User 2",
					selectedSlots: [],
					editToken: "token-2",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			// Third response should succeed
			const result = await t.mutation(api.responses.submit, {
				eventId,
				respondentName: "User 3",
				selectedSlots: ["2025-01-20T10:00:00Z"],
			});

			expect(result.responseId).toBeDefined();
		});

		it("should reject name longer than 255 characters", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t);

			await expect(
				t.mutation(api.responses.submit, {
					eventId,
					respondentName: "a".repeat(256),
					selectedSlots: ["2025-01-20T10:00:00Z"],
				}),
			).rejects.toThrow("Name must be between 1 and 255 characters");
		});

		it("should reject comment longer than 500 characters", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t);

			await expect(
				t.mutation(api.responses.submit, {
					eventId,
					respondentName: "Alice",
					respondentComment: "a".repeat(501),
					selectedSlots: ["2025-01-20T10:00:00Z"],
				}),
			).rejects.toThrow("Comment must be at most 500 characters");
		});

		it("should reject empty selectedSlots", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t);

			await expect(
				t.mutation(api.responses.submit, {
					eventId,
					respondentName: "Alice",
					selectedSlots: [],
				}),
			).rejects.toThrow("Please select at least one time slot");
		});
	});

	describe("getByEventId", () => {
		it("should return empty array for event with no responses", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t);

			const responses = await t.query(api.responses.getByEventId, { eventId });

			expect(responses).toEqual([]);
		});

		it("should not return editToken in responses", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t);

			await t.run(async (ctx) => {
				await ctx.db.insert("responses", {
					eventId,
					respondentName: "Alice",
					selectedSlots: ["2025-01-20T10:00:00Z"],
					editToken: "secret-edit-token",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const responses = await t.query(api.responses.getByEventId, {
				eventId,
			});

			expect(responses).toHaveLength(1);
			expect(responses[0].respondentName).toBe("Alice");
			expect(
				(responses[0] as Record<string, unknown>).editToken,
			).toBeUndefined();
		});

		it("should return all responses for an event", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t);

			await t.run(async (ctx) => {
				await ctx.db.insert("responses", {
					eventId,
					respondentName: "Alice",
					selectedSlots: ["2025-01-20T10:00:00Z"],
					editToken: "token-alice",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
				await ctx.db.insert("responses", {
					eventId,
					respondentName: "Bob",
					selectedSlots: ["2025-01-20T11:00:00Z"],
					editToken: "token-bob",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const responses = await t.query(api.responses.getByEventId, { eventId });

			expect(responses).toHaveLength(2);
			const names = responses.map((r) => r.respondentName);
			expect(names).toContain("Alice");
			expect(names).toContain("Bob");
		});
	});

	describe("getByEditToken", () => {
		it("should return response with valid edit token", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t);

			await t.run(async (ctx) => {
				await ctx.db.insert("responses", {
					eventId,
					respondentName: "Alice",
					selectedSlots: ["2025-01-20T10:00:00Z"],
					editToken: "unique-edit-token",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const response = await t.query(api.responses.getByEditToken, {
				eventId,
				editToken: "unique-edit-token",
			});

			expect(response.respondentName).toBe("Alice");
		});

		it("should throw error for invalid edit token", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t);

			await expect(
				t.query(api.responses.getByEditToken, {
					eventId,
					editToken: "non-existent-token",
				}),
			).rejects.toThrow("Response not found or invalid edit token");
		});

		it("should throw error when token exists but for different event", async () => {
			const t = convexTest(schema, modules);
			const eventId1 = await createTestEvent(t);
			const eventId2 = await createTestEvent(t);

			await t.run(async (ctx) => {
				await ctx.db.insert("responses", {
					eventId: eventId1,
					respondentName: "Alice",
					selectedSlots: [],
					editToken: "alice-token",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			// Try to get Alice's response using event2's ID
			await expect(
				t.query(api.responses.getByEditToken, {
					eventId: eventId2,
					editToken: "alice-token",
				}),
			).rejects.toThrow("Response not found or invalid edit token");
		});
	});

	describe("countByEventId", () => {
		it("should return 0 for event with no responses", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t);

			const count = await t.query(api.responses.countByEventId, { eventId });

			expect(count).toBe(0);
		});

		it("should return correct count", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t);

			await t.run(async (ctx) => {
				for (let i = 0; i < 5; i++) {
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

			const count = await t.query(api.responses.countByEventId, { eventId });

			expect(count).toBe(5);
		});
	});

	describe("update", () => {
		it("should update response fields with valid editToken", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t);

			const responseId = await t.run(async (ctx) => {
				return await ctx.db.insert("responses", {
					eventId,
					respondentName: "Original Name",
					selectedSlots: ["2025-01-20T10:00:00Z"],
					editToken: "valid-edit-token",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const updated = await t.mutation(api.responses.update, {
				responseId,
				editToken: "valid-edit-token",
				respondentName: "Updated Name",
				respondentComment: "New comment",
				selectedSlots: ["2025-01-20T14:00:00Z", "2025-01-20T14:30:00Z"],
			});

			expect(updated?.respondentName).toBe("Updated Name");
			expect(updated?.respondentComment).toBe("New comment");
			expect(updated?.selectedSlots).toHaveLength(2);
		});

		it("should reject update with invalid editToken", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t);

			const responseId = await t.run(async (ctx) => {
				return await ctx.db.insert("responses", {
					eventId,
					respondentName: "Original Name",
					selectedSlots: ["2025-01-20T10:00:00Z"],
					editToken: "correct-token",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			await expect(
				t.mutation(api.responses.update, {
					responseId,
					editToken: "wrong-token",
					respondentName: "Hacked Name",
					selectedSlots: ["2025-01-20T10:00:00Z"],
				}),
			).rejects.toThrow("Invalid edit token");
		});

		it("should throw error for non-existent response", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t);

			// Create and delete a response to get a valid but non-existent ID
			const responseId = await t.run(async (ctx) => {
				const id = await ctx.db.insert("responses", {
					eventId,
					respondentName: "Temp",
					selectedSlots: [],
					editToken: "token",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
				await ctx.db.delete(id);
				return id;
			});

			await expect(
				t.mutation(api.responses.update, {
					responseId,
					editToken: "token",
					respondentName: "New Name",
					selectedSlots: ["2025-01-20T10:00:00Z"],
				}),
			).rejects.toThrow("Response not found");
		});
	});

	describe("remove", () => {
		it("should delete a response with valid adminToken", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t);

			const responseId = await t.run(async (ctx) => {
				return await ctx.db.insert("responses", {
					eventId,
					respondentName: "To Delete",
					selectedSlots: [],
					editToken: "token",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const result = await t.mutation(api.responses.remove, {
				responseId,
				adminToken: "admin-token",
			});

			expect(result.success).toBe(true);

			// Verify it's deleted
			const deleted = await t.run(async (ctx) => {
				return await ctx.db.get(responseId);
			});
			expect(deleted).toBeNull();
		});

		it("should reject deletion with invalid adminToken", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t);

			const responseId = await t.run(async (ctx) => {
				return await ctx.db.insert("responses", {
					eventId,
					respondentName: "Protected",
					selectedSlots: [],
					editToken: "token",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			await expect(
				t.mutation(api.responses.remove, {
					responseId,
					adminToken: "wrong-admin-token",
				}),
			).rejects.toThrow("Invalid admin token");
		});

		it("should reject deletion of non-existent response", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t);

			const responseId = await t.run(async (ctx) => {
				const id = await ctx.db.insert("responses", {
					eventId,
					respondentName: "Temp",
					selectedSlots: [],
					editToken: "token",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
				await ctx.db.delete(id);
				return id;
			});

			await expect(
				t.mutation(api.responses.remove, {
					responseId,
					adminToken: "admin-token",
				}),
			).rejects.toThrow("Response not found");
		});
	});

	describe("submit with password", () => {
		it("should allow submission when event has no password", async () => {
			const t = convexTest(schema, modules);
			const eventId = await createTestEvent(t);

			const result = await t.mutation(api.responses.submit, {
				eventId,
				respondentName: "Alice",
				selectedSlots: ["2025-01-20T10:00:00Z"],
			});

			expect(result.responseId).toBeDefined();
		});

		it("should require password when event has one", async () => {
			const t = convexTest(schema, modules);

			// Use hashPassword to create a real hash
			const { hashPassword } = await import("./lib/password");
			const hashedPw = await hashPassword("event-pass");

			const eventId = await createTestEvent(t, {
				isPremium: true,
				password: hashedPw,
			});

			await expect(
				t.mutation(api.responses.submit, {
					eventId,
					respondentName: "Alice",
					selectedSlots: ["2025-01-20T10:00:00Z"],
				}),
			).rejects.toThrow("Password is required for this event");
		});

		it("should reject incorrect password", async () => {
			const t = convexTest(schema, modules);

			const { hashPassword } = await import("./lib/password");
			const hashedPw = await hashPassword("correct-pass");

			const eventId = await createTestEvent(t, {
				isPremium: true,
				password: hashedPw,
			});

			await expect(
				t.mutation(api.responses.submit, {
					eventId,
					respondentName: "Alice",
					selectedSlots: ["2025-01-20T10:00:00Z"],
					password: "wrong-pass",
				}),
			).rejects.toThrow("Incorrect event password");
		});

		it("should accept correct password", async () => {
			const t = convexTest(schema, modules);

			const { hashPassword } = await import("./lib/password");
			const hashedPw = await hashPassword("correct-pass");

			const eventId = await createTestEvent(t, {
				isPremium: true,
				password: hashedPw,
			});

			const result = await t.mutation(api.responses.submit, {
				eventId,
				respondentName: "Alice",
				selectedSlots: ["2025-01-20T10:00:00Z"],
				password: "correct-pass",
			});

			expect(result.responseId).toBeDefined();
		});
	});
});
