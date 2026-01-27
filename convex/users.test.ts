import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

describe("users", () => {
	describe("getOrCreateUser", () => {
		it("should throw error when not authenticated", async () => {
			const t = convexTest(schema, modules);

			await expect(t.mutation(api.users.getOrCreateUser, {})).rejects.toThrow(
				"Not authenticated",
			);
		});

		it("should create a new user when authenticated and user does not exist", async () => {
			const t = convexTest(schema, modules);

			const identity = {
				subject: "clerk_user_123",
				email: "test@example.com",
				name: "Test User",
				emailVerified: true,
				pictureUrl: "https://example.com/avatar.png",
			};

			const userId = await t
				.withIdentity(identity)
				.mutation(api.users.getOrCreateUser, {});

			expect(userId).toBeDefined();

			// Verify the user was created correctly
			const user = await t.run(async (ctx) => {
				return await ctx.db.get(userId);
			});

			expect(user).not.toBeNull();
			expect(user?.clerkId).toBe("clerk_user_123");
			expect(user?.email).toBe("test@example.com");
			expect(user?.name).toBe("Test User");
			expect(user?.emailVerified).toBe(true);
			expect(user?.image).toBe("https://example.com/avatar.png");
			expect(user?.subscriptionTier).toBe("free");
		});

		it("should return existing user when authenticated and user exists", async () => {
			const t = convexTest(schema, modules);

			// Create existing user
			const existingUserId = await t.run(async (ctx) => {
				return await ctx.db.insert("users", {
					clerkId: "clerk_user_456",
					email: "existing@example.com",
					name: "Existing User",
					emailVerified: true,
					subscriptionTier: "premium",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const identity = {
				subject: "clerk_user_456",
				email: "existing@example.com",
				name: "Existing User",
			};

			const userId = await t
				.withIdentity(identity)
				.mutation(api.users.getOrCreateUser, {});

			expect(userId).toBe(existingUserId);
		});

		it("should update user info when it has changed", async () => {
			const t = convexTest(schema, modules);

			// Create existing user with old info
			await t.run(async (ctx) => {
				return await ctx.db.insert("users", {
					clerkId: "clerk_user_789",
					email: "old@example.com",
					name: "Old Name",
					emailVerified: true,
					subscriptionTier: "free",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const identity = {
				subject: "clerk_user_789",
				email: "new@example.com",
				name: "New Name",
				pictureUrl: "https://example.com/new-avatar.png",
			};

			const userId = await t
				.withIdentity(identity)
				.mutation(api.users.getOrCreateUser, {});

			const user = await t.run(async (ctx) => {
				return await ctx.db.get(userId);
			});

			expect(user?.email).toBe("new@example.com");
			expect(user?.name).toBe("New Name");
			expect(user?.image).toBe("https://example.com/new-avatar.png");
		});
	});

	describe("getCurrentUserSubscription", () => {
		it("should return null when not authenticated", async () => {
			const t = convexTest(schema, modules);

			const result = await t.query(api.users.getCurrentUserSubscription, {});

			expect(result).toBeNull();
		});

		it("should return free tier when user does not exist", async () => {
			const t = convexTest(schema, modules);

			const identity = {
				subject: "nonexistent_user",
				email: "nonexistent@example.com",
			};

			const result = await t
				.withIdentity(identity)
				.query(api.users.getCurrentUserSubscription, {});

			expect(result).not.toBeNull();
			expect(result?.tier).toBe("free");
			expect(result?.isPremium).toBe(false);
		});

		it("should return premium tier for premium user", async () => {
			const t = convexTest(schema, modules);

			// Create premium user
			await t.run(async (ctx) => {
				return await ctx.db.insert("users", {
					clerkId: "premium_user_123",
					email: "premium@example.com",
					name: "Premium User",
					emailVerified: true,
					subscriptionTier: "premium",
					subscriptionId: "sub_123",
					subscriptionExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const identity = {
				subject: "premium_user_123",
				email: "premium@example.com",
			};

			const result = await t
				.withIdentity(identity)
				.query(api.users.getCurrentUserSubscription, {});

			expect(result?.tier).toBe("premium");
			expect(result?.isPremium).toBe(true);
			expect(result?.subscriptionId).toBe("sub_123");
		});

		it("should return free tier when subscription is expired", async () => {
			const t = convexTest(schema, modules);

			// Create user with expired subscription
			await t.run(async (ctx) => {
				return await ctx.db.insert("users", {
					clerkId: "expired_user_123",
					email: "expired@example.com",
					name: "Expired User",
					emailVerified: true,
					subscriptionTier: "premium",
					subscriptionId: "sub_expired",
					subscriptionExpiresAt: Date.now() - 24 * 60 * 60 * 1000, // Expired yesterday
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const identity = {
				subject: "expired_user_123",
				email: "expired@example.com",
			};

			const result = await t
				.withIdentity(identity)
				.query(api.users.getCurrentUserSubscription, {});

			expect(result?.tier).toBe("free");
			expect(result?.isPremium).toBe(false);
		});
	});

	describe("updateSubscription (internal)", () => {
		it("should update subscription for existing customer", async () => {
			const t = convexTest(schema, modules);

			// Create user with Stripe customer ID
			const userId = await t.run(async (ctx) => {
				return await ctx.db.insert("users", {
					clerkId: "clerk_user_sub",
					email: "subscriber@example.com",
					name: "Subscriber",
					emailVerified: true,
					stripeCustomerId: "cus_12345",
					subscriptionTier: "free",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const result = await t.mutation(internal.users.updateSubscription, {
				stripeCustomerId: "cus_12345",
				subscriptionId: "sub_new",
				subscriptionTier: "premium",
				subscriptionExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
			});

			expect(result.success).toBe(true);

			const user = await t.run(async (ctx) => {
				return await ctx.db.get(userId);
			});

			expect(user?.subscriptionTier).toBe("premium");
			expect(user?.subscriptionId).toBe("sub_new");
		});

		it("should return error for non-existent customer", async () => {
			const t = convexTest(schema, modules);

			const result = await t.mutation(internal.users.updateSubscription, {
				stripeCustomerId: "cus_nonexistent",
				subscriptionId: "sub_123",
				subscriptionTier: "premium",
			});

			expect(result.success).toBe(false);
			expect(result.error).toBe("User not found");
		});
	});

	describe("setStripeCustomerId (internal)", () => {
		it("should set Stripe customer ID for existing user", async () => {
			const t = convexTest(schema, modules);

			const userId = await t.run(async (ctx) => {
				return await ctx.db.insert("users", {
					clerkId: "clerk_user_stripe",
					email: "stripe@example.com",
					name: "Stripe User",
					emailVerified: true,
					subscriptionTier: "free",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const result = await t.mutation(internal.users.setStripeCustomerId, {
				clerkId: "clerk_user_stripe",
				stripeCustomerId: "cus_new_customer",
			});

			expect(result.success).toBe(true);

			const user = await t.run(async (ctx) => {
				return await ctx.db.get(userId);
			});

			expect(user?.stripeCustomerId).toBe("cus_new_customer");
		});

		it("should return error for non-existent user", async () => {
			const t = convexTest(schema, modules);

			const result = await t.mutation(internal.users.setStripeCustomerId, {
				clerkId: "nonexistent_clerk_id",
				stripeCustomerId: "cus_123",
			});

			expect(result.success).toBe(false);
			expect(result.error).toBe("User not found");
		});
	});

	describe("ensureUserExists (internal)", () => {
		it("should create a new user when user does not exist", async () => {
			const t = convexTest(schema, modules);

			const result = await t.mutation(internal.users.ensureUserExists, {
				clerkId: "new_clerk_user",
				email: "newuser@example.com",
				name: "New User",
			});

			expect(result.success).toBe(true);
			expect(result.created).toBe(true);
			expect(result.userId).toBeDefined();

			// Verify the user was created correctly
			const user = await t.run(async (ctx) => {
				return await ctx.db.get(result.userId);
			});

			expect(user).not.toBeNull();
			expect(user?.clerkId).toBe("new_clerk_user");
			expect(user?.email).toBe("newuser@example.com");
			expect(user?.name).toBe("New User");
			expect(user?.subscriptionTier).toBe("free");
			expect(user?.emailVerified).toBe(false);
		});

		it("should return existing user when user already exists", async () => {
			const t = convexTest(schema, modules);

			// Create existing user
			const existingUserId = await t.run(async (ctx) => {
				return await ctx.db.insert("users", {
					clerkId: "existing_clerk_user",
					email: "existing@example.com",
					name: "Existing User",
					emailVerified: true,
					subscriptionTier: "premium",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			const result = await t.mutation(internal.users.ensureUserExists, {
				clerkId: "existing_clerk_user",
				email: "existing@example.com",
				name: "Existing User",
			});

			expect(result.success).toBe(true);
			expect(result.created).toBe(false);
			expect(result.userId).toBe(existingUserId);
		});

		it("should not update existing user data", async () => {
			const t = convexTest(schema, modules);

			// Create existing user with specific data
			const existingUserId = await t.run(async (ctx) => {
				return await ctx.db.insert("users", {
					clerkId: "unchanged_clerk_user",
					email: "original@example.com",
					name: "Original Name",
					emailVerified: true,
					subscriptionTier: "premium",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			});

			// Call ensureUserExists with different data
			const result = await t.mutation(internal.users.ensureUserExists, {
				clerkId: "unchanged_clerk_user",
				email: "different@example.com",
				name: "Different Name",
			});

			expect(result.success).toBe(true);
			expect(result.created).toBe(false);

			// Verify user data was NOT updated
			const user = await t.run(async (ctx) => {
				return await ctx.db.get(existingUserId);
			});

			expect(user?.email).toBe("original@example.com");
			expect(user?.name).toBe("Original Name");
			expect(user?.subscriptionTier).toBe("premium");
		});
	});
});

describe("events with subscription tier", () => {
	it("should create premium event for premium user", async () => {
		const t = convexTest(schema, modules);

		// Create premium user
		await t.run(async (ctx) => {
			return await ctx.db.insert("users", {
				clerkId: "premium_creator",
				email: "premium@example.com",
				name: "Premium Creator",
				emailVerified: true,
				subscriptionTier: "premium",
				subscriptionExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
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
			adminToken: "token",
			maxRespondents: 5, // Will be overridden to -1
			creatorId: "premium_creator",
		});

		const event = await t.run(async (ctx) => {
			return await ctx.db.get(result.eventId);
		});

		expect(event?.isPremium).toBe(true);
		expect(event?.maxRespondents).toBe(-1); // Unlimited
	});

	it("should create free event for user without subscription", async () => {
		const t = convexTest(schema, modules);

		const result = await t.mutation(api.events.create, {
			title: "Free Event",
			timeZone: "UTC",
			dates: ["2025-01-20"],
			timeRangeStart: "09:00",
			timeRangeEnd: "17:00",
			slotDuration: 30,
			adminToken: "token",
			maxRespondents: 5,
			creatorId: "nonexistent_user",
		});

		const event = await t.run(async (ctx) => {
			return await ctx.db.get(result.eventId);
		});

		expect(event?.isPremium).toBe(false);
		expect(event?.maxRespondents).toBe(5);
	});

	it("should create free event for guest user", async () => {
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

		expect(event?.isPremium).toBe(false);
		expect(event?.maxRespondents).toBe(5);
	});

	it("should create free event for premium user with expired subscription", async () => {
		const t = convexTest(schema, modules);

		// Create user with expired premium subscription
		await t.run(async (ctx) => {
			return await ctx.db.insert("users", {
				clerkId: "expired_premium_creator",
				email: "expired@example.com",
				name: "Expired Premium User",
				emailVerified: true,
				subscriptionTier: "premium",
				subscriptionId: "sub_expired",
				subscriptionExpiresAt: Date.now() - 24 * 60 * 60 * 1000, // Expired yesterday
				createdAt: Date.now(),
				updatedAt: Date.now(),
			});
		});

		const result = await t.mutation(api.events.create, {
			title: "Expired Premium Event",
			timeZone: "UTC",
			dates: ["2025-01-20"],
			timeRangeStart: "09:00",
			timeRangeEnd: "17:00",
			slotDuration: 30,
			adminToken: "token",
			maxRespondents: 5,
			creatorId: "expired_premium_creator",
		});

		const event = await t.run(async (ctx) => {
			return await ctx.db.get(result.eventId);
		});

		// Should be treated as free tier since subscription is expired
		expect(event?.isPremium).toBe(false);
		expect(event?.maxRespondents).toBe(5);
	});
});
