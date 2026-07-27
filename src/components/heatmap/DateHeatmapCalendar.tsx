import {
	eachDayOfInterval,
	endOfMonth,
	format,
	getDay,
	parseISO,
	startOfMonth,
} from "date-fns";
import { CalendarRange, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	formatBlockLabel,
	getDateBlocks,
	isGroupedPattern,
} from "@/lib/date-blocks";
import {
	calculateHeatmap,
	type DayAvailability,
	getBestBlocks,
	getBestConsecutiveRun,
	getBestTimeSlots,
	getHeatmapColor,
	type HeatmapSlotData,
} from "@/lib/heatmap-utils";
import { useTheme } from "@/lib/theme";
import {
	formatDate,
	formatDateDisplay,
	generateDateSlots,
	parseTimeInZone,
} from "@/lib/time-utils";
import type { PublicEvent, PublicResponse } from "../../../convex/shared_types";

interface DateHeatmapCalendarProps {
	event: PublicEvent;
	responses: PublicResponse[];
	highlightedResponse?: PublicResponse;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Admin results view for dates-only events: a calendar-style heatmap of per-day
 * overlap plus recommendations for the best days and best consecutive stretch.
 *
 * Reuses the same aggregation stack as the time-slot heatmap — each candidate
 * day maps to one canonical slot (generateDateSlots), so calculateHeatmap /
 * getBestTimeSlots work unchanged, keyed on those slot timestamps.
 */
export function DateHeatmapCalendar({
	event,
	responses,
	highlightedResponse,
}: DateHeatmapCalendarProps) {
	const { effectiveTheme } = useTheme();
	const isDarkMode = effectiveTheme === "dark";
	const totalRespondents = responses.length;

	const slotForDate = useMemo(
		() => (dateStr: string) =>
			parseTimeInZone(dateStr, "00:00", event.timeZone).toISOString(),
		[event.timeZone],
	);

	const candidateDates = useMemo(() => [...event.dates].sort(), [event.dates]);

	const allSlots = useMemo(
		() => generateDateSlots(event.dates, event.timeZone),
		[event.dates, event.timeZone],
	);

	const heatmapData = useMemo(
		() => calculateHeatmap(responses, allSlots),
		[responses, allSlots],
	);

	// Slots the highlighted respondent selected (for the filtered/per-person view).
	const highlightedSlots = useMemo(
		() => new Set(highlightedResponse?.selectedSlots ?? []),
		[highlightedResponse],
	);
	const isFiltered = highlightedResponse !== undefined;

	// Best individual days (reuses the time-slot ranker).
	const bestDays = useMemo(
		() => getBestTimeSlots(heatmapData, 3),
		[heatmapData],
	);

	// Best consecutive stretch (vacation window).
	const bestRun = useMemo(() => {
		const days: DayAvailability[] = candidateDates.map((date) => ({
			date,
			data: heatmapData.get(slotForDate(date)) ?? {
				count: 0,
				percentage: 0,
				respondents: [],
			},
		}));
		return getBestConsecutiveRun(days);
	}, [candidateDates, heatmapData, slotForDate]);

	// Grouped events: rank whole blocks (each weekend / work-week) instead of days.
	const grouped = isGroupedPattern(event.datePattern);
	const bestBlocks = useMemo(() => {
		if (!grouped) return [];
		const blocks = getDateBlocks(candidateDates);
		const respondentDaySets = responses.map(
			(r) => new Set(r.selectedSlots.map((s) => formatDate(s, event.timeZone))),
		);
		return getBestBlocks(blocks, respondentDaySets, 3);
	}, [grouped, candidateDates, responses, event.timeZone]);

	// Group candidate dates into calendar months for rendering.
	const months = useMemo(() => {
		const candidateSet = new Set(candidateDates);
		const seen = new Set<string>();
		const result: { key: string; label: string; cells: (string | null)[] }[] =
			[];

		for (const dateStr of candidateDates) {
			const monthKey = dateStr.slice(0, 7); // YYYY-MM
			if (seen.has(monthKey)) continue;
			seen.add(monthKey);

			const monthDate = parseISO(dateStr);
			const days = eachDayOfInterval({
				start: startOfMonth(monthDate),
				end: endOfMonth(monthDate),
			});
			const leadingBlanks = getDay(days[0]); // 0 (Sun) - 6 (Sat)
			const cells: (string | null)[] = Array(leadingBlanks).fill(null);
			for (const d of days) {
				const key = format(d, "yyyy-MM-dd");
				cells.push(candidateSet.has(key) ? key : "");
			}
			result.push({
				key: monthKey,
				label: format(monthDate, "MMMM yyyy"),
				cells,
			});
		}
		return result;
	}, [candidateDates]);

	return (
		<div className="space-y-6">
			{/* Grouped recommendations: best blocks */}
			{grouped && totalRespondents > 0 && bestBlocks.length > 0 && (
				<div className="rounded-lg border border-teal-700 bg-gradient-to-r from-teal-900/20 to-emerald-900/20 p-6">
					<div className="mb-4 flex items-center gap-2">
						<TrendingUp className="h-5 w-5 text-teal-400" />
						<h3 className="text-xl font-bold text-foreground">Best options</h3>
					</div>
					<div className="space-y-2">
						{bestBlocks.map((b, index) => (
							<div
								key={b.block[0]}
								className="flex items-center justify-between rounded-lg bg-card/50 p-3"
							>
								<div>
									<span className="text-sm text-muted-foreground">
										#{index + 1}
									</span>
									<span className="ml-3 font-semibold text-foreground">
										{formatBlockLabel(b.block)}
									</span>
								</div>
								<div className="text-right">
									<div className="font-bold text-teal-400">
										{b.count} / {totalRespondents}
									</div>
									<div className="text-xs text-muted-foreground">
										{Math.round(b.percentage)}% free all days
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Individual recommendations: best days + best stretch */}
			{!grouped && totalRespondents > 0 && bestDays.length > 0 && (
				<div className="rounded-lg border border-teal-700 bg-gradient-to-r from-teal-900/20 to-emerald-900/20 p-6">
					<div className="mb-4 flex items-center gap-2">
						<TrendingUp className="h-5 w-5 text-teal-400" />
						<h3 className="text-xl font-bold text-foreground">Best Days</h3>
					</div>

					{bestRun && bestRun.length > 1 && bestRun.minCount > 0 && (
						<div className="mb-4 flex items-center justify-between rounded-lg bg-card/60 p-3">
							<div className="flex items-center gap-2">
								<CalendarRange className="h-4 w-4 text-teal-400" />
								<span className="font-semibold text-foreground">
									Best stretch: {formatDateDisplay(bestRun.startDate)} –{" "}
									{formatDateDisplay(bestRun.endDate)}
								</span>
							</div>
							<div className="text-right">
								<div className="font-bold text-teal-400">
									{bestRun.length} days in a row
								</div>
								<div className="text-xs text-muted-foreground">
									{bestRun.minCount} / {totalRespondents} free all days
								</div>
							</div>
						</div>
					)}

					<div className="space-y-2">
						{bestDays.map(([slot, data], index) => (
							<div
								key={slot}
								className="flex items-center justify-between rounded-lg bg-card/50 p-3"
							>
								<div>
									<span className="text-sm text-muted-foreground">
										#{index + 1}
									</span>
									<span className="ml-3 font-semibold text-foreground">
										{formatDateDisplay(
											candidateDateForSlot(slot, candidateDates, slotForDate),
										)}
									</span>
								</div>
								<div className="text-right">
									<div className="font-bold text-teal-400">
										{data.count} / {totalRespondents}
									</div>
									<div className="text-xs text-muted-foreground">
										{Math.round(data.percentage)}% available
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Calendar heatmap */}
			<div>
				<h3 className="mb-4 text-xl font-bold text-foreground">
					Availability Calendar
				</h3>
				<div className="space-y-6">
					{months.map((month) => (
						<div key={month.key}>
							<h4 className="mb-2 font-semibold text-foreground">
								{month.label}
							</h4>
							<div className="grid grid-cols-7 gap-1">
								{WEEKDAY_LABELS.map((label, i) => (
									<div
										key={`${month.key}-wd-${i}`}
										className="py-1 text-center text-xs font-normal text-muted-foreground"
									>
										{label}
									</div>
								))}
								{month.cells.map((cell, i) => {
									if (cell === null) {
										return <div key={`${month.key}-blank-${i}`} />;
									}
									if (cell === "") {
										// Non-candidate day in this month
										return (
											<div
												key={`${month.key}-filler-${i}`}
												className="aspect-square"
											/>
										);
									}
									const slot = slotForDate(cell);
									const data = heatmapData.get(slot) ?? {
										count: 0,
										percentage: 0,
										respondents: [],
									};
									return (
										<DayHeatCell
											key={cell}
											dateStr={cell}
											data={data}
											totalRespondents={totalRespondents}
											isDarkMode={isDarkMode}
											isFiltered={isFiltered}
											isHighlighted={highlightedSlots.has(slot)}
											highlightedName={highlightedResponse?.respondentName}
										/>
									);
								})}
							</div>
						</div>
					))}
				</div>

				{/* Legend */}
				<div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
					<span>Fewer</span>
					{[0, 20, 40, 60, 80, 100].map((pct) => (
						<span
							key={pct}
							className="inline-block h-4 w-6 rounded"
							style={{ backgroundColor: getHeatmapColor(pct, isDarkMode) }}
						/>
					))}
					<span>More available</span>
				</div>
			</div>
		</div>
	);
}

/** Map a canonical slot timestamp back to its candidate date string. */
function candidateDateForSlot(
	slot: string,
	candidateDates: string[],
	slotForDate: (dateStr: string) => string,
): string {
	return (
		candidateDates.find((d) => slotForDate(d) === slot) ?? candidateDates[0]
	);
}

interface DayHeatCellProps {
	dateStr: string;
	data: HeatmapSlotData;
	totalRespondents: number;
	isDarkMode: boolean;
	isFiltered: boolean;
	isHighlighted: boolean;
	highlightedName?: string;
}

function DayHeatCell({
	dateStr,
	data,
	totalRespondents,
	isDarkMode,
	isFiltered,
	isHighlighted,
	highlightedName,
}: DayHeatCellProps) {
	const dayNumber = dateStr.slice(8); // DD
	const bgColor = isFiltered
		? isHighlighted
			? "rgb(13, 148, 136)" // teal-500
			: "rgb(63, 63, 70)" // zinc-700
		: getHeatmapColor(data.percentage, isDarkMode);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="flex aspect-square min-h-[44px] w-full flex-col items-center justify-center rounded border border-border transition-all hover:ring-2 hover:ring-teal-500"
					style={{ backgroundColor: bgColor }}
					aria-label={`${formatDateDisplay(dateStr)}: ${data.count} of ${totalRespondents} available`}
				>
					<span className="text-xs text-white/80 drop-shadow">{dayNumber}</span>
					{data.count > 0 && (
						<span className="font-bold text-sm text-white drop-shadow-md">
							{data.count}
						</span>
					)}
				</button>
			</PopoverTrigger>
			<PopoverContent className="w-auto max-w-xs border-border bg-card text-card-foreground">
				<div className="space-y-2">
					<div>
						<p className="text-lg font-semibold">
							{formatDateDisplay(dateStr)}
						</p>
						<p className="text-sm text-muted-foreground">
							{data.count} of {totalRespondents} available (
							{Math.round(data.percentage)}%)
						</p>
					</div>
					{isFiltered ? (
						<p className="text-sm text-muted-foreground">
							{highlightedName} {isHighlighted ? "is" : "is not"} available
						</p>
					) : data.respondents.length > 0 ? (
						<ul className="space-y-1 border-t border-border pt-2">
							{data.respondents.map((name) => (
								<li key={name} className="text-sm text-teal-400">
									• {name}
								</li>
							))}
						</ul>
					) : (
						<p className="text-sm italic text-muted-foreground">
							No one available
						</p>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
