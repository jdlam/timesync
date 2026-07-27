import { format } from "date-fns";
import { CalendarPlus } from "lucide-react";
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
import { formatBlockLabel, getDateBlocks } from "@/lib/date-blocks";
import { getDateRangeSpanDays } from "@/lib/tier-config";
import { isDateInPast } from "@/lib/time-utils";
import { datesInRangeMatchingWeekdays } from "./DayPoolPicker";

interface PatternRangePickerProps {
	/** Weekday indices (0=Sun…6=Sat) the pattern selects. */
	weekdays: number[];
	/** Controlled candidate days (YYYY-MM-DD). */
	selected: string[];
	onSelectedChange: (next: string[]) => void;
	disablePast?: boolean;
	maxSpanDays?: number;
	spanWeeks?: number;
	fromMonth?: Date;
	toMonth?: Date;
}

/**
 * Candidate-day builder for grouped (weekends / weekdays / custom) dates events.
 * The creator picks a date range; every day in it matching the pattern weekdays
 * is added, forming contiguous blocks (each weekend, each work-week, …) shown as
 * removable chips. Unlike DayPoolPicker there is no individual-day tapping —
 * grouped events are edited at the block level.
 */
export function PatternRangePicker({
	weekdays,
	selected,
	onSelectedChange,
	disablePast = false,
	maxSpanDays,
	spanWeeks,
	fromMonth,
	toMonth,
}: PatternRangePickerProps) {
	const [rangeOpen, setRangeOpen] = useState(false);
	const [range, setRange] = useState<DateRange | undefined>();

	const weekdaySet = new Set(weekdays);
	const canPick = (key: string) => !disablePast || !isDateInPast(key);

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

	const handleAddRange = () => {
		if (!range?.from) return;
		const end = range.to ?? range.from;
		const toAdd = datesInRangeMatchingWeekdays(
			range.from,
			end,
			weekdaySet,
		).filter(canPick);
		if (toAdd.length === 0) {
			toast.error("No matching days in that range");
			return;
		}
		commit([...selected, ...toAdd]);
		setRange(undefined);
		setRangeOpen(false);
	};

	const blocks = getDateBlocks(selected);

	const removeBlock = (block: string[]) => {
		const drop = new Set(block);
		onSelectedChange(selected.filter((d) => !drop.has(d)));
	};

	// Allow any start/end; the pattern weekdays are applied when adding.
	const disabledInPopover = (date: Date) =>
		!canPick(format(date, "yyyy-MM-dd"));

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center gap-2">
				<Popover open={rangeOpen} onOpenChange={setRangeOpen}>
					<PopoverTrigger asChild>
						<Button type="button" variant="outline" className="gap-2">
							<CalendarPlus className="h-4 w-4" />
							Add a range
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto" align="start">
						<div className="space-y-3">
							<p className="text-sm font-medium text-foreground">
								Pick a start and end date
							</p>
							<Calendar
								mode="range"
								selected={range}
								onSelect={setRange}
								disabled={disabledInPopover}
								defaultMonth={range?.from ?? fromMonth}
								startMonth={fromMonth}
								endMonth={toMonth}
							/>
							<Button
								type="button"
								onClick={handleAddRange}
								disabled={!range?.from}
								className="w-full"
							>
								Add these days
							</Button>
						</div>
					</PopoverContent>
				</Popover>
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

			{blocks.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{blocks.map((block) => (
						<button
							key={block[0]}
							type="button"
							onClick={() => removeBlock(block)}
							className="rounded bg-teal-600/20 px-2 py-1 text-sm text-teal-600 dark:text-teal-400"
							aria-label={`Remove ${formatBlockLabel(block)}`}
						>
							{formatBlockLabel(block)}
							<span className="ml-1">×</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
