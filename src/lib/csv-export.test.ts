import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	downloadCsv,
	exportEventToCsv,
	formatTimeSlotForCsv,
	generateCsvContent,
	generateCsvFilename,
} from "./csv-export";

describe("csv-export", () => {
	describe("formatTimeSlotForCsv", () => {
		it("should format ISO timestamp to readable format", () => {
			// 2025-01-15T14:00:00Z is 9:00 AM EST
			const formatted = formatTimeSlotForCsv(
				"2025-01-15T14:00:00.000Z",
				"America/New_York",
			);

			expect(formatted).toBe("2025-01-15 9:00 AM");
		});

		it("should handle different timezones", () => {
			// Same UTC time, different timezone
			const formatted = formatTimeSlotForCsv(
				"2025-01-15T14:00:00.000Z",
				"America/Los_Angeles",
			);

			expect(formatted).toBe("2025-01-15 6:00 AM");
		});

		it("should handle PM times", () => {
			const formatted = formatTimeSlotForCsv(
				"2025-01-15T20:00:00.000Z",
				"America/New_York",
			);

			expect(formatted).toBe("2025-01-15 3:00 PM");
		});
	});

	describe("generateCsvContent", () => {
		const mockEvent = {
			title: "Team Meeting",
			dates: ["2025-01-15"],
			timeRangeStart: "09:00",
			timeRangeEnd: "11:00",
			slotDuration: 60,
			timeZone: "America/New_York",
		};

		it("should generate CSV with correct header", () => {
			const responses = [{ respondentName: "Alice", selectedSlots: [] }];

			const csv = generateCsvContent(mockEvent, responses);

			expect(csv.startsWith("Time Slot,Respondent Name,Available")).toBe(true);
		});

		it("should mark available slots as Yes", () => {
			// 9:00 AM EST = 14:00 UTC
			const responses = [
				{
					respondentName: "Alice",
					selectedSlots: ["2025-01-15T14:00:00.000Z"],
				},
			];

			const csv = generateCsvContent(mockEvent, responses);
			const lines = csv.split("\n");

			// Find the 9:00 AM line for Alice
			const aliceLine = lines.find(
				(line) => line.includes("Alice") && line.includes("9:00 AM"),
			);

			expect(aliceLine).toContain("Yes");
		});

		it("should mark unavailable slots as No", () => {
			const responses = [
				{
					respondentName: "Alice",
					selectedSlots: [], // No slots selected
				},
			];

			const csv = generateCsvContent(mockEvent, responses);
			const lines = csv.split("\n");

			// All lines for Alice should be No (except header)
			const aliceLines = lines.filter((line) => line.includes("Alice"));

			for (const line of aliceLines) {
				expect(line).toContain("No");
			}
		});

		it("should include all respondents", () => {
			const responses = [
				{ respondentName: "Alice", selectedSlots: [] },
				{ respondentName: "Bob", selectedSlots: [] },
			];

			const csv = generateCsvContent(mockEvent, responses);

			expect(csv).toContain("Alice");
			expect(csv).toContain("Bob");
		});

		it("should generate rows for all time slots", () => {
			const responses = [{ respondentName: "Alice", selectedSlots: [] }];

			const csv = generateCsvContent(mockEvent, responses);
			const lines = csv.split("\n");

			// 2 slots (9:00, 10:00) * 1 respondent + 1 header = 3 lines
			expect(lines).toHaveLength(3);
		});

		it("should escape names with commas", () => {
			const responses = [{ respondentName: "Smith, John", selectedSlots: [] }];

			const csv = generateCsvContent(mockEvent, responses);

			// Name should be quoted due to comma
			expect(csv).toContain('"Smith, John"');
		});

		it("should escape names with quotes", () => {
			const responses = [
				{ respondentName: 'John "Johnny" Doe', selectedSlots: [] },
			];

			const csv = generateCsvContent(mockEvent, responses);

			// Name should be quoted and internal quotes doubled
			expect(csv).toContain('"John ""Johnny"" Doe"');
		});

		it("should escape names with line breaks", () => {
			const responses = [
				{ respondentName: "Line1\nLine2", selectedSlots: [] },
				{ respondentName: "Line1\rLine2", selectedSlots: [] },
				{ respondentName: "Line1\r\nLine2", selectedSlots: [] },
			];

			const csv = generateCsvContent(mockEvent, responses);

			// Names with line breaks should be quoted
			expect(csv).toContain('"Line1\nLine2"');
			expect(csv).toContain('"Line1\rLine2"');
			expect(csv).toContain('"Line1\r\nLine2"');
		});

		it("should handle empty responses array", () => {
			const csv = generateCsvContent(mockEvent, []);

			// Should only have header
			const lines = csv.split("\n");
			expect(lines).toHaveLength(1);
			expect(lines[0]).toBe("Time Slot,Respondent Name,Available");
		});

		it("should handle multiple days", () => {
			const multiDayEvent = {
				...mockEvent,
				dates: ["2025-01-15", "2025-01-16"],
			};

			const responses = [{ respondentName: "Alice", selectedSlots: [] }];

			const csv = generateCsvContent(multiDayEvent, responses);
			const lines = csv.split("\n");

			// 2 days * 2 slots per day * 1 respondent + 1 header = 5 lines
			expect(lines).toHaveLength(5);
		});
	});

	describe("generateCsvFilename", () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("should generate filename with event title and date", () => {
			const filename = generateCsvFilename("Team Meeting");

			expect(filename).toBe("Team_Meeting_2025-01-15.csv");
		});

		it("should replace spaces with underscores", () => {
			const filename = generateCsvFilename("My Team Meeting");

			expect(filename).toBe("My_Team_Meeting_2025-01-15.csv");
		});

		it("should remove special characters", () => {
			const filename = generateCsvFilename("Meeting @10! (Team A)");

			expect(filename).toBe("Meeting_10_Team_A_2025-01-15.csv");
		});

		it("should truncate long titles", () => {
			const longTitle = "A".repeat(100);
			const filename = generateCsvFilename(longTitle);

			// Title should be truncated to 50 chars + date + .csv
			expect(filename.length).toBeLessThanOrEqual(50 + 1 + 10 + 4); // title_date.csv
		});

		it("should handle empty title", () => {
			const filename = generateCsvFilename("");

			expect(filename).toBe("_2025-01-15.csv");
		});

		it("should preserve hyphens", () => {
			const filename = generateCsvFilename("Q1-Planning-Meeting");

			expect(filename).toBe("Q1-Planning-Meeting_2025-01-15.csv");
		});
	});

	describe("downloadCsv", () => {
		const mockCreateObjectURL = vi.fn(() => "blob:mock-url");
		const mockRevokeObjectURL = vi.fn();
		const mockClick = vi.fn();
		let mockLink: { href: string; download: string; click: typeof mockClick };

		beforeEach(() => {
			mockLink = {
				href: "",
				download: "",
				click: mockClick,
			};

			vi.spyOn(document, "createElement").mockReturnValue(
				mockLink as unknown as HTMLAnchorElement,
			);
			vi.spyOn(document.body, "appendChild").mockImplementation(
				() => mockLink as unknown as HTMLAnchorElement,
			);
			vi.spyOn(document.body, "removeChild").mockImplementation(
				() => mockLink as unknown as HTMLAnchorElement,
			);

			// Stub global URL methods
			vi.stubGlobal("URL", {
				...URL,
				createObjectURL: mockCreateObjectURL,
				revokeObjectURL: mockRevokeObjectURL,
			});
		});

		afterEach(() => {
			vi.restoreAllMocks();
			vi.unstubAllGlobals();
			mockCreateObjectURL.mockClear();
			mockRevokeObjectURL.mockClear();
			mockClick.mockClear();
		});

		it("should create a blob with correct content type", () => {
			downloadCsv("test,content", "test.csv");

			expect(mockCreateObjectURL).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "text/csv;charset=utf-8;",
				}),
			);
		});

		it("should create an anchor element", () => {
			const createElementSpy = vi.spyOn(document, "createElement");
			downloadCsv("test,content", "test.csv");

			expect(createElementSpy).toHaveBeenCalledWith("a");
		});

		it("should set href and download attributes", () => {
			downloadCsv("test,content", "test.csv");

			expect(mockLink.href).toBe("blob:mock-url");
			expect(mockLink.download).toBe("test.csv");
		});

		it("should append link to body, click, and remove", () => {
			const appendChildSpy = vi.spyOn(document.body, "appendChild");
			const removeChildSpy = vi.spyOn(document.body, "removeChild");

			downloadCsv("test,content", "test.csv");

			expect(appendChildSpy).toHaveBeenCalled();
			expect(mockClick).toHaveBeenCalled();
			expect(removeChildSpy).toHaveBeenCalled();
		});

		it("should revoke object URL after download", () => {
			downloadCsv("test,content", "test.csv");

			expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
		});
	});

	describe("exportEventToCsv", () => {
		let mockLink: {
			href: string;
			download: string;
			click: ReturnType<typeof vi.fn>;
		};
		const mockCreateObjectURL = vi.fn(() => "blob:mock-url");
		const mockRevokeObjectURL = vi.fn();

		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));

			mockLink = {
				href: "",
				download: "",
				click: vi.fn(),
			};

			vi.spyOn(document, "createElement").mockReturnValue(
				mockLink as unknown as HTMLAnchorElement,
			);
			vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
			vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);

			vi.stubGlobal("URL", {
				...URL,
				createObjectURL: mockCreateObjectURL,
				revokeObjectURL: mockRevokeObjectURL,
			});
		});

		afterEach(() => {
			vi.useRealTimers();
			vi.restoreAllMocks();
			vi.unstubAllGlobals();
			mockCreateObjectURL.mockClear();
			mockRevokeObjectURL.mockClear();
		});

		it("should generate CSV and trigger download", () => {
			const event = {
				title: "Team Meeting",
				dates: ["2025-01-15"],
				timeRangeStart: "09:00",
				timeRangeEnd: "10:00",
				slotDuration: 60,
				timeZone: "America/New_York",
			};
			const responses = [{ respondentName: "Alice", selectedSlots: [] }];

			exportEventToCsv(event, responses);

			expect(mockLink.click).toHaveBeenCalled();
			expect(mockLink.download).toBe("Team_Meeting_2025-01-15.csv");
		});

		it("should include response data in CSV content", () => {
			const event = {
				title: "Test",
				dates: ["2025-01-15"],
				timeRangeStart: "09:00",
				timeRangeEnd: "10:00",
				slotDuration: 60,
				timeZone: "America/New_York",
			};
			const responses = [
				{
					respondentName: "Alice",
					selectedSlots: ["2025-01-15T14:00:00.000Z"],
				},
			];

			exportEventToCsv(event, responses);

			// Verify blob was created with correct type
			expect(mockCreateObjectURL).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "text/csv;charset=utf-8;",
				}),
			);
		});
	});
});
