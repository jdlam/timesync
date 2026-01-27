import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";

/**
 * Get or create a user record from Clerk identity
 * Called when a user signs in to sync their Clerk data with Convex
 */
export const getOrCreateUser = mutation({
	args: {},
	handler: async (ctx) => {
		const identity = await getCurrentUser(ctx);
		if (!identity) {
			throw new Error("Not authenticated");
		}

		// Check if user already exists by clerkId
		const existingUser = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
			.unique();

		if (existingUser) {
			// Update user info if changed
			const updates: Record<string, unknown> = { updatedAt: Date.now() };
			let needsUpdate = false;

			if (identity.email && existingUser.email !== identity.email) {
				updates.email = identity.email;
				needsUpdate = true;
			}
			if (identity.name && existingUser.name !== identity.name) {
				updates.name = identity.name;
				needsUpdate = true;
			}
			if (
				identity.pictureUrl !== undefined &&
				existingUser.image !== identity.pictureUrl
			) {
				updates.image = identity.pictureUrl;
				needsUpdate = true;
			}

			if (needsUpdate) {
				await ctx.db.patch(existingUser._id, updates);
			}

			return existingUser._id;
		}

		// Create new user
		const now = Date.now();
		const userId = await ctx.db.insert("users", {
			clerkId: identity.subject,
			email: identity.email ?? "",
			name: identity.name ?? identity.email ?? "Unknown",
			emailVerified: identity.emailVerified ?? false,
			image: identity.pictureUrl,
			subscriptionTier: "free",
			createdAt: now,
			updatedAt: now,
		});

		return userId;
	},
});

/**
 * Get current user's subscription status
 * Returns null if not authenticated
 */
export const getCurrentUserSubscription = query({
	args: {},
	handler: async (ctx) => {
		const identity = await getCurrentUser(ctx);
		if (!identity) {
			return null;
		}

		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
			.unique();

		if (!user) {
			// User record doesn't exist yet, treat as free tier
			return {
				tier: "free" as const,
				isPremium: false,
				subscriptionId: null,
				expiresAt: null,
			};
		}

		const isPremium = user.subscriptionTier === "premium";
		const isExpired =
			user.subscriptionExpiresAt && user.subscriptionExpiresAt < Date.now();

		return {
			tier: isExpired ? ("free" as const) : (user.subscriptionTier as "free" | "premium"),
			isPremium: isPremium && !isExpired,
			subscriptionId: user.subscriptionId ?? null,
			expiresAt: user.subscriptionExpiresAt ?? null,
		};
	},
});

/**
 * Get current user record (internal use)
 */
export const getCurrentUserRecord = query({
	args: {},
	handler: async (ctx) => {
		const identity = await getCurrentUser(ctx);
		if (!identity) {
			return null;
		}

		return await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
			.unique();
	},
});

/**
 * Internal mutation to update subscription status (called by webhook)
 */
export const updateSubscription = internalMutation({
	args: {
		stripeCustomerId: v.string(),
		subscriptionId: v.string(),
		subscriptionTier: v.string(),
		subscriptionExpiresAt: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_stripe_customer", (q) =>
				q.eq("stripeCustomerId", args.stripeCustomerId),
			)
			.unique();

		if (!user) {
			console.error(
				`[Stripe Webhook] No user found for customer: ${args.stripeCustomerId}`,
			);
			return { success: false, error: "User not found" };
		}

		await ctx.db.patch(user._id, {
			subscriptionId: args.subscriptionId,
			subscriptionTier: args.subscriptionTier,
			subscriptionExpiresAt: args.subscriptionExpiresAt,
			updatedAt: Date.now(),
		});

		console.log(
			`[Stripe Webhook] Updated subscription for user ${user._id}: tier=${args.subscriptionTier}`,
		);
		return { success: true };
	},
});

/**
 * Internal mutation to ensure a user record exists
 * Creates the user if they don't exist, otherwise does nothing
 */
export const ensureUserExists = internalMutation({
	args: {
		clerkId: v.string(),
		email: v.string(),
		name: v.string(),
	},
	handler: async (ctx, args) => {
		const existingUser = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
			.unique();

		if (existingUser) {
			return { success: true, userId: existingUser._id, created: false };
		}

		// Create new user
		const now = Date.now();
		const userId = await ctx.db.insert("users", {
			clerkId: args.clerkId,
			email: args.email,
			name: args.name,
			emailVerified: false,
			subscriptionTier: "free",
			createdAt: now,
			updatedAt: now,
		});

		console.log(`[Users] Created new user record for clerkId: ${args.clerkId}`);
		return { success: true, userId, created: true };
	},
});

/**
 * Internal mutation to set Stripe customer ID on user
 */
export const setStripeCustomerId = internalMutation({
	args: {
		clerkId: v.string(),
		stripeCustomerId: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
			.unique();

		if (!user) {
			console.error(
				`[Stripe] No user found for clerkId: ${args.clerkId}`,
			);
			return { success: false, error: "User not found" };
		}

		await ctx.db.patch(user._id, {
			stripeCustomerId: args.stripeCustomerId,
			updatedAt: Date.now(),
		});

		return { success: true };
	},
});
