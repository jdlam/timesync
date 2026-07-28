import { differenceInCalendarDays, parseISO } from "date-fns";

/**
 * Response type for heatmap calculations
 * Compatible with both Drizzle and Convex response types
 */
interface ResponseForHeatmap {
	selectedSlots: string[];
	respondentName: string;
}

/**
 * Heatmap data for a single time slot
 */
export interface HeatmapSlotData {
	count: number; // Number of people available
	percentage: number; // Percentage of total respondents (0-100)
	respondents: string[]; // Names of available people
}

/**
 * Calculate availability heatmap data for all time slots
 * @param responses - Array of response objects from database
 * @param allSlots - Array of all possible time slot ISO timestamps
 * @returns Map of slot timestamp to heatmap data
 */
export function calculateHeatmap(
	responses: ResponseForHeatmap[],
	allSlots: string[],
): Map<string, HeatmapSlotData> {
	const heatmapData = new Map<string, HeatmapSlotData>();
	const totalRespondents = responses.length;

	// If no responses, return empty data for all slots
	if (totalRespondents === 0) {
		for (const slot of allSlots) {
			heatmapData.set(slot, {
				count: 0,
				percentage: 0,
				respondents: [],
			});
		}
		return heatmapData;
	}

	// Calculate availability for each slot
	for (const slot of allSlots) {
		const availableRespondents: string[] = [];

		// Check which respondents are available for this slot
		for (const response of responses) {
			if (response.selectedSlots.includes(slot)) {
				availableRespondents.push(response.respondentName);
			}
		}

		const count = availableRespondents.length;
		const percentage = (count / totalRespondents) * 100;

		heatmapData.set(slot, {
			count,
			percentage,
			respondents: availableRespondents,
		});
	}

	return heatmapData;
}

/**
 * Get color for heatmap cell based on availability percentage
 * Uses oklch color space for smooth gradients
 * @param percentage - Availability percentage (0-100)
 * @param isDarkMode - Whether the current theme is dark mode
 * @param customColors - Optional custom color configuration
 * @returns oklch color string
 */
export function getHeatmapColor(
	percentage: number,
	isDarkMode = true,
	customColors?: { primary?: string },
): string {
	// If custom primary color is provided, use it for high availability
	// Otherwise, use default green gradient

	if (percentage === 0) {
		// No availability - theme-aware gray
		if (isDarkMode) {
			return "oklch(0.30 0.02 240)"; // Dark gray for dark mode
		} else {
			return "oklch(0.85 0.01 240)"; // Light gray for light mode
		}
	}

	if (percentage <= 20) {
		// Very low availability - red
		return "oklch(0.55 0.22 15)"; // Red
	}

	if (percentage <= 40) {
		// Low availability - orange
		return "oklch(0.65 0.20 50)"; // Orange
	}

	if (percentage <= 60) {
		// Medium availability - yellow
		return "oklch(0.75 0.18 90)"; // Yellow
	}

	if (percentage <= 80) {
		// Good availability - light green
		return "oklch(0.70 0.18 140)"; // Light green
	}

	// High availability - teal/green (matches app theme)
	if (customColors?.primary) {
		return customColors.primary;
	}
	return "oklch(0.65 0.20 180)"; // Teal/green
}

/**
 * Get background opacity based on percentage (alternative to color gradient)
 * @param percentage - Availability percentage (0-100)
 * @returns Opacity value (0-1)
 */
export function getHeatmapOpacity(percentage: number): number {
	return Math.min(percentage / 100, 1);
}

/**
 * Find the best time slots (highest availability)
 * @param heatmapData - Map of slot timestamp to heatmap data
 * @param topN - Number of best slots to return (default: 5)
 * @returns Array of [timestamp, data] tuples sorted by availability
 */
export function getBestTimeSlots(
	heatmapData: Map<string, HeatmapSlotData>,
	topN = 5,
): Array<[string, HeatmapSlotData]> {
	const slots = Array.from(heatmapData.entries());

	// Sort by percentage descending, then by count
	slots.sort((a, b) => {
		if (b[1].percentage !== a[1].percentage) {
			return b[1].percentage - a[1].percentage;
		}
		return b[1].count - a[1].count;
	});

	return slots.slice(0, topN);
}

/**
 * A single candidate day paired with its aggregated availability.
 * Used by dates-only events to find the best consecutive stretch.
 */
export interface DayAvailability {
	date: string; // 'YYYY-MM-DD'
	data: HeatmapSlotData;
}

/**
 * Best consecutive run of days where the most people are free every day.
 */
export interface BestConsecutiveRun {
	startDate: string;
	endDate: string;
	length: number;
	minCount: number; // fewest people available on any single day in the run
	minPercentage: number;
}

/**
 * Find the best contiguous stretch of calendar-consecutive days for aligning on
 * a multi-day plan (e.g. a vacation window). Considers every run of days that
 * are consecutive by one calendar day and ranks them by how many people are
 * available on ALL days of the run (minCount) first, then by length. This
 * surfaces the longest stretch at the highest sustainable overlap without the
 * organizer having to pre-specify a target length.
 *
 * @param days - Candidate days paired with availability, sorted ascending by date
 * @returns The best run, or null if there are no days
 */
export function getBestConsecutiveRun(
	days: DayAvailability[],
): BestConsecutiveRun | null {
	if (days.length === 0) return null;

	let best: BestConsecutiveRun | null = null;

	for (let i = 0; i < days.length; i++) {
		let minCount = Number.POSITIVE_INFINITY;
		let minPercentage = Number.POSITIVE_INFINITY;

		for (let j = i; j < days.length; j++) {
			// Stop extending the run when the next candidate day is not the
			// immediately following calendar day.
			if (
				j > i &&
				differenceInCalendarDays(
					parseISO(days[j].date),
					parseISO(days[j - 1].date),
				) !== 1
			) {
				break;
			}

			minCount = Math.min(minCount, days[j].data.count);
			minPercentage = Math.min(minPercentage, days[j].data.percentage);
			const length = j - i + 1;

			if (
				!best ||
				minCount > best.minCount ||
				(minCount === best.minCount && length > best.length)
			) {
				best = {
					startDate: days[i].date,
					endDate: days[j].date,
					length,
					minCount,
					minPercentage,
				};
			}
		}
	}

	return best;
}

/**
 * A candidate block (contiguous run of day strings) with its aggregated
 * availability across responses.
 */
export interface BestBlock {
	block: string[]; // YYYY-MM-DD days, ascending
	count: number; // respondents available for the WHOLE block
	percentage: number; // 0–100 of total respondents
}

/**
 * Rank grouped-event blocks by how many respondents are available for the
 * entire block (every day selected). A respondent counts toward a block only
 * if their selected days are a superset of the block's days — partial
 * availability does not count. Sorted by count desc, then earliest block.
 *
 * @param blocks - Candidate blocks (e.g. from getDateBlocks), ascending
 * @param respondentDaySets - Each respondent's selected day strings
 * @param topN - How many to return (default 3)
 */
export function getBestBlocks(
	blocks: string[][],
	respondentDaySets: Set<string>[],
	topN = 3,
): BestBlock[] {
	const total = respondentDaySets.length;
	const ranked = blocks.map((block) => {
		const count = respondentDaySets.filter((set) =>
			block.every((day) => set.has(day)),
		).length;
		return {
			block,
			count,
			percentage: total === 0 ? 0 : (count / total) * 100,
		};
	});

	ranked.sort((a, b) => {
		if (b.count !== a.count) return b.count - a.count;
		return a.block[0] < b.block[0] ? -1 : 1;
	});

	return ranked.slice(0, topN);
}

/**
 * Calculate overall response statistics
 * @param heatmapData - Map of slot timestamp to heatmap data
 * @returns Statistics object
 */
export function calculateHeatmapStats(
	heatmapData: Map<string, HeatmapSlotData>,
) {
	const slots = Array.from(heatmapData.values());

	if (slots.length === 0) {
		return {
			averageAvailability: 0,
			maxAvailability: 0,
			minAvailability: 0,
			totalSlots: 0,
		};
	}

	const percentages = slots.map((s) => s.percentage);

	return {
		averageAvailability:
			percentages.reduce((a, b) => a + b, 0) / percentages.length,
		maxAvailability: Math.max(...percentages),
		minAvailability: Math.min(...percentages),
		totalSlots: slots.length,
	};
}
