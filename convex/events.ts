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

// Query: Get response count for an event (used for edit warning)
export const getResponseCount = query({
	args: { eventId: v.id("events"), adminToken: v.string() },
	handler: async (ctx, args) => {
		const event = await ctx.db.get(args.eventId);
		if (!event || event.adminToken !== args.adminToken) {
			return null;
		}

		const responses = await ctx.db
			.query("responses")
			.withIndex("by_event", (q) => q.eq("eventId", args.eventId))
			.collect();

		return { count: responses.length };
	},
});

// Mutation: Update an event (admin only)
export const update = mutation({
	args: {
		eventId: v.id("events"),
		adminToken: v.string(),
		title: v.optional(v.string()),
		description: v.optional(v.union(v.string(), v.null())),
		dates: v.optional(v.array(v.string())),
		timeRangeStart: v.optional(v.string()),
		timeRangeEnd: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		// Validate admin token
		const event = await ctx.db.get(args.eventId);
		if (!event || event.adminToken !== args.adminToken) {
			throw new Error("Event not found or invalid admin token");
		}

		// Build update object with only provided fields
		const updates: Record<string, unknown> = { updatedAt: Date.now() };
		if (args.title !== undefined) updates.title = args.title;
		if (args.description !== undefined)
			updates.description = args.description ?? undefined;
		if (args.dates !== undefined) updates.dates = args.dates;
		if (args.timeRangeStart !== undefined)
			updates.timeRangeStart = args.timeRangeStart;
		if (args.timeRangeEnd !== undefined)
			updates.timeRangeEnd = args.timeRangeEnd;

		// Apply update
		await ctx.db.patch(args.eventId, updates);
		return await ctx.db.get(args.eventId);
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
		creatorEmail: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		// Check if creator has premium subscription
		let isPremium = false;
		let actualMaxRespondents = args.maxRespondents;

		if (args.creatorId) {
			const user = await ctx.db
				.query("users")
				.withIndex("by_clerk_id", (q) => q.eq("clerkId", args.creatorId as string))
				.unique();

			if (user) {
				const isSubscriptionActive =
					user.subscriptionTier === "premium" &&
					(!user.subscriptionExpiresAt ||
						user.subscriptionExpiresAt > Date.now());

				if (isSubscriptionActive) {
					isPremium = true;
					actualMaxRespondents = -1; // Unlimited for premium
				}
			}
		}

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
			isPremium,
			maxRespondents: actualMaxRespondents,
			creatorId: args.creatorId, // Clerk subject ID or undefined for guests
			creatorEmail: args.creatorEmail, // Creator's email or undefined for guests
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
