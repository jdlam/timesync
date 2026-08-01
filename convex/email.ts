import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	mutation,
	query,
	type MutationCtx,
	type QueryCtx,
} from "./_generated/server";

/**
 * Shared auth rule for the public unsubscribe-portal functions below: a
 * caller must present either the least-privilege `notificationToken` or the
 * full-power `adminToken` (fallback for events created before
 * notificationToken existed — old emailed links must keep working). Returns
 * null rather than throwing on any mismatch so bad/garbage tokens degrade to
 * "not found" instead of an error.
 */
async function authorizeNotificationToken(
	ctx: QueryCtx | MutationCtx,
	eventId: string,
	token: string,
): Promise<Doc<"events"> | null> {
	const id = ctx.db.normalizeId("events", eventId);
	if (!id) return null;
	const event = await ctx.db.get(id);
	if (!event) return null;
	if (token === event.notificationToken || token === event.adminToken) {
		return event;
	}
	return null;
}

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
		eventId: v.string(),
		adminToken: v.string(),
	},
	handler: async (ctx, args) => {
		const event = await ctx.db
			.query("events")
			.withIndex("by_admin_token", (q) => q.eq("adminToken", args.adminToken))
			.first();
		if (!event || event._id !== args.eventId) {
			return { success: false };
		}
		await ctx.db.patch(event._id, { notifyOnResponse: false });
		return { success: true };
	},
});

/**
 * Public query for the branded unsubscribe portal: resolves the event's
 * title and current notification state from a least-privilege token (or the
 * adminToken fallback), without exposing the rest of the event document.
 */
export const getUnsubscribeInfo = query({
	args: { eventId: v.string(), token: v.string() },
	handler: async (ctx, args) => {
		const event = await authorizeNotificationToken(ctx, args.eventId, args.token);
		if (!event) return null;
		// notifyOnResponse is only ever set to `true` explicitly (see events.create);
		// undefined means notifications were never opted into, i.e. "not sending".
		return { title: event.title, notifyOnResponse: event.notifyOnResponse === true };
	},
});

/** Public mutation for the unsubscribe portal: mutes notifyOnResponse. */
export const unsubscribe = mutation({
	args: { eventId: v.string(), token: v.string() },
	handler: async (ctx, args) => {
		const event = await authorizeNotificationToken(ctx, args.eventId, args.token);
		if (!event) return { success: false };
		await ctx.db.patch(event._id, { notifyOnResponse: false });
		return { success: true };
	},
});

/** Public mutation for the unsubscribe portal: re-enables notifyOnResponse. */
export const resubscribe = mutation({
	args: { eventId: v.string(), token: v.string() },
	handler: async (ctx, args) => {
		const event = await authorizeNotificationToken(ctx, args.eventId, args.token);
		if (!event) return { success: false };
		await ctx.db.patch(event._id, { notifyOnResponse: true });
		return { success: true };
	},
});
