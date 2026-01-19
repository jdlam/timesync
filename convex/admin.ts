import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { checkSuperAdmin, requireSuperAdmin } from "./lib/auth";

// Maximum records to load for in-memory filtering/pagination
// This prevents OOM issues while keeping reasonable admin functionality
const MAX_RECORDS_LIMIT = 1000;

// Query: Check if user is super admin (for frontend access control)
export const checkAccess = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		const superAdminIdentity = await checkSuperAdmin(ctx);

		// Log unauthorized access attempts (authenticated but not super admin)
		if (identity && !superAdminIdentity) {
			console.warn(
				`[UNAUTHORIZED] Admin access attempt by non-super-admin user: ${identity.email} (${identity.subject})`,
			);
		}

		return {
			isAuthenticated: identity !== null,
			isSuperAdmin: superAdminIdentity !== null,
			email: identity?.email,
		};
	},
});

// Query: Get admin statistics
// Note: For very large datasets, consider maintaining separate counter documents
export const getStats = query({
	args: {},
	handler: async (ctx) => {
		const identity = await checkSuperAdmin(ctx);
		if (!identity) return null;

		// Use take() to limit memory usage - stats will be approximate for very large datasets
		const events = await ctx.db.query("events").take(MAX_RECORDS_LIMIT);
		const responses = await ctx.db.query("responses").take(MAX_RECORDS_LIMIT);

		const now = Date.now();
		const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

		const activeEvents = events.filter((e) => e.isActive).length;
		const eventsThisWeek = events.filter(
			(e) => e.createdAt >= oneWeekAgo,
		).length;
		const responsesThisWeek = responses.filter(
			(r) => r.createdAt >= oneWeekAgo,
		).length;

		return {
			totalEvents: events.length,
			totalResponses: responses.length,
			activeEvents,
			inactiveEvents: events.length - activeEvents,
			eventsThisWeek,
			responsesThisWeek,
		};
	},
});

// Query: Get all events with pagination
// Note: Uses in-memory filtering for search. For very large datasets, consider using Convex search indexes.
export const getAllEvents = query({
	args: {
		limit: v.optional(v.number()),
		cursor: v.optional(v.string()),
		search: v.optional(v.string()),
		statusFilter: v.optional(
			v.union(v.literal("all"), v.literal("active"), v.literal("inactive")),
		),
	},
	handler: async (ctx, args) => {
		const identity = await checkSuperAdmin(ctx);
		if (!identity) return null;

		const limit = args.limit ?? 20;

		// Use take() to limit memory usage
		let events = await ctx.db
			.query("events")
			.order("desc")
			.take(MAX_RECORDS_LIMIT);

		// Apply search filter
		if (args.search) {
			const searchLower = args.search.toLowerCase();
			events = events.filter(
				(e) =>
					e.title.toLowerCase().includes(searchLower) ||
					e.description?.toLowerCase().includes(searchLower)
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
			})
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

// Query: Get single event with full details
export const getEventById = query({
	args: { eventId: v.id("events") },
	handler: async (ctx, args) => {
		const identity = await checkSuperAdmin(ctx);
		if (!identity) return null;

		const event = await ctx.db.get(args.eventId);
		if (!event) {
			throw new Error("Event not found");
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

// Query: Get all responses with pagination
// Note: Uses in-memory filtering for search. For very large datasets, consider using Convex search indexes.
export const getAllResponses = query({
	args: {
		limit: v.optional(v.number()),
		cursor: v.optional(v.string()),
		search: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await checkSuperAdmin(ctx);
		if (!identity) return null;

		const limit = args.limit ?? 20;

		// Use take() to limit memory usage
		let responses = await ctx.db
			.query("responses")
			.order("desc")
			.take(MAX_RECORDS_LIMIT);

		// Apply search filter
		if (args.search) {
			const searchLower = args.search.toLowerCase();
			responses = responses.filter((r) =>
				r.respondentName.toLowerCase().includes(searchLower)
			);
		}

		// Handle cursor-based pagination
		let startIndex = 0;
		if (args.cursor) {
			const cursorIndex = responses.findIndex((r) => r._id === args.cursor);
			if (cursorIndex !== -1) {
				startIndex = cursorIndex + 1;
			}
		}

		const paginatedResponses = responses.slice(startIndex, startIndex + limit);

		// Get event titles for each response
		const responsesWithEvents = await Promise.all(
			paginatedResponses.map(async (response) => {
				const event = await ctx.db.get(response.eventId);
				return {
					...response,
					eventTitle: event?.title ?? "Unknown Event",
					eventIsActive: event?.isActive ?? false,
				};
			})
		);

		const nextCursor =
			startIndex + limit < responses.length
				? paginatedResponses[paginatedResponses.length - 1]?._id
				: null;

		return {
			responses: responsesWithEvents,
			nextCursor,
			totalCount: responses.length,
		};
	},
});

// Query: Get audit logs with pagination
export const getAuditLogs = query({
	args: {
		limit: v.optional(v.number()),
		cursor: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await checkSuperAdmin(ctx);
		if (!identity) return null;

		const limit = args.limit ?? 50;

		// Use take() to limit memory usage
		const logs = await ctx.db
			.query("auditLogs")
			.withIndex("by_created")
			.order("desc")
			.take(MAX_RECORDS_LIMIT);

		// Handle cursor-based pagination
		let startIndex = 0;
		if (args.cursor) {
			const cursorIndex = logs.findIndex((l) => l._id === args.cursor);
			if (cursorIndex !== -1) {
				startIndex = cursorIndex + 1;
			}
		}

		const paginatedLogs = logs.slice(startIndex, startIndex + limit);

		const nextCursor =
			startIndex + limit < logs.length
				? paginatedLogs[paginatedLogs.length - 1]?._id
				: null;

		return {
			logs: paginatedLogs,
			nextCursor,
			totalCount: logs.length,
		};
	},
});

// Mutation: Toggle event active status
export const toggleEventStatus = mutation({
	args: { eventId: v.id("events") },
	handler: async (ctx, args) => {
		const identity = await requireSuperAdmin(ctx);

		const event = await ctx.db.get(args.eventId);
		if (!event) {
			throw new Error("Event not found");
		}

		const newStatus = !event.isActive;

		await ctx.db.patch(args.eventId, {
			isActive: newStatus,
			updatedAt: Date.now(),
		});

		// Log the action
		await ctx.db.insert("auditLogs", {
			userId: identity.subject,
			userEmail: identity.email ?? "unknown",
			action: "toggle_event_status",
			targetType: "event",
			targetId: args.eventId,
			metadata: {
				eventTitle: event.title,
				previousStatus: event.isActive,
				newStatus,
			},
			createdAt: Date.now(),
		});

		return { success: true, newStatus };
	},
});

// Mutation: Delete event permanently
export const deleteEvent = mutation({
	args: { eventId: v.id("events") },
	handler: async (ctx, args) => {
		const identity = await requireSuperAdmin(ctx);

		const event = await ctx.db.get(args.eventId);
		if (!event) {
			throw new Error("Event not found");
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

		// Log the action
		await ctx.db.insert("auditLogs", {
			userId: identity.subject,
			userEmail: identity.email ?? "unknown",
			action: "delete_event",
			targetType: "event",
			targetId: args.eventId,
			metadata: {
				eventTitle: event.title,
				responsesDeleted: responses.length,
			},
			createdAt: Date.now(),
		});

		return { success: true };
	},
});

// Mutation: Delete response
export const deleteResponse = mutation({
	args: { responseId: v.id("responses") },
	handler: async (ctx, args) => {
		const identity = await requireSuperAdmin(ctx);

		const response = await ctx.db.get(args.responseId);
		if (!response) {
			throw new Error("Response not found");
		}

		const event = await ctx.db.get(response.eventId);

		// Delete the response
		await ctx.db.delete(args.responseId);

		// Log the action
		await ctx.db.insert("auditLogs", {
			userId: identity.subject,
			userEmail: identity.email ?? "unknown",
			action: "delete_response",
			targetType: "response",
			targetId: args.responseId,
			metadata: {
				respondentName: response.respondentName,
				eventId: response.eventId,
				eventTitle: event?.title ?? "Unknown Event",
			},
			createdAt: Date.now(),
		});

		return { success: true };
	},
});
