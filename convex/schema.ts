import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	// Users table (for registered accounts)
	users: defineTable({
		email: v.string(),
		name: v.string(),
		emailVerified: v.boolean(),
		image: v.optional(v.string()),

		// Subscription management
		subscriptionTier: v.string(), // 'free' or 'premium'
		subscriptionId: v.optional(v.string()), // Stripe subscription ID
		subscriptionExpiresAt: v.optional(v.number()), // Timestamp

		createdAt: v.number(),
		updatedAt: v.number(),
	}).index("by_email", ["email"]),

	// Events table (scheduling events)
	events: defineTable({
		// Creator info (nullable for guest users)
		creatorId: v.optional(v.id("users")),

		// Guest access token (unique secret URL for non-authenticated creators)
		adminToken: v.string(),

		// Event details
		title: v.string(),
		description: v.optional(v.string()),
		timeZone: v.string(),

		// Time slot configuration
		slotDuration: v.number(), // in minutes (15, 30, 60, or custom for premium)
		dates: v.array(v.string()), // Array of date strings ['2023-10-27', '2023-10-28']
		timeRangeStart: v.string(), // e.g., '09:00'
		timeRangeEnd: v.string(), // e.g., '17:00'

		// Premium features
		isPremium: v.boolean(),
		password: v.optional(v.string()), // Password protection (premium only)
		maxRespondents: v.number(), // 5 for free, unlimited (-1) for premium

		// Customization (premium)
		customLogo: v.optional(v.string()), // URL or base64
		customColors: v.optional(
			v.object({
				primary: v.optional(v.string()),
				secondary: v.optional(v.string()),
				background: v.optional(v.string()),
			}),
		),

		// Status
		isActive: v.boolean(),
		archivedAt: v.optional(v.number()),

		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_creator", ["creatorId"])
		.index("by_admin_token", ["adminToken"])
		.index("by_is_active", ["isActive"]),

	// Responses table (availability submissions)
	responses: defineTable({
		eventId: v.id("events"),

		// Respondent info (no auth required)
		respondentName: v.string(),
		respondentComment: v.optional(v.string()),

		// Availability data - Array of ISO timestamps
		selectedSlots: v.array(v.string()), // ["2023-10-27T10:00:00Z", "2023-10-27T10:30:00Z"]

		// Edit tracking (for allowing edits from same browser/device)
		editToken: v.string(), // Allows user to edit their response

		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_event", ["eventId"])
		.index("by_edit_token", ["editToken"]),
});
