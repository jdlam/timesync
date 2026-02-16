import { z } from "zod";
import { TIER_LIMITS, type TierType } from "./tier-config";
import { isDateInPast, validateTimeRange } from "./time-utils";

/**
 * Factory function to create event schema based on tier
 */
export function createEventSchemaForTier(tier: TierType = "free") {
	const limits = TIER_LIMITS[tier];

	return z
		.object({
			title: z
				.string()
				.min(1, "Title is required")
				.max(255, "Title must be less than 255 characters"),

			description: z
				.string()
				.max(1000, "Description must be at most 1000 characters")
				.optional(),

			timeZone: z.string().min(1, "Timezone is required"),

			dates: z
				.array(z.string())
				.min(1, "At least one date is required")
				.max(
					limits.maxDates,
					`Maximum ${limits.maxDates} dates allowed for ${tier} tier`,
				)
				.refine(
					(dates) => {
						// Check if any dates are in the past
						return !dates.some((date) => isDateInPast(date));
					},
					{ message: "Cannot select dates in the past" },
				),

			timeRangeStart: z
				.string()
				.regex(/^\d{2}:\d{2}$/, "Time must be in HH:mm format"),

			timeRangeEnd: z
				.string()
				.regex(/^\d{2}:\d{2}$/, "Time must be in HH:mm format"),

			slotDuration: z.enum(["15", "30", "60"], {
				message: "Slot duration must be 15, 30, or 60 minutes",
			}),

			password:
				tier === "premium"
					? z
							.string()
							.optional()
							.refine((val) => !val || val.length >= 4, {
								message: "Password must be at least 4 characters",
							})
							.refine((val) => !val || val.length <= 128, {
								message: "Password must be less than 128 characters",
							})
					: z
							.string()
							.optional()
							.refine((val) => !val, {
								message: "Password protection requires premium",
							}),

			notifyOnResponse: z.boolean().optional(),
		})
		.refine(
			(data) => {
				// Validate that end time is after start time
				return validateTimeRange(data.timeRangeStart, data.timeRangeEnd);
			},
			{
				message: "End time must be after start time",
				path: ["timeRangeEnd"],
			},
		);
}

/**
 * Validation schema for event creation (default: free tier)
 */
export const createEventSchema = createEventSchemaForTier("free");

/**
 * Validation schema for response submission
 */
export const submitResponseSchema = z.object({
	respondentName: z
		.string()
		.min(1, "Name is required")
		.max(255, "Name must be less than 255 characters"),

	respondentComment: z
		.string()
		.max(500, "Comment must be at most 500 characters")
		.optional(),

	selectedSlots: z
		.array(z.string())
		.min(1, "Please select at least one time slot"),
});

/**
 * Factory function to create edit event schema based on tier
 * Note: Does not validate past dates (allows keeping existing past dates)
 * Note: Slot duration and timezone are not editable
 */
export function editEventSchemaForTier(tier: TierType = "free") {
	const limits = TIER_LIMITS[tier];

	return z
		.object({
			title: z
				.string()
				.min(1, "Title is required")
				.max(255, "Title must be less than 255 characters"),

			description: z
				.string()
				.max(1000, "Description must be at most 1000 characters")
				.optional()
				.nullable(),

			dates: z
				.array(z.string())
				.min(1, "At least one date is required")
				.max(
					limits.maxDates,
					`Maximum ${limits.maxDates} dates allowed for ${tier} tier`,
				),

			timeRangeStart: z
				.string()
				.regex(/^\d{2}:\d{2}$/, "Time must be in HH:mm format"),

			timeRangeEnd: z
				.string()
				.regex(/^\d{2}:\d{2}$/, "Time must be in HH:mm format"),

			password:
				tier === "premium"
					? z
							.string()
							.optional()
							.nullable()
							.refine((val) => !val || val.length >= 4, {
								message: "Password must be at least 4 characters",
							})
							.refine((val) => !val || val.length <= 128, {
								message: "Password must be less than 128 characters",
							})
					: z.string().optional().nullable(),

			notifyOnResponse: z.boolean().optional(),
		})
		.refine(
			(data) => {
				return validateTimeRange(data.timeRangeStart, data.timeRangeEnd);
			},
			{
				message: "End time must be after start time",
				path: ["timeRangeEnd"],
			},
		);
}

/**
 * Validation schema for editing an existing event (default: free tier)
 */
export const editEventSchema = editEventSchemaForTier("free");

/**
 * Type exports for TypeScript inference
 */
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type SubmitResponseInput = z.infer<typeof submitResponseSchema>;
export type EditEventInput = z.infer<typeof editEventSchema>;
