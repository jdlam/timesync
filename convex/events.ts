import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Query: Get event by ID
export const getById = query({
	args: { eventId: v.id("events") },
	handler: async (ctx, args) => {
		const event = await ctx.db.get(args.eventId);
		if (!event) {
			throw new Error("Event not found");
		}
		if (!event.isActive) {
			throw new Error("This event is no longer accepting responses");
		}
		return event;
	},
});

// Query: Get event by ID with response count
export const getByIdWithResponseCount = query({
	args: { eventId: v.id("events") },
	handler: async (ctx, args) => {
		const event = await ctx.db.get(args.eventId);
		if (!event) {
			throw new Error("Event not found");
		}
		if (!event.isActive) {
			throw new Error("This event is no longer accepting responses");
		}

		const responses = await ctx.db
			.query("responses")
			.withIndex("by_event", (q) => q.eq("eventId", args.eventId))
			.collect();

		return {
			event,
			responseCount: responses.length,
		};
	},
});

// Query: Get event by admin token (for authentication)
export const getByAdminToken = query({
	args: { eventId: v.id("events"), adminToken: v.string() },
	handler: async (ctx, args) => {
		const event = await ctx.db.get(args.eventId);
		if (!event || event.adminToken !== args.adminToken) {
			throw new Error("Event not found or invalid admin token");
		}
		return event;
	},
});

// Mutation: Create a new event
export const create = mutation({
	args: {
		title: v.string(),
		description: v.optional(v.string()),
		timeZone: v.string(),
		dates: v.array(v.string()),
		timeRangeStart: v.string(),
		timeRangeEnd: v.string(),
		slotDuration: v.number(),
		adminToken: v.string(),
		maxRespondents: v.number(),
		creatorId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const eventId = await ctx.db.insert("events", {
			title: args.title,
			description: args.description,
			timeZone: args.timeZone,
			dates: args.dates,
			timeRangeStart: args.timeRangeStart,
			timeRangeEnd: args.timeRangeEnd,
			slotDuration: args.slotDuration,
			adminToken: args.adminToken,
			isPremium: false,
			maxRespondents: args.maxRespondents,
			creatorId: args.creatorId, // Clerk subject ID or undefined for guests
			isActive: true,
			createdAt: now,
			updatedAt: now,
		});

		return {
			eventId,
			adminToken: args.adminToken,
		};
	},
});
