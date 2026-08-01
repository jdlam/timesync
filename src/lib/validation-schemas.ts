import { z } from "zod";
import {
	getDateRangeSpanDays,
	TIER_LIMITS,
	type TierType,
} from "./tier-config";
import { isDateInPast, validateTimeRange } from "./time-utils";

/**
 * Factory function to create event schema based on tier
 */
export function createEventSchemaForTier(tier: TierType = "free") {
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

			// "times" (default) aligns on time slots; "dates" aligns on whole days.
			eventMode: z.enum(["times", "dates"]).optional(),

			// Dates-event day pattern; custom requires patternWeekdays (checked
			// in superRefine below).
			datePattern: z
				.enum(["individual", "weekends", "weekdays", "custom"])
				.optional(),
			patternWeekdays: z.array(z.number().int().min(0).max(6)).optional(),

			// Count vs span cap is enforced per event mode in superRefine below.
			dates: z
				.array(z.string())
				.min(1, "At least one date is required")
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

			// Optional guest email so the creator can be sent their event links.
			// Trimmed first so pasted values with stray whitespace behave the same
			// here as they do on the server, which trims before validating. Blank
			// (or whitespace-only) means "field left blank"; anything else must be
			// a valid address.
			creatorEmail: z
				.string()
				.trim()
				.pipe(
					z.union([
						z.literal(""),
						z.string().email("Enter a valid email address"),
					]),
				)
				.optional(),
		})
		.refine(
			(data) => {
				// Time range only applies to "times" events.
				if (data.eventMode === "dates") return true;
				// Validate that end time is after start time
				return validateTimeRange(data.timeRangeStart, data.timeRangeEnd);
			},
			{
				message: "End time must be after start time",
				path: ["timeRangeEnd"],
			},
		)
		.superRefine((data, ctx) => {
			refineDatesLimit(tier, data.eventMode, data.dates, ctx);
			refineDatePattern(data.datePattern, data.patternWeekdays, ctx);
		});
}

/**
 * A custom day pattern must name at least one weekday.
 */
function refineDatePattern(
	datePattern: string | undefined,
	patternWeekdays: number[] | undefined,
	ctx: z.RefinementCtx,
) {
	if (
		datePattern === "custom" &&
		!(patternWeekdays && patternWeekdays.length > 0)
	) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["patternWeekdays"],
			message: "Pick at least one weekday for a custom pattern",
		});
	}
}

/**
 * Enforce the candidate-date limit for both event modes:
 * - "times": at most `maxDates` individual days
 * - "dates": the candidate pool may span at most `maxDateSpanDays` calendar days
 */
function refineDatesLimit(
	tier: TierType,
	eventMode: "times" | "dates" | undefined,
	dates: string[],
	ctx: z.RefinementCtx,
) {
	const limits = TIER_LIMITS[tier];
	if (eventMode === "dates") {
		const span = getDateRangeSpanDays(dates);
		if (span > limits.maxDateSpanDays) {
			const weeks = Math.round(limits.maxDateSpanDays / 7);
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["dates"],
				message: `Dates can span at most ${weeks} weeks for ${tier} tier`,
			});
		}
		return;
	}
	if (dates.length > limits.maxDates) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["dates"],
			message: `Maximum ${limits.maxDates} dates allowed for ${tier} tier`,
		});
	}
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

			eventMode: z.enum(["times", "dates"]).optional(),
			datePattern: z
				.enum(["individual", "weekends", "weekdays", "custom"])
				.optional(),
			patternWeekdays: z.array(z.number().int().min(0).max(6)).optional(),

			// Count vs span cap is enforced per event mode in superRefine below.
			dates: z.array(z.string()).min(1, "At least one date is required"),

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
				if (data.eventMode === "dates") return true;
				return validateTimeRange(data.timeRangeStart, data.timeRangeEnd);
			},
			{
				message: "End time must be after start time",
				path: ["timeRangeEnd"],
			},
		)
		.superRefine((data, ctx) => {
			refineDatesLimit(tier, data.eventMode, data.dates, ctx);
			refineDatePattern(data.datePattern, data.patternWeekdays, ctx);
		});
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
