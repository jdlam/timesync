import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type CreateEventInput,
	createEventSchema,
	createEventSchemaForTier,
	type EditEventInput,
	editEventSchema,
	editEventSchemaForTier,
	type SubmitResponseInput,
	submitResponseSchema,
} from "./validation-schemas";

describe("validation-schemas", () => {
	describe("createEventSchema", () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		const validEvent: CreateEventInput = {
			title: "Team Meeting",
			description: "Weekly sync",
			timeZone: "America/New_York",
			dates: ["2025-01-20"],
			timeRangeStart: "09:00",
			timeRangeEnd: "17:00",
			slotDuration: "30",
		};

		it("should accept valid event data", () => {
			const result = createEventSchema.safeParse(validEvent);

			expect(result.success).toBe(true);
		});

		it("should require title", () => {
			const result = createEventSchema.safeParse({
				...validEvent,
				title: "",
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toBe("Title is required");
			}
		});

		it("should limit title to 255 characters", () => {
			const result = createEventSchema.safeParse({
				...validEvent,
				title: "a".repeat(256),
			});

			expect(result.success).toBe(false);
		});

		it("should limit description to 1000 characters", () => {
			const result = createEventSchema.safeParse({
				...validEvent,
				description: "a".repeat(1001),
			});

			expect(result.success).toBe(false);
		});

		it("should allow optional description", () => {
			const { description, ...eventWithoutDesc } = validEvent;
			const result = createEventSchema.safeParse(eventWithoutDesc);

			expect(result.success).toBe(true);
		});

		it("should require timezone", () => {
			const result = createEventSchema.safeParse({
				...validEvent,
				timeZone: "",
			});

			expect(result.success).toBe(false);
		});

		it("should require at least one date", () => {
			const result = createEventSchema.safeParse({
				...validEvent,
				dates: [],
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toBe(
					"At least one date is required",
				);
			}
		});

		it("should limit dates to 14 for free tier", () => {
			const tooManyDates = Array.from(
				{ length: 15 },
				(_, i) => `2025-02-${String(i + 1).padStart(2, "0")}`,
			);

			const result = createEventSchema.safeParse({
				...validEvent,
				dates: tooManyDates,
			});

			expect(result.success).toBe(false);
		});

		it("should reject past dates", () => {
			const result = createEventSchema.safeParse({
				...validEvent,
				dates: ["2025-01-10"], // Before mocked date of 2025-01-15
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toBe(
					"Cannot select dates in the past",
				);
			}
		});

		it("should require valid time format", () => {
			const result = createEventSchema.safeParse({
				...validEvent,
				timeRangeStart: "9:00", // Missing leading zero
			});

			expect(result.success).toBe(false);
		});

		it("should require end time after start time", () => {
			const result = createEventSchema.safeParse({
				...validEvent,
				timeRangeStart: "17:00",
				timeRangeEnd: "09:00",
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toBe(
					"End time must be after start time",
				);
			}
		});

		it("should only accept valid slot durations", () => {
			const result = createEventSchema.safeParse({
				...validEvent,
				slotDuration: "45",
			});

			expect(result.success).toBe(false);
		});

		it("should accept all valid slot durations", () => {
			for (const duration of ["15", "30", "60"]) {
				const result = createEventSchema.safeParse({
					...validEvent,
					slotDuration: duration,
				});

				expect(result.success).toBe(true);
			}
		});
	});

	describe("submitResponseSchema", () => {
		const validResponse: SubmitResponseInput = {
			respondentName: "John Doe",
			respondentComment: "Looking forward to it!",
			selectedSlots: ["2025-01-15T14:00:00.000Z"],
		};

		it("should accept valid response data", () => {
			const result = submitResponseSchema.safeParse(validResponse);

			expect(result.success).toBe(true);
		});

		it("should require respondent name", () => {
			const result = submitResponseSchema.safeParse({
				...validResponse,
				respondentName: "",
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toBe("Name is required");
			}
		});

		it("should limit name to 255 characters", () => {
			const result = submitResponseSchema.safeParse({
				...validResponse,
				respondentName: "a".repeat(256),
			});

			expect(result.success).toBe(false);
		});

		it("should limit comment to 500 characters", () => {
			const result = submitResponseSchema.safeParse({
				...validResponse,
				respondentComment: "a".repeat(501),
			});

			expect(result.success).toBe(false);
		});

		it("should allow optional comment", () => {
			const { respondentComment, ...responseWithoutComment } = validResponse;
			const result = submitResponseSchema.safeParse(responseWithoutComment);

			expect(result.success).toBe(true);
		});

		it("should require at least one selected slot", () => {
			const result = submitResponseSchema.safeParse({
				...validResponse,
				selectedSlots: [],
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toBe(
					"Please select at least one time slot",
				);
			}
		});

		it("should accept multiple selected slots", () => {
			const result = submitResponseSchema.safeParse({
				...validResponse,
				selectedSlots: [
					"2025-01-15T14:00:00.000Z",
					"2025-01-15T15:00:00.000Z",
					"2025-01-15T16:00:00.000Z",
				],
			});

			expect(result.success).toBe(true);
		});
	});

	describe("editEventSchema", () => {
		const validEdit: EditEventInput = {
			title: "Updated Meeting",
			description: "Updated description",
			dates: ["2025-01-20"],
			timeRangeStart: "09:00",
			timeRangeEnd: "17:00",
		};

		it("should accept valid edit data", () => {
			const result = editEventSchema.safeParse(validEdit);

			expect(result.success).toBe(true);
		});

		it("should require title", () => {
			const result = editEventSchema.safeParse({
				...validEdit,
				title: "",
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toBe("Title is required");
			}
		});

		it("should limit title to 255 characters", () => {
			const result = editEventSchema.safeParse({
				...validEdit,
				title: "a".repeat(256),
			});

			expect(result.success).toBe(false);
		});

		it("should limit description to 1000 characters", () => {
			const result = editEventSchema.safeParse({
				...validEdit,
				description: "a".repeat(1001),
			});

			expect(result.success).toBe(false);
		});

		it("should allow optional description", () => {
			const { description: _description, ...editWithoutDesc } = validEdit;
			const result = editEventSchema.safeParse(editWithoutDesc);

			expect(result.success).toBe(true);
		});

		it("should allow null description (to clear it)", () => {
			const result = editEventSchema.safeParse({
				...validEdit,
				description: null,
			});

			expect(result.success).toBe(true);
		});

		it("should require at least one date", () => {
			const result = editEventSchema.safeParse({
				...validEdit,
				dates: [],
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toBe(
					"At least one date is required",
				);
			}
		});

		it("should limit dates to 14 for free tier", () => {
			const tooManyDates = Array.from(
				{ length: 15 },
				(_, i) => `2025-02-${String(i + 1).padStart(2, "0")}`,
			);

			const result = editEventSchema.safeParse({
				...validEdit,
				dates: tooManyDates,
			});

			expect(result.success).toBe(false);
		});

		it("should NOT reject past dates (allows keeping existing past dates)", () => {
			// This is the key difference from createEventSchema
			const result = editEventSchema.safeParse({
				...validEdit,
				dates: ["2020-01-10"], // Past date should be allowed for edit
			});

			expect(result.success).toBe(true);
		});

		it("should require valid time format", () => {
			const result = editEventSchema.safeParse({
				...validEdit,
				timeRangeStart: "9:00", // Missing leading zero
			});

			expect(result.success).toBe(false);
		});

		it("should require end time after start time", () => {
			const result = editEventSchema.safeParse({
				...validEdit,
				timeRangeStart: "17:00",
				timeRangeEnd: "09:00",
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toBe(
					"End time must be after start time",
				);
			}
		});
	});

	describe("createEventSchemaForTier (premium)", () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		const premiumSchema = createEventSchemaForTier("premium");

		const validEvent: CreateEventInput = {
			title: "Premium Meeting",
			description: "Premium event",
			timeZone: "America/New_York",
			dates: ["2025-01-20"],
			timeRangeStart: "09:00",
			timeRangeEnd: "17:00",
			slotDuration: "30",
		};

		it("should allow up to 365 dates for premium tier", () => {
			// Create 100 future dates (well within 365 limit)
			const manyDates = Array.from({ length: 100 }, (_, i) => {
				const date = new Date("2025-02-01");
				date.setDate(date.getDate() + i);
				return date.toISOString().split("T")[0];
			});

			const result = premiumSchema.safeParse({
				...validEvent,
				dates: manyDates,
			});

			expect(result.success).toBe(true);
		});

		it("should reject more than 365 dates for premium tier", () => {
			// Create 366 dates
			const tooManyDates = Array.from({ length: 366 }, (_, i) => {
				const date = new Date("2025-02-01");
				date.setDate(date.getDate() + i);
				return date.toISOString().split("T")[0];
			});

			const result = premiumSchema.safeParse({
				...validEvent,
				dates: tooManyDates,
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain("365");
				expect(result.error.issues[0].message).toContain("premium");
			}
		});

		it("should allow 15 dates that would be rejected by free tier", () => {
			const fifteenDates = Array.from(
				{ length: 15 },
				(_, i) => `2025-02-${String(i + 1).padStart(2, "0")}`,
			);

			const premiumResult = premiumSchema.safeParse({
				...validEvent,
				dates: fifteenDates,
			});

			const freeResult = createEventSchemaForTier("free").safeParse({
				...validEvent,
				dates: fifteenDates,
			});

			expect(premiumResult.success).toBe(true);
			expect(freeResult.success).toBe(false);
		});
	});

	describe("editEventSchemaForTier (premium)", () => {
		const premiumEditSchema = editEventSchemaForTier("premium");

		const validEdit: EditEventInput = {
			title: "Updated Premium Meeting",
			description: "Updated description",
			dates: ["2025-01-20"],
			timeRangeStart: "09:00",
			timeRangeEnd: "17:00",
		};

		it("should allow up to 365 dates for premium tier", () => {
			// Create 100 dates
			const manyDates = Array.from({ length: 100 }, (_, i) => {
				const date = new Date("2025-02-01");
				date.setDate(date.getDate() + i);
				return date.toISOString().split("T")[0];
			});

			const result = premiumEditSchema.safeParse({
				...validEdit,
				dates: manyDates,
			});

			expect(result.success).toBe(true);
		});

		it("should reject more than 365 dates for premium tier", () => {
			// Create 366 dates
			const tooManyDates = Array.from({ length: 366 }, (_, i) => {
				const date = new Date("2025-02-01");
				date.setDate(date.getDate() + i);
				return date.toISOString().split("T")[0];
			});

			const result = premiumEditSchema.safeParse({
				...validEdit,
				dates: tooManyDates,
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain("365");
				expect(result.error.issues[0].message).toContain("premium");
			}
		});

		it("should allow 15 dates that would be rejected by free tier", () => {
			const fifteenDates = Array.from(
				{ length: 15 },
				(_, i) => `2025-02-${String(i + 1).padStart(2, "0")}`,
			);

			const premiumResult = premiumEditSchema.safeParse({
				...validEdit,
				dates: fifteenDates,
			});

			const freeResult = editEventSchemaForTier("free").safeParse({
				...validEdit,
				dates: fifteenDates,
			});

			expect(premiumResult.success).toBe(true);
			expect(freeResult.success).toBe(false);
		});

		it("should allow past dates (for editing existing events)", () => {
			const result = premiumEditSchema.safeParse({
				...validEdit,
				dates: ["2020-01-10"], // Past date
			});

			expect(result.success).toBe(true);
		});
	});

	describe("createEventSchemaForTier password (premium)", () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		const premiumSchema = createEventSchemaForTier("premium");

		const validEvent = {
			title: "Test",
			timeZone: "UTC",
			dates: ["2025-01-20"],
			timeRangeStart: "09:00",
			timeRangeEnd: "17:00",
			slotDuration: "30" as const,
		};

		it("should accept optional password for premium tier", () => {
			const result = premiumSchema.safeParse({
				...validEvent,
				password: "mypassword",
			});
			expect(result.success).toBe(true);
		});

		it("should accept missing password for premium tier", () => {
			const result = premiumSchema.safeParse(validEvent);
			expect(result.success).toBe(true);
		});

		it("should accept empty string password for premium tier (no password)", () => {
			const result = premiumSchema.safeParse({
				...validEvent,
				password: "",
			});
			expect(result.success).toBe(true);
		});

		it("should reject password shorter than 4 chars for premium tier", () => {
			const result = premiumSchema.safeParse({
				...validEvent,
				password: "abc",
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain("4 characters");
			}
		});

		it("should reject password longer than 128 chars for premium tier", () => {
			const result = premiumSchema.safeParse({
				...validEvent,
				password: "a".repeat(129),
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain("128 characters");
			}
		});
	});

	describe("createEventSchemaForTier password (free)", () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		const freeSchema = createEventSchemaForTier("free");

		const validEvent = {
			title: "Test",
			timeZone: "UTC",
			dates: ["2025-01-20"],
			timeRangeStart: "09:00",
			timeRangeEnd: "17:00",
			slotDuration: "30" as const,
		};

		it("should reject password for free tier", () => {
			const result = freeSchema.safeParse({
				...validEvent,
				password: "mypassword",
			});
			expect(result.success).toBe(false);
		});

		it("should accept missing password for free tier", () => {
			const result = freeSchema.safeParse(validEvent);
			expect(result.success).toBe(true);
		});

		it("should accept empty string password for free tier", () => {
			const result = freeSchema.safeParse({
				...validEvent,
				password: "",
			});
			expect(result.success).toBe(true);
		});
	});

	describe("editEventSchemaForTier password", () => {
		const premiumEditSchema = editEventSchemaForTier("premium");

		const validEdit = {
			title: "Test",
			dates: ["2025-01-20"],
			timeRangeStart: "09:00",
			timeRangeEnd: "17:00",
		};

		it("should accept password for premium edit", () => {
			const result = premiumEditSchema.safeParse({
				...validEdit,
				password: "newpassword",
			});
			expect(result.success).toBe(true);
		});

		it("should accept null password (to remove)", () => {
			const result = premiumEditSchema.safeParse({
				...validEdit,
				password: null,
			});
			expect(result.success).toBe(true);
		});

		it("should accept missing password (no change)", () => {
			const result = premiumEditSchema.safeParse(validEdit);
			expect(result.success).toBe(true);
		});
	});

	describe("notifyOnResponse field", () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		const validEvent = {
			title: "Test",
			timeZone: "UTC",
			dates: ["2025-01-20"],
			timeRangeStart: "09:00",
			timeRangeEnd: "17:00",
			slotDuration: "30" as const,
		};

		it("should accept notifyOnResponse in createEventSchema", () => {
			const result = createEventSchemaForTier("free").safeParse({
				...validEvent,
				notifyOnResponse: true,
			});
			expect(result.success).toBe(true);
		});

		it("should accept notifyOnResponse=false in createEventSchema", () => {
			const result = createEventSchemaForTier("free").safeParse({
				...validEvent,
				notifyOnResponse: false,
			});
			expect(result.success).toBe(true);
		});

		it("should accept missing notifyOnResponse in createEventSchema", () => {
			const result = createEventSchemaForTier("free").safeParse(validEvent);
			expect(result.success).toBe(true);
		});

		it("should accept notifyOnResponse in editEventSchema", () => {
			const result = editEventSchemaForTier("free").safeParse({
				title: "Test",
				dates: ["2025-01-20"],
				timeRangeStart: "09:00",
				timeRangeEnd: "17:00",
				notifyOnResponse: true,
			});
			expect(result.success).toBe(true);
		});

		it("should accept missing notifyOnResponse in editEventSchema", () => {
			const result = editEventSchemaForTier("free").safeParse({
				title: "Test",
				dates: ["2025-01-20"],
				timeRangeStart: "09:00",
				timeRangeEnd: "17:00",
			});
			expect(result.success).toBe(true);
		});
	});

	describe("tier-specific error messages", () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("should show free tier limit in error message for createEventSchema", () => {
			const tooManyDates = Array.from(
				{ length: 15 },
				(_, i) => `2025-02-${String(i + 1).padStart(2, "0")}`,
			);

			const result = createEventSchemaForTier("free").safeParse({
				title: "Test",
				timeZone: "UTC",
				dates: tooManyDates,
				timeRangeStart: "09:00",
				timeRangeEnd: "17:00",
				slotDuration: "30",
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain("14");
				expect(result.error.issues[0].message).toContain("free");
			}
		});

		it("should show free tier limit in error message for editEventSchema", () => {
			const tooManyDates = Array.from(
				{ length: 15 },
				(_, i) => `2025-02-${String(i + 1).padStart(2, "0")}`,
			);

			const result = editEventSchemaForTier("free").safeParse({
				title: "Test",
				dates: tooManyDates,
				timeRangeStart: "09:00",
				timeRangeEnd: "17:00",
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain("14");
				expect(result.error.issues[0].message).toContain("free");
			}
		});
	});
});
