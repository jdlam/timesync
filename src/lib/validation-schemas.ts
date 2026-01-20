import { z } from "zod";
import { TIER_LIMITS } from "./tier-config";
import { isDateInPast, validateTimeRange } from "./time-utils";

/**
 * Validation schema for event creation
 */
export const createEventSchema = z
	.object({
		title: z
			.string()
			.min(1, "Title is required")
			.max(255, "Title must be less than 255 characters"),

		description: z
			.string()
			.max(1000, "Description must be less than 1000 characters")
			.optional(),

		timeZone: z.string().min(1, "Timezone is required"),

		dates: z
			.array(z.string())
			.min(1, "At least one date is required")
			.max(
				TIER_LIMITS.free.maxDates,
				`Maximum ${TIER_LIMITS.free.maxDates} dates allowed for free tier`,
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
		.max(500, "Comment must be less than 500 characters")
		.optional(),

	selectedSlots: z
		.array(z.string())
		.min(1, "Please select at least one time slot"),
});

/**
 * Validation schema for editing an existing event
 * Note: Does not validate past dates (allows keeping existing past dates)
 * Note: Slot duration and timezone are not editable
 */
export const editEventSchema = z
	.object({
		title: z
			.string()
			.min(1, "Title is required")
			.max(255, "Title must be less than 255 characters"),

		description: z
			.string()
			.max(1000, "Description must be less than 1000 characters")
			.optional()
			.nullable(),

		dates: z
			.array(z.string())
			.min(1, "At least one date is required")
			.max(
				TIER_LIMITS.free.maxDates,
				`Maximum ${TIER_LIMITS.free.maxDates} dates allowed for free tier`,
			),

		timeRangeStart: z
			.string()
			.regex(/^\d{2}:\d{2}$/, "Time must be in HH:mm format"),

		timeRangeEnd: z
			.string()
			.regex(/^\d{2}:\d{2}$/, "Time must be in HH:mm format"),
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

/**
 * Type exports for TypeScript inference
 */
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type SubmitResponseInput = z.infer<typeof submitResponseSchema>;
export type EditEventInput = z.infer<typeof editEventSchema>;
