import { parse } from "date-fns";
import { useCallback, useMemo, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics-events";
import { isGroupedPattern } from "@/lib/date-blocks";
import { formatDate, parseTimeInZone } from "@/lib/time-utils";
import type { PublicEvent } from "../../../convex/shared_types";
import { DateBlockSelector } from "./DateBlockSelector";
import { DayPoolPicker } from "./DayPoolPicker";

interface DateAvailabilityCalendarProps {
	event: PublicEvent;
	initialSelections?: string[];
	onChange?: (selectedSlots: string[]) => void;
}

/**
 * Availability selector for dates-only events. Grouped events (weekends /
 * weekdays / custom) render a block selector; individual events render the
 * shared DayPoolPicker, mapping between candidate day strings and the canonical
 * slot timestamps stored on responses.
 */
export function DateAvailabilityCalendar({
	event,
	initialSelections = [],
	onChange,
}: DateAvailabilityCalendarProps) {
	// Fire response_grid_interacted on the first day/block toggle only
	const hasTrackedInteractionRef = useRef(false);
	const trackedOnChange = useCallback(
		(slots: string[]) => {
			if (!hasTrackedInteractionRef.current) {
				hasTrackedInteractionRef.current = true;
				trackEvent("response_grid_interacted", {
					eventId: event._id,
					eventMode: "dates",
				});
			}
			onChange?.(slots);
		},
		[onChange, event._id],
	);

	if (isGroupedPattern(event.datePattern)) {
		return (
			<DateBlockSelector
				event={event}
				initialSelections={initialSelections}
				onChange={trackedOnChange}
			/>
		);
	}
	return (
		<IndividualDateCalendar
			event={event}
			initialSelections={initialSelections}
			onChange={trackedOnChange}
		/>
	);
}

function IndividualDateCalendar({
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
