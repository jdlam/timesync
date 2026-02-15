import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { verifyPassword } from "./lib/password";

// Max possible slots: 365 days * 24 hours * (60 / 15 min slots) = 35,040
const MAX_SELECTED_SLOTS = 365 * 24 * (60 / 15);

// ISO 8601 datetime pattern with range-checked month/day/hour/minute/second
const ISO_DATETIME_REGEX =
	/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d{1,3})?Z$/;

// Query: Get all responses for an event (strips editToken)
export const getByEventId = query({
	args: { eventId: v.id("events"), adminToken: v.string() },
	handler: async (ctx, args) => {
		const event = await ctx.db.get(args.eventId);
		if (!event || event.adminToken !== args.adminToken) {
			return [];
		}

		const responses = await ctx.db
			.query("responses")
			.withIndex("by_event", (q) => q.eq("eventId", args.eventId))
			.order("desc")
			.collect();
		return responses.map(({ editToken: _editToken, ...response }) => response);
	},
});

// Query: Get response by edit token
export const getByEditToken = query({
	args: { eventId: v.id("events"), editToken: v.string() },
	handler: async (ctx, args) => {
		const responses = await ctx.db
			.query("responses")
			.withIndex("by_edit_token", (q) => q.eq("editToken", args.editToken))
			.collect();

		const response = responses.find((r) => r.eventId === args.eventId);
		if (!response) {
			throw new Error("Response not found or invalid edit token");
		}
		return response;
	},
});

// Query: Count responses for an event
export const countByEventId = query({
	args: { eventId: v.id("events") },
	handler: async (ctx, args) => {
		const responses = await ctx.db
			.query("responses")
			.withIndex("by_event", (q) => q.eq("eventId", args.eventId))
			.collect();
		return responses.length;
	},
});

// Mutation: Submit a new response
export const submit = mutation({
	args: {
		eventId: v.id("events"),
		respondentName: v.string(),
		respondentComment: v.optional(v.string()),
		selectedSlots: v.array(v.string()),
		password: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		// Server-side input validation
		if (!args.respondentName || args.respondentName.length > 255) {
			throw new Error("Name must be between 1 and 255 characters");
		}
		if (args.respondentComment && args.respondentComment.length > 500) {
			throw new Error("Comment must be at most 500 characters");
		}
		if (args.selectedSlots.length === 0) {
			throw new Error("Please select at least one time slot");
		}
		if (args.selectedSlots.length > MAX_SELECTED_SLOTS) {
			throw new Error("Too many time slots selected");
		}
		for (const slot of args.selectedSlots) {
			if (!ISO_DATETIME_REGEX.test(slot)) {
				throw new Error("Each time slot must be a valid ISO 8601 datetime");
			}
		}

		// Check max respondents limit
		const event = await ctx.db.get(args.eventId);
		if (!event) {
			throw new Error("Event not found");
		}
		if (!event.isActive) {
			throw new Error("This event is no longer accepting responses");
		}

		// Verify password if event is password-protected
		if (event.password) {
			if (!args.password) {
				throw new Error("Password is required for this event");
			}
			const isValid = await verifyPassword(args.password, event.password);
			if (!isValid) {
				throw new Error("Incorrect event password");
			}
		}

		const existingResponses = await ctx.db
			.query("responses")
			.withIndex("by_event", (q) => q.eq("eventId", args.eventId))
			.collect();

		if (
			event.maxRespondents !== -1 &&
			existingResponses.length >= event.maxRespondents
		) {
			throw new Error("Maximum number of respondents reached");
		}

		const editToken = crypto.randomUUID();
		const now = Date.now();
		const responseId = await ctx.db.insert("responses", {
			eventId: args.eventId,
			respondentName: args.respondentName,
			respondentComment: args.respondentComment,
			selectedSlots: args.selectedSlots,
			editToken,
			createdAt: now,
			updatedAt: now,
		});

		return {
			responseId,
			editToken,
		};
	},
});

// Mutation: Update an existing response (requires editToken)
export const update = mutation({
	args: {
		responseId: v.id("responses"),
		editToken: v.string(),
		respondentName: v.string(),
		respondentComment: v.optional(v.string()),
		selectedSlots: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		// Server-side input validation
		if (!args.respondentName || args.respondentName.length > 255) {
			throw new Error("Name must be between 1 and 255 characters");
		}
		if (args.respondentComment && args.respondentComment.length > 500) {
			throw new Error("Comment must be at most 500 characters");
		}
		if (args.selectedSlots.length === 0) {
			throw new Error("Please select at least one time slot");
		}
		if (args.selectedSlots.length > MAX_SELECTED_SLOTS) {
			throw new Error("Too many time slots selected");
		}
		for (const slot of args.selectedSlots) {
			if (!ISO_DATETIME_REGEX.test(slot)) {
				throw new Error("Each time slot must be a valid ISO 8601 datetime");
			}
		}

		const existing = await ctx.db.get(args.responseId);
		if (!existing) {
			throw new Error("Response not found");
		}

		if (existing.editToken !== args.editToken) {
			throw new Error("Invalid edit token");
		}

		const event = await ctx.db.get(existing.eventId);
		if (!event) {
			throw new Error("Event not found");
		}
		if (!event.isActive) {
			throw new Error("This event is no longer accepting responses");
		}

		await ctx.db.patch(args.responseId, {
			respondentName: args.respondentName,
			respondentComment: args.respondentComment,
			selectedSlots: args.selectedSlots,
			updatedAt: Date.now(),
		});

		return await ctx.db.get(args.responseId);
	},
});

// Mutation: Delete a response (requires adminToken for the event)
export const remove = mutation({
	args: { responseId: v.id("responses"), adminToken: v.string() },
	handler: async (ctx, args) => {
		const response = await ctx.db.get(args.responseId);
		if (!response) {
			throw new Error("Response not found");
		}

		const event = await ctx.db.get(response.eventId);
		if (!event || event.adminToken !== args.adminToken) {
			throw new Error("Invalid admin token");
		}

		await ctx.db.delete(args.responseId);
		return { success: true };
	},
});
