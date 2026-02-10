import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { hashPassword, verifyPassword } from "./lib/password";

// Query: Get event by ID (public — strips sensitive fields, respects password gate)
export const getById = query({
	args: {
		eventId: v.id("events"),
		editToken: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const event = await ctx.db.get(args.eventId);
		if (!event) {
			throw new Error("Event not found");
		}
		if (!event.isActive) {
			throw new Error("This event is no longer accepting responses");
		}

		// Password gate: if event is password-protected, require a valid editToken to bypass
		if (event.password) {
			if (!args.editToken) {
				throw new Error("This event is password-protected");
			}
			const responses = await ctx.db
				.query("responses")
				.withIndex("by_edit_token", (q) =>
					q.eq("editToken", args.editToken as string),
				)
				.collect();
			const validResponse = responses.find(
				(r) => r.eventId === args.eventId,
			);
			if (!validResponse) {
				throw new Error("This event is password-protected");
			}
		}

		const { adminToken: _adminToken, password: _password, ...safeEvent } =
			event;
		return safeEvent;
	},
});

// Query: Get event by ID with response count
export const getByIdWithResponseCount = query({
	args: { eventId: v.id("events"), password: v.optional(v.string()) },
	handler: async (ctx, args) => {
		const event = await ctx.db.get(args.eventId);
		if (!event) {
			throw new Error("Event not found");
		}
		if (!event.isActive) {
			throw new Error("This event is no longer accepting responses");
		}

		// Password gate: if event has a password, verify before returning full data
		if (event.password) {
			if (!args.password) {
				return {
					event: null,
					responseCount: 0,
					passwordRequired: true,
					wrongPassword: false,
					eventTitle: event.title,
					isPasswordProtected: true,
				};
			}

			const isValid = await verifyPassword(args.password, event.password);
			if (!isValid) {
				return {
					event: null,
					responseCount: 0,
					passwordRequired: true,
					wrongPassword: true,
					eventTitle: event.title,
					isPasswordProtected: true,
				};
			}
		}

		const responses = await ctx.db
			.query("responses")
			.withIndex("by_event", (q) => q.eq("eventId", args.eventId))
			.collect();

		// Strip sensitive fields from returned event
		const {
			adminToken: _adminToken,
			password: _password,
			...safeEvent
		} = event;

		return {
			event: { ...safeEvent, isPasswordProtected: !!event.password },
			responseCount: responses.length,
			passwordRequired: false,
			wrongPassword: false,
			eventTitle: event.title,
			isPasswordProtected: !!event.password,
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
		password: v.optional(v.union(v.string(), v.null())),
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

		// Password: null = remove, string = set/change, undefined = no change
		if (args.password === null) {
			updates.password = undefined;
		} else if (typeof args.password === "string" && event.isPremium) {
			updates.password = await hashPassword(args.password);
		}

		// Apply update
		await ctx.db.patch(args.eventId, updates);
		return await ctx.db.get(args.eventId);
	},
});

// Mutation: Toggle event active status (admin token auth)
export const toggleStatusByAdminToken = mutation({
	args: {
		eventId: v.id("events"),
		adminToken: v.string(),
	},
	handler: async (ctx, args) => {
		const event = await ctx.db.get(args.eventId);
		if (!event || event.adminToken !== args.adminToken) {
			throw new Error("Event not found or invalid admin token");
		}

		const newStatus = !event.isActive;

		await ctx.db.patch(args.eventId, {
			isActive: newStatus,
			updatedAt: Date.now(),
		});

		return { success: true, newStatus };
	},
});

// Mutation: Delete event and all responses (admin token auth)
export const deleteByAdminToken = mutation({
	args: {
		eventId: v.id("events"),
		adminToken: v.string(),
	},
	handler: async (ctx, args) => {
		const event = await ctx.db.get(args.eventId);
		if (!event || event.adminToken !== args.adminToken) {
			throw new Error("Event not found or invalid admin token");
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
		maxRespondents: v.number(),
		creatorId: v.optional(v.string()),
		creatorEmail: v.optional(v.string()),
		password: v.optional(v.string()),
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

		// Hash password if provided and premium
		const hashedPassword =
			args.password && isPremium
				? await hashPassword(args.password)
				: undefined;

		const adminToken = crypto.randomUUID();
		const now = Date.now();
		const eventId = await ctx.db.insert("events", {
			title: args.title,
			description: args.description,
			timeZone: args.timeZone,
			dates: args.dates,
			timeRangeStart: args.timeRangeStart,
			timeRangeEnd: args.timeRangeEnd,
			slotDuration: args.slotDuration,
			adminToken,
			isPremium,
			password: hashedPassword,
			maxRespondents: actualMaxRespondents,
			creatorId: args.creatorId, // Clerk subject ID or undefined for guests
			creatorEmail: args.creatorEmail, // Creator's email or undefined for guests
			isActive: true,
			createdAt: now,
			updatedAt: now,
		});

		return {
			eventId,
			adminToken,
		};
	},
});
