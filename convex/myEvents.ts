import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";

// Maximum records to load for in-memory filtering/pagination
const MAX_RECORDS_LIMIT = 1000;

/**
 * Require authenticated user
 * Returns the identity if authenticated, throws otherwise
 */
async function requireAuth(ctx: { auth: { getUserIdentity: () => Promise<unknown> } }) {
	const identity = await getCurrentUser(ctx as Parameters<typeof getCurrentUser>[0]);
	if (!identity) {
		throw new Error("Not authenticated");
	}
	return identity;
}

// Query: Get events created by the current user
export const getMyEvents = query({
	args: {
		limit: v.optional(v.number()),
		cursor: v.optional(v.string()),
		search: v.optional(v.string()),
		statusFilter: v.optional(
			v.union(v.literal("all"), v.literal("active"), v.literal("inactive")),
		),
	},
	handler: async (ctx, args) => {
		const identity = await getCurrentUser(ctx);
		if (!identity) return null;

		const limit = args.limit ?? 20;
		const creatorId = identity.subject;

		// Get events by creator using the index
		let events = await ctx.db
			.query("events")
			.withIndex("by_creator", (q) => q.eq("creatorId", creatorId))
			.order("desc")
			.take(MAX_RECORDS_LIMIT);

		// Apply search filter
		if (args.search) {
			const searchLower = args.search.toLowerCase();
			events = events.filter(
				(e) =>
					e.title.toLowerCase().includes(searchLower) ||
					e.description?.toLowerCase().includes(searchLower),
			);
		}

		// Apply status filter
		if (args.statusFilter === "active") {
			events = events.filter((e) => e.isActive);
		} else if (args.statusFilter === "inactive") {
			events = events.filter((e) => !e.isActive);
		}

		// Handle cursor-based pagination
		let startIndex = 0;
		if (args.cursor) {
			const cursorIndex = events.findIndex((e) => e._id === args.cursor);
			if (cursorIndex !== -1) {
				startIndex = cursorIndex + 1;
			}
		}

		const paginatedEvents = events.slice(startIndex, startIndex + limit);

		// Get response counts for each event
		const eventsWithCounts = await Promise.all(
			paginatedEvents.map(async (event) => {
				const responses = await ctx.db
					.query("responses")
					.withIndex("by_event", (q) => q.eq("eventId", event._id))
					.collect();
				return {
					...event,
					responseCount: responses.length,
				};
			}),
		);

		const nextCursor =
			startIndex + limit < events.length
				? paginatedEvents[paginatedEvents.length - 1]?._id
				: null;

		return {
			events: eventsWithCounts,
			nextCursor,
			totalCount: events.length,
		};
	},
});

// Query: Get single event with ownership check
export const getMyEventById = query({
	args: { eventId: v.id("events") },
	handler: async (ctx, args) => {
		const identity = await getCurrentUser(ctx);
		if (!identity) return null;

		const event = await ctx.db.get(args.eventId);
		if (!event) {
			throw new Error("Event not found");
		}

		// Check ownership
		if (event.creatorId !== identity.subject) {
			throw new Error("Not authorized: You don't own this event");
		}

		const responses = await ctx.db
			.query("responses")
			.withIndex("by_event", (q) => q.eq("eventId", args.eventId))
			.collect();

		return {
			event,
			responses,
		};
	},
});

// Mutation: Toggle event status (with ownership check)
export const toggleMyEventStatus = mutation({
	args: { eventId: v.id("events") },
	handler: async (ctx, args) => {
		const identity = await requireAuth(ctx);

		const event = await ctx.db.get(args.eventId);
		if (!event) {
			throw new Error("Event not found");
		}

		// Check ownership
		if (event.creatorId !== identity.subject) {
			throw new Error("Not authorized: You don't own this event");
		}

		const newStatus = !event.isActive;

		await ctx.db.patch(args.eventId, {
			isActive: newStatus,
			updatedAt: Date.now(),
		});

		return { success: true, newStatus };
	},
});

// Mutation: Delete event (with ownership check)
export const deleteMyEvent = mutation({
	args: { eventId: v.id("events") },
	handler: async (ctx, args) => {
		const identity = await requireAuth(ctx);

		const event = await ctx.db.get(args.eventId);
		if (!event) {
			throw new Error("Event not found");
		}

		// Check ownership
		if (event.creatorId !== identity.subject) {
			throw new Error("Not authorized: You don't own this event");
		}

		// Delete all responses for this event
		const responses = await ctx.db
			.query("responses")
			.withIndex("by_event", (q) => q.eq("eventId", args.eventId))
			.collect();

		for (const response of responses) {
			await ctx.db.delete(response._id);
		}

		// Delete the event
		await ctx.db.delete(args.eventId);

		return { success: true };
	},
});
