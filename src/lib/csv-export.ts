import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import {
	type DatePattern,
	formatBlockLabel,
	getDateBlocks,
	isGroupedPattern,
} from "./date-blocks";
import {
	formatDate,
	formatDateSlot,
	generateDateSlots,
	generateTimeSlots,
} from "./time-utils";

interface EventData {
	title: string;
	eventMode?: "times" | "dates";
	datePattern?: DatePattern;
	dates: string[];
	timeRangeStart: string;
	timeRangeEnd: string;
	slotDuration: number;
	timeZone: string;
}

interface ResponseData {
	respondentName: string;
	selectedSlots: string[];
}

interface CsvRow {
	group?: string;
	timeSlot: string;
	respondentName: string;
	available: "Yes" | "No";
}

/**
 * Escape a string for CSV format
 * Handles commas, quotes, and line breaks (LF, CR, CRLF)
 */
function escapeCsvField(field: string): string {
	// If field contains comma, quote, or any line break, wrap in quotes and escape internal quotes
	if (field.includes(",") || field.includes('"') || /[\r\n]/.test(field)) {
		return `"${field.replace(/"/g, '""')}"`;
	}
	return field;
}

/**
 * Format an ISO timestamp for CSV display
 * Format: "yyyy-MM-dd h:mm a"
 */
export function formatTimeSlotForCsv(
	isoTimestamp: string,
	timeZone: string,
): string {
	const date = new Date(isoTimestamp);
	const zonedDate = toZonedTime(date, timeZone);
	return format(zonedDate, "yyyy-MM-dd h:mm a");
}

/**
 * Generate CSV content from event and responses data
 * Format: Time Slot, Respondent Name, Available (Yes/No)
 */
export function generateCsvContent(
	event: EventData,
	responses: ResponseData[],
): string {
	const isDatesMode = event.eventMode === "dates";
	const grouped = isDatesMode && isGroupedPattern(event.datePattern);

	// Generate all possible slots for the event. Dates events use one canonical
	// slot per candidate day; times events expand into intra-day time slots.
	const allSlots = isDatesMode
		? generateDateSlots(event.dates, event.timeZone)
		: generateTimeSlots(
				event.dates,
				event.timeRangeStart,
				event.timeRangeEnd,
				event.slotDuration,
				event.timeZone,
			);

	// For grouped events, label each candidate day with its block.
	const blockLabelByDay = new Map<string, string>();
	if (grouped) {
		for (const block of getDateBlocks(event.dates)) {
			const label = formatBlockLabel(block);
			for (const day of block) blockLabelByDay.set(day, label);
		}
	}

	// Build rows for CSV
	const rows: CsvRow[] = [];

	// Pre-compute Sets for O(1) lookup instead of O(k) array includes
	const responsesWithSlotSets = responses.map((response) => ({
		response,
		selectedSlotsSet: new Set(response.selectedSlots),
	}));

	for (const slot of allSlots) {
		const formattedSlot = isDatesMode
			? formatDateSlot(slot, event.timeZone)
			: formatTimeSlotForCsv(slot, event.timeZone);
		const group = grouped
			? blockLabelByDay.get(formatDate(slot, event.timeZone))
			: undefined;

		for (const { response, selectedSlotsSet } of responsesWithSlotSets) {
			const isAvailable = selectedSlotsSet.has(slot);
			rows.push({
				group,
				timeSlot: formattedSlot,
				respondentName: response.respondentName,
				available: isAvailable ? "Yes" : "No",
			});
		}
	}

	// Build CSV string
	const header = grouped
		? "Group,Date,Respondent Name,Available"
		: isDatesMode
			? "Date,Respondent Name,Available"
			: "Time Slot,Respondent Name,Available";
	const csvRows = rows.map((row) => {
		const cells = grouped
			? [row.group ?? "", row.timeSlot, row.respondentName]
			: [row.timeSlot, row.respondentName];
		return `${cells.map(escapeCsvField).join(",")},${row.available}`;
	});

	return [header, ...csvRows].join("\n");
}

/**
 * Generate a sanitized filename for the CSV export
 * Format: EventTitle_YYYY-MM-DD.csv
 */
export function generateCsvFilename(eventTitle: string): string {
	// Sanitize the title: remove special characters, replace spaces with underscores
	const sanitizedTitle = eventTitle
		.replace(/[^a-zA-Z0-9\s-]/g, "")
		.replace(/\s+/g, "_")
		.substring(0, 50); // Limit length

	const dateStr = format(new Date(), "yyyy-MM-dd");

	return `${sanitizedTitle}_${dateStr}.csv`;
}

/**
 * Trigger a file download in the browser
 */
export function downloadCsv(content: string, filename: string): void {
	const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);

	const link = document.createElement("a");
	link.href = url;
	link.download = filename;

	// Append to body, click, and remove
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);

	// Clean up the URL object
	URL.revokeObjectURL(url);
}

/**
 * Export event results to CSV and trigger download
 * This is the main function to call from components
 */
export function exportEventToCsv(
	event: EventData,
	responses: ResponseData[],
): void {
	const csvContent = generateCsvContent(event, responses);
	const filename = generateCsvFilename(event.title);
	downloadCsv(csvContent, filename);
}
