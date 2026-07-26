import { eachDayOfInterval, format, parse } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	formatDate,
	formatDateDisplay,
	parseTimeInZone,
} from "@/lib/time-utils";
import type { PublicEvent } from "../../../convex/shared_types";

interface DateAvailabilityCalendarProps {
	event: PublicEvent;
	initialSelections?: string[];
	onChange?: (selectedSlots: string[]) => void;
	mode?: "select" | "view";
}

/**
 * Calendar-based availability selector for dates-only events.
 *
 * Mirrors the public contract of AvailabilityGrid (event / initialSelections /
 * onChange emitting an array of canonical slot timestamps) so the responder
 * pages can swap between the two based on event.eventMode. Responders pick the
 * date ranges they're available: add a whole span at once, or toggle individual
 * days on the calendar. Only the event's candidate days are selectable.
 */
export function DateAvailabilityCalendar({
	event,
	initialSelections = [],
	onChange,
	mode = "select",
}: DateAvailabilityCalendarProps) {
	// Canonical slot timestamp for a candidate date (midnight in event tz).
	const slotForDate = useMemo(
		() => (dateStr: string) =>
			parseTimeInZone(dateStr, "00:00", event.timeZone).toISOString(),
		[event.timeZone],
	);

	// Sorted candidate day strings and the set for quick membership checks.
	const candidateDates = useMemo(() => [...event.dates].sort(), [event.dates]);
	const candidateSet = useMemo(() => new Set(candidateDates), [candidateDates]);

	// Selection tracked as yyyy-MM-dd strings; only ever candidate days.
	const [selected, setSelected] = useState<Set<string>>(() => {
		const initial = new Set<string>();
		for (const slot of initialSelections) {
			const dateStr = formatDate(slot, event.timeZone);
			if (candidateSet.has(dateStr)) initial.add(dateStr);
		}
		return initial;
	});

	const [rangeFrom, setRangeFrom] = useState("");
	const [rangeTo, setRangeTo] = useState("");

	// Emit selected slots on change, skipping the initial mount (parent already
	// holds the initial selection) — same pattern as AvailabilityGrid.
	const isInitialRender = useRef(true);
	useEffect(() => {
		if (isInitialRender.current) {
			isInitialRender.current = false;
			return;
		}
		if (!onChange) return;
		const slots = [...selected]
			.filter((d) => candidateSet.has(d))
			.map(slotForDate)
			.sort();
		onChange(slots);
	}, [selected, onChange, slotForDate, candidateSet]);

	const isView = mode === "view";

	const selectedDateObjects = useMemo(
		() => [...selected].sort().map((ds) => parse(ds, "yyyy-MM-dd", new Date())),
		[selected],
	);

	const firstCandidate = candidateDates[0]
		? parse(candidateDates[0], "yyyy-MM-dd", new Date())
		: undefined;
	const lastCandidate = candidateDates[candidateDates.length - 1]
		? parse(candidateDates[candidateDates.length - 1], "yyyy-MM-dd", new Date())
		: undefined;

	const handleCalendarSelect = (dates: Date[] | undefined) => {
		const next = new Set<string>();
		for (const d of dates ?? []) {
			const key = format(d, "yyyy-MM-dd");
			if (candidateSet.has(key)) next.add(key);
		}
		setSelected(next);
	};

	const handleAddRange = () => {
		if (!rangeFrom || !rangeTo) return;
		const start = parse(rangeFrom, "yyyy-MM-dd", new Date());
		const end = parse(rangeTo, "yyyy-MM-dd", new Date());
		if (end < start) return;
		setSelected((prev) => {
			const next = new Set(prev);
			for (const d of eachDayOfInterval({ start, end })) {
				const key = format(d, "yyyy-MM-dd");
				if (candidateSet.has(key)) next.add(key);
			}
			return next;
		});
		setRangeFrom("");
		setRangeTo("");
	};

	const removeDate = (dateStr: string) => {
		setSelected((prev) => {
			const next = new Set(prev);
			next.delete(dateStr);
			return next;
		});
	};

	const selectAll = () => setSelected(new Set(candidateDates));
	const clearAll = () => setSelected(new Set());

	return (
		<div className="space-y-4">
			{!isView && (
				<div className="flex flex-col gap-2 sm:flex-row sm:items-end">
					<div className="flex-1 space-y-1">
						<Label htmlFor="avail-from" className="text-sm">
							Available from
						</Label>
						<Input
							id="avail-from"
							type="date"
							min={candidateDates[0]}
							max={candidateDates[candidateDates.length - 1]}
							value={rangeFrom}
							onChange={(e) => setRangeFrom(e.target.value)}
							className="bg-background border-border text-foreground"
						/>
					</div>
					<div className="flex-1 space-y-1">
						<Label htmlFor="avail-to" className="text-sm">
							to
						</Label>
						<Input
							id="avail-to"
							type="date"
							min={candidateDates[0]}
							max={candidateDates[candidateDates.length - 1]}
							value={rangeTo}
							onChange={(e) => setRangeTo(e.target.value)}
							className="bg-background border-border text-foreground"
						/>
					</div>
					<Button
						type="button"
						variant="outline"
						onClick={handleAddRange}
						disabled={!rangeFrom || !rangeTo}
					>
						Add range
					</Button>
				</div>
			)}

			<div className="flex justify-center rounded-lg border border-border bg-card p-2">
				<Calendar
					mode="multiple"
					selected={selectedDateObjects}
					onSelect={isView ? undefined : handleCalendarSelect}
					disabled={(date) => !candidateSet.has(format(date, "yyyy-MM-dd"))}
					defaultMonth={firstCandidate}
					startMonth={firstCandidate}
					endMonth={lastCandidate}
					className="rounded-md"
				/>
			</div>

			{!isView && (
				<div className="flex flex-wrap items-center gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={selectAll}
						disabled={selected.size === candidateDates.length}
					>
						Select all
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={clearAll}
						disabled={selected.size === 0}
					>
						Clear
					</Button>
				</div>
			)}

			{selected.size > 0 && (
				<div className="flex flex-wrap gap-2">
					{[...selected].sort().map((dateStr) => (
						<button
							key={dateStr}
							type="button"
							onClick={() => !isView && removeDate(dateStr)}
							className="rounded bg-teal-600/20 px-2 py-1 text-sm text-teal-600 dark:text-teal-400"
							aria-label={`Remove ${formatDateDisplay(dateStr)}`}
						>
							{formatDateDisplay(dateStr)}
							{!isView && <span className="ml-1">×</span>}
						</button>
					))}
				</div>
			)}

			<p className="text-sm text-muted-foreground">
				{selected.size} day{selected.size === 1 ? "" : "s"} selected
			</p>
		</div>
	);
}
