import { differenceInCalendarDays, parseISO } from "date-fns";
import { formatDateDisplay } from "./time-utils";

/**
 * Date-pattern shapes for dates-only events.
 * - "individual": a flat, hand-picked list of days
 * - "weekends" / "weekdays" / "custom": a recurring weekday pattern over a range
 */
export type DatePattern = "individual" | "weekends" | "weekdays" | "custom";

const WEEKEND_DAYS = [0, 6]; // Sun, Sat
const WEEKDAY_DAYS = [1, 2, 3, 4, 5]; // Mon–Fri
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** A grouped pattern is anything other than individual. */
export function isGroupedPattern(pattern: DatePattern | undefined): boolean {
	return pattern !== undefined && pattern !== "individual";
}

/**
 * The weekday indices (0=Sun … 6=Sat) a pattern selects. Custom uses the
 * caller-provided `patternWeekdays`; individual selects none.
 */
export function weekdaysForPattern(
	pattern: DatePattern | undefined,
	patternWeekdays?: number[],
): number[] {
	switch (pattern) {
		case "weekends":
			return [...WEEKEND_DAYS];
		case "weekdays":
			return [...WEEKDAY_DAYS];
		case "custom":
			return [...(patternWeekdays ?? [])].sort((a, b) => a - b);
		default:
			return [];
	}
}

/**
 * Split a set of day strings (YYYY-MM-DD) into blocks: maximal runs of
 * calendar-consecutive days. For recurring patterns the non-matching weekdays
 * naturally separate runs (weekends → Sat–Sun pairs, weekdays → Mon–Fri weeks,
 * custom Mon/Tue/Wed → Mon–Wed runs). Input order is irrelevant; output blocks
 * and the days within them are sorted ascending.
 */
export function getDateBlocks(dates: string[]): string[][] {
	const sorted = Array.from(new Set(dates)).sort();
	const blocks: string[][] = [];
	let current: string[] = [];

	for (const date of sorted) {
		if (
			current.length === 0 ||
			differenceInCalendarDays(
				parseISO(date),
				parseISO(current[current.length - 1]),
			) === 1
		) {
			current.push(date);
		} else {
			blocks.push(current);
			current = [date];
		}
	}
	if (current.length > 0) blocks.push(current);
	return blocks;
}

/**
 * Human label for a block: a single day → "Sat, Aug 1"; a run → "Sat, Aug 1 –
 * Sun, Aug 2".
 */
export function formatBlockLabel(block: string[]): string {
	if (block.length === 0) return "";
	const first = formatDateDisplay(block[0]);
	if (block.length === 1) return first;
	return `${first} – ${formatDateDisplay(block[block.length - 1])}`;
}

/** Singular noun for a block of a given pattern ("weekend", "work week", …). */
export function blockNoun(pattern: DatePattern | undefined): string {
	switch (pattern) {
		case "weekends":
			return "weekend";
		case "weekdays":
			return "work week";
		default:
			return "group";
	}
}

/** Human label for a pattern (e.g. "Every weekend", "Every Mon, Tue, Wed"). */
export function patternLabel(
	pattern: DatePattern | undefined,
	patternWeekdays?: number[],
): string {
	switch (pattern) {
		case "weekends":
			return "Every weekend";
		case "weekdays":
			return "Weekdays";
		case "custom": {
			const days = weekdaysForPattern("custom", patternWeekdays);
			if (days.length === 0) return "Custom";
			return `Every ${days.map((d) => WEEKDAY_SHORT[d]).join(", ")}`;
		}
		default:
			return "Individual days";
	}
}
