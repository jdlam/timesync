import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { generateTimeSlots } from "./time-utils";

interface EventData {
	title: string;
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
	timeSlot: string;
	respondentName: string;
	available: "Yes" | "No";
}

/**
 * Escape a string for CSV format
 * Handles commas, quotes, and newlines
 */
function escapeCsvField(field: string): string {
	// If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
	if (field.includes(",") || field.includes('"') || field.includes("\n")) {
		return `"${field.replace(/"/g, '""')}"`;
	}
	return field;
}

/**
 * Format an ISO timestamp for CSV display
 * Format: "YYYY-MM-DD HH:MM AM/PM"
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
	// Generate all possible time slots for the event
	const allSlots = generateTimeSlots(
		event.dates,
		event.timeRangeStart,
		event.timeRangeEnd,
		event.slotDuration,
		event.timeZone,
	);

	// Build rows for CSV
	const rows: CsvRow[] = [];

	for (const slot of allSlots) {
		const formattedSlot = formatTimeSlotForCsv(slot, event.timeZone);

		for (const response of responses) {
			const isAvailable = response.selectedSlots.includes(slot);
			rows.push({
				timeSlot: formattedSlot,
				respondentName: response.respondentName,
				available: isAvailable ? "Yes" : "No",
			});
		}
	}

	// Build CSV string
	const header = "Time Slot,Respondent Name,Available";
	const csvRows = rows.map(
		(row) =>
			`${escapeCsvField(row.timeSlot)},${escapeCsvField(row.respondentName)},${row.available}`,
	);

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
