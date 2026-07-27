import { parse } from "date-fns";
import { useMemo, useState } from "react";
import { formatDate, parseTimeInZone } from "@/lib/time-utils";
import type { PublicEvent } from "../../../convex/shared_types";
import { DayPoolPicker } from "./DayPoolPicker";

interface DateAvailabilityCalendarProps {
	event: PublicEvent;
	initialSelections?: string[];
	onChange?: (selectedSlots: string[]) => void;
}

/**
 * Availability selector for dates-only events. A thin wrapper over the shared
 * DayPoolPicker that maps between the event's candidate day strings and the
 * canonical slot timestamps stored on responses. Responders may only pick the
 * event's candidate days (enforced via the isSelectable predicate).
 */
export function DateAvailabilityCalendar({
	event,
	initialSelections = [],
	onChange,
}: DateAvailabilityCalendarProps) {
	const slotForDate = useMemo(
		() => (dateStr: string) =>
			parseTimeInZone(dateStr, "00:00", event.timeZone).toISOString(),
		[event.timeZone],
	);

	const candidateDates = useMemo(() => [...event.dates].sort(), [event.dates]);
	const candidateSet = useMemo(() => new Set(candidateDates), [candidateDates]);

	// Selection tracked as YYYY-MM-DD strings; seeded from any existing slots.
	const [selected, setSelected] = useState<string[]>(() =>
		initialSelections
			.map((slot) => formatDate(slot, event.timeZone))
			.filter((d) => candidateSet.has(d)),
	);

	const handleChange = (next: string[]) => {
		setSelected(next);
		onChange?.(
			next
				.filter((d) => candidateSet.has(d))
				.map(slotForDate)
				.sort(),
		);
	};

	const firstCandidate = candidateDates[0]
		? parse(candidateDates[0], "yyyy-MM-dd", new Date())
		: undefined;
	const lastCandidate = candidateDates[candidateDates.length - 1]
		? parse(candidateDates[candidateDates.length - 1], "yyyy-MM-dd", new Date())
		: undefined;

	return (
		<DayPoolPicker
			selected={selected}
			onSelectedChange={handleChange}
			isSelectable={(dateStr) => candidateSet.has(dateStr)}
			defaultMonth={firstCandidate}
			fromMonth={firstCandidate}
			toMonth={lastCandidate}
			selectAllDates={candidateDates}
		/>
	);
}
