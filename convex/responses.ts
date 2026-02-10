import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { verifyPassword } from "./lib/password";

// Query: Get all responses for an event (strips editToken)
export const getByEventId = query({
	args: { eventId: v.id("events") },
	handler: async (ctx, args) => {
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
		editToken: v.string(),
		password: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		// Check max respondents limit
		const event = await ctx.db.get(args.eventId);
		if (!event) {
			throw new Error("Event not found");
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

		const now = Date.now();
		const responseId = await ctx.db.insert("responses", {
			eventId: args.eventId,
			respondentName: args.respondentName,
			respondentComment: args.respondentComment,
			selectedSlots: args.selectedSlots,
			editToken: args.editToken,
			createdAt: now,
			updatedAt: now,
		});

		return {
			responseId,
			editToken: args.editToken,
		};
	},
});

// Mutation: Update an existing response
export const update = mutation({
	args: {
		responseId: v.id("responses"),
		respondentName: v.string(),
		respondentComment: v.optional(v.string()),
		selectedSlots: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db.get(args.responseId);
		if (!existing) {
			throw new Error("Response not found");
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

// Mutation: Delete a response
export const remove = mutation({
	args: { responseId: v.id("responses") },
	handler: async (ctx, args) => {
		await ctx.db.delete(args.responseId);
		return { success: true };
	},
});
