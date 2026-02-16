import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/**
 * Internal query to get event data for email notifications.
 * Returns full event including adminToken (internal only).
 */
export const getEventForEmail = internalQuery({
	args: { eventId: v.id("events") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.eventId);
	},
});

/**
 * Internal query to look up a user's email by their Clerk ID.
 */
export const getUserEmailByClerkId = internalQuery({
	args: { clerkId: v.string() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		return user?.email ?? null;
	},
});

/**
 * Internal mutation to disable notifications on an event.
 * Used by the unsubscribe HTTP route.
 */
export const disableNotifications = internalMutation({
	args: {
		eventId: v.id("events"),
		adminToken: v.string(),
	},
	handler: async (ctx, args) => {
		const event = await ctx.db.get(args.eventId);
		if (!event || event.adminToken !== args.adminToken) {
			return { success: false };
		}
		await ctx.db.patch(args.eventId, { notifyOnResponse: false });
		return { success: true };
	},
});
