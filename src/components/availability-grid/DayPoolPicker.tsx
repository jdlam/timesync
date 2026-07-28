import { eachDayOfInterval, format, getDay, parse } from "date-fns";
import { CalendarPlus, CalendarRange } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { getDateRangeSpanDays } from "@/lib/tier-config";
import { formatDateDisplay, isDateInPast } from "@/lib/time-utils";
import { cn } from "@/lib/utils";

interface DayPoolPickerProps {
	/** Controlled selection as sorted-or-unsorted YYYY-MM-DD strings. */
	selected: string[];
	onSelectedChange: (next: string[]) => void;
	/** Restrict which days can be picked (e.g. responder → candidate days only). */
	isSelectable?: (dateStr: string) => boolean;
	/** Disable past days (used when creating). */
	disablePast?: boolean;
	/** Calendar navigation bounds. */
	fromMonth?: Date;
	toMonth?: Date;
	defaultMonth?: Date;
	/** Cap the selection's calendar span (dates events); undefined = no cap. */
	maxSpanDays?: number;
	spanWeeks?: number;
	/** When provided, show a "Select all" button that selects exactly these. */
	selectAllDates?: string[];
}

const WEEKDAYS = [
	{ index: 0, label: "Su" },
	{ index: 1, label: "Mo" },
	{ index: 2, label: "Tu" },
	{ index: 3, label: "We" },
	{ index: 4, label: "Th" },
	{ index: 5, label: "Fr" },
	{ index: 6, label: "Sa" },
] as const;

const ALL_WEEKDAYS = new Set([0, 1, 2, 3, 4, 5, 6]);
const WEEKEND = new Set([0, 6]);
const WEEKDAY = new Set([1, 2, 3, 4, 5]);

const toKey = (d: Date) => format(d, "yyyy-MM-dd");
const parseKey = (k: string) => parse(k, "yyyy-MM-dd", new Date());

/**
 * Every day (YYYY-MM-DD) in [from, to] whose weekday is in `weekdays`
 * (0 = Sunday … 6 = Saturday). Used to bulk-add "every weekend" / "all
 * Fridays" style selections across a range.
 */
export function datesInRangeMatchingWeekdays(
	from: Date,
	to: Date,
	weekdays: Set<number>,
): string[] {
	if (to < from) return [];
	return eachDayOfInterval({ start: from, end: to })
		.filter((d) => weekdays.has(getDay(d)))
		.map(toKey);
}

/**
 * Shared day-selection control for dates-only events. Used by the event
 * creator (candidate-day pool) and by responders (their availability),
 * differing only by the `isSelectable` predicate and the span cap.
 *
 * Two complementary tools, clearly separated so it's obvious they're not
 * either/or:
 *  - "Add multiple days" popover: pick a range on the same calendar widget,
 *    optionally filtered to specific weekdays (e.g. every weekend).
 *  - The always-visible calendar below: tap individual days to fine-tune.
 */
export function DayPoolPicker({
	selected,
	onSelectedChange,
	isSelectable,
	disablePast = false,
	fromMonth,
	toMonth,
	defaultMonth,
	maxSpanDays,
	spanWeeks,
	selectAllDates,
}: DayPoolPickerProps) {
	const [rangeOpen, setRangeOpen] = useState(false);
	const [range, setRange] = useState<DateRange | undefined>();
	const [weekdays, setWeekdays] = useState<Set<number>>(
		() => new Set(ALL_WEEKDAYS),
	);

	const canPick = (key: string) =>
		(isSelectable?.(key) ?? true) && (!disablePast || !isDateInPast(key));

	const isDisabled = (date: Date) => !canPick(toKey(date));

	// Dedupe, sort, and trim anything beyond the allowed span from the earliest.
	const commit = (keys: string[]) => {
		const sorted = Array.from(new Set(keys)).sort();
		let result = sorted;
		if (
			maxSpanDays &&
			sorted.length > 0 &&
			getDateRangeSpanDays(sorted) > maxSpanDays
		) {
			const minTime = Date.parse(`${sorted[0]}T00:00:00Z`);
			result = sorted.filter(
				(k) =>
					(Date.parse(`${k}T00:00:00Z`) - minTime) / 86_400_000 <=
					maxSpanDays - 1,
			);
			toast.error(`Dates can span at most ${spanWeeks} weeks on this plan`);
		}
		onSelectedChange(result);
	};

	const selectedDateObjects = [...selected].sort().map(parseKey);

	const handleCalendarToggle = (dates: Date[] | undefined) => {
		const keys = (dates ?? []).map(toKey).filter(canPick);
		commit(keys);
	};

	const toggleWeekday = (index: number) => {
		setWeekdays((prev) => {
			const next = new Set(prev);
			if (next.has(index)) next.delete(index);
			else next.add(index);
			return next;
		});
	};

	const handleAddRange = () => {
		if (!range?.from) return;
		const end = range.to ?? range.from;
		const toAdd = datesInRangeMatchingWeekdays(
			range.from,
			end,
			weekdays,
		).filter(canPick);
		if (toAdd.length === 0) {
			toast.error("No matching days in that range");
			return;
		}
		commit([...selected, ...toAdd]);
		setRange(undefined);
		setWeekdays(new Set(ALL_WEEKDAYS));
		setRangeOpen(false);
	};

	const removeDate = (key: string) => {
		onSelectedChange(selected.filter((k) => k !== key));
	};

	const rangeLabel =
		range?.from &&
		(range.to
			? `${formatDateDisplay(toKey(range.from))} – ${formatDateDisplay(toKey(range.to))}`
			: formatDateDisplay(toKey(range.from)));

	return (
		<div className="space-y-3">
			{/* Bulk add */}
			<div className="flex flex-wrap items-center gap-2">
				<Popover open={rangeOpen} onOpenChange={setRangeOpen}>
					<PopoverTrigger asChild>
						<Button type="button" variant="outline" className="gap-2">
							<CalendarPlus className="h-4 w-4" />
							Add multiple days
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto" align="start">
						<div className="space-y-3">
							<p className="text-sm font-medium text-foreground">
								Pick a range
							</p>
							<Calendar
								mode="range"
								selected={range}
								onSelect={setRange}
								disabled={isDisabled}
								defaultMonth={defaultMonth ?? fromMonth}
								startMonth={fromMonth}
								endMonth={toMonth}
							/>
							{rangeLabel && (
								<p className="text-sm text-muted-foreground">{rangeLabel}</p>
							)}

							<div className="space-y-2">
								<p className="text-sm font-medium text-foreground">
									Include which days?
								</p>
								<div className="flex flex-wrap gap-1">
									{WEEKDAYS.map((wd) => (
										<button
											key={wd.index}
											type="button"
											onClick={() => toggleWeekday(wd.index)}
											aria-pressed={weekdays.has(wd.index)}
											className={cn(
												"h-9 w-9 rounded-md border text-sm font-medium transition-colors",
												weekdays.has(wd.index)
													? "border-teal-500 bg-teal-500/15 text-teal-600 dark:text-teal-400"
													: "border-border bg-background text-muted-foreground hover:bg-muted/50",
											)}
										>
											{wd.label}
										</button>
									))}
								</div>
								<div className="flex flex-wrap gap-2">
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => setWeekdays(new Set(WEEKEND))}
									>
										Weekends
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => setWeekdays(new Set(WEEKDAY))}
									>
										Weekdays
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => setWeekdays(new Set(ALL_WEEKDAYS))}
									>
										All days
									</Button>
								</div>
							</div>

							<Button
								type="button"
								onClick={handleAddRange}
								disabled={!range?.from || weekdays.size === 0}
								className="w-full"
							>
								Add these days
							</Button>
						</div>
					</PopoverContent>
				</Popover>

				{selectAllDates && (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => onSelectedChange([...selectAllDates])}
						disabled={selected.length === selectAllDates.length}
					>
						Select all
					</Button>
				)}
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => onSelectedChange([])}
					disabled={selected.length === 0}
				>
					Clear
				</Button>
			</div>

			{/* Fine-tune */}
			<div className="rounded-lg border border-border bg-card p-2">
				<p className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
					<CalendarRange className="h-4 w-4" />
					Or tap individual days to fine-tune
				</p>
				<div className="flex justify-center">
					<Calendar
						mode="multiple"
						selected={selectedDateObjects}
						onSelect={handleCalendarToggle}
						disabled={isDisabled}
						defaultMonth={defaultMonth ?? fromMonth}
						startMonth={fromMonth}
						endMonth={toMonth}
						className="rounded-md"
					/>
				</div>
			</div>

			{selected.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{[...selected].sort().map((key) => (
						<button
							key={key}
							type="button"
							onClick={() => removeDate(key)}
							className="rounded bg-teal-600/20 px-2 py-1 text-sm text-teal-600 dark:text-teal-400"
							aria-label={`Remove ${formatDateDisplay(key)}`}
						>
							{formatDateDisplay(key)}
							<span className="ml-1">×</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
