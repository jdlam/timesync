import { ChevronDown, ChevronRight } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { Doc } from "../../../convex/_generated/dataModel";
import type { HeatmapSlotData } from "@/lib/heatmap-utils";
import {
	formatDateDisplay,
	formatTimeSlot,
	generateTimeSlots,
	getDateColumnLabel,
	groupSlotsByDate,
} from "@/lib/time-utils";
import { GridCell } from "./GridCell";

interface AvailabilityGridProps {
	event: Doc<"events">;
	initialSelections?: string[];
	onChange?: (selectedSlots: string[]) => void;
	mode?: "select" | "view";
	heatmapData?: Map<string, HeatmapSlotData>;
	getHeatmapColor?: (timestamp: string) => string;
}

export function AvailabilityGrid({
	event,
	initialSelections = [],
	onChange,
	mode = "select",
	heatmapData,
	getHeatmapColor,
}: AvailabilityGridProps) {
	const [selectedSlots, setSelectedSlots] = useState<Set<string>>(
		new Set(initialSelections),
	);
	const [isDragging, setIsDragging] = useState(false);
	// Track whether drag is selecting or deselecting
	const dragModeRef = useRef<"select" | "deselect" | null>(null);
	// Track last clicked cell for shift+click range selection
	const lastClickedRef = useRef<string | null>(null);
	const [expandedDates, setExpandedDates] = useState<Set<string>>(
		new Set(event.dates),
	);

	// Generate all time slots
	const allSlots = useMemo(
		() =>
			generateTimeSlots(
				event.dates,
				event.timeRangeStart,
				event.timeRangeEnd,
				event.slotDuration,
				event.timeZone,
			),
		[event],
	);

	// Group slots by date
	const slotsByDate = useMemo(
		() => groupSlotsByDate(allSlots, event.timeZone),
		[allSlots, event.timeZone],
	);

	// Get unique time labels (for desktop table header)
	const uniqueTimes = useMemo(() => {
		const firstDateSlots = Array.from(slotsByDate.values())[0] || [];
		return firstDateSlots.map((slot) =>
			formatTimeSlot(slot, event.timeZone, "short"),
		);
	}, [slotsByDate, event.timeZone]);

	// Handle slot interaction
	const handleSlotInteraction = useCallback(
		(
			timestamp: string,
			action: "start" | "enter" | "click",
			shiftKey?: boolean,
		) => {
			if (mode === "view") return;

			setSelectedSlots((prev) => {
				const newSelected = new Set(prev);

				if (action === "start") {
					// Mouse down - start drag, determine if selecting or deselecting
					const wasSelected = newSelected.has(timestamp);
					dragModeRef.current = wasSelected ? "deselect" : "select";

					if (wasSelected) {
						newSelected.delete(timestamp);
					} else {
						newSelected.add(timestamp);
					}
					lastClickedRef.current = timestamp;
				} else if (action === "enter" && isDragging && dragModeRef.current) {
					// Mouse enter while dragging
					if (dragModeRef.current === "select") {
						newSelected.add(timestamp);
					} else {
						newSelected.delete(timestamp);
					}
				} else if (action === "click" && shiftKey) {
					// Shift+click - select or deselect range based on clicked cell's state
					const shouldSelect = !newSelected.has(timestamp);

					if (lastClickedRef.current) {
						const lastIndex = allSlots.indexOf(lastClickedRef.current);
						const currentIndex = allSlots.indexOf(timestamp);

						if (lastIndex !== -1 && currentIndex !== -1) {
							const startIndex = Math.min(lastIndex, currentIndex);
							const endIndex = Math.max(lastIndex, currentIndex);

							for (let i = startIndex; i <= endIndex; i++) {
								if (shouldSelect) {
									newSelected.add(allSlots[i]);
								} else {
									newSelected.delete(allSlots[i]);
								}
							}
						}
					} else {
						// No previous click, just toggle this cell
						if (shouldSelect) {
							newSelected.add(timestamp);
						} else {
							newSelected.delete(timestamp);
						}
					}
					lastClickedRef.current = timestamp;
				}

				// Notify parent of change
				if (onChange) {
					onChange(Array.from(newSelected));
				}

				return newSelected;
			});
		},
		[mode, onChange, isDragging, allSlots],
	);

	// Handle mouse down to start dragging
	const handleMouseDown = () => {
		if (mode === "select") {
			setIsDragging(true);
		}
	};

	// Handle mouse up to stop dragging
	const handleMouseUp = () => {
		setIsDragging(false);
		dragModeRef.current = null;
	};

	// Toggle date expansion in mobile view
	const toggleDateExpansion = (date: string) => {
		setExpandedDates((prev) => {
			const newExpanded = new Set(prev);
			if (newExpanded.has(date)) {
				newExpanded.delete(date);
			} else {
				newExpanded.add(date);
			}
			return newExpanded;
		});
	};

	return (
		<div
			onMouseDown={handleMouseDown}
			onMouseUp={handleMouseUp}
			onMouseLeave={handleMouseUp}
			className="w-full select-none"
		>
			{/* Desktop Grid View */}
			<div className="hidden md:block overflow-x-auto">
				<div className="min-w-full inline-block">
					<table className="w-full border-collapse">
						<thead>
							<tr>
								<th className="sticky left-0 z-10 bg-card border border-border p-3 text-left">
									<span className="text-muted-foreground font-semibold">
										Time
									</span>
								</th>
								{Array.from(slotsByDate.keys()).map((date) => (
									<th
										key={date}
										className="border border-border p-3 min-w-[120px] bg-card"
									>
										<div className="text-center">
											<div className="text-foreground font-semibold">
												{getDateColumnLabel(date)}
											</div>
											<div className="text-muted-foreground text-xs mt-1">
												{formatDateDisplay(date)}
											</div>
										</div>
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{uniqueTimes.map((timeLabel, timeIndex) => (
								<tr key={timeIndex}>
									<td className="sticky left-0 z-10 bg-card border border-border p-3">
										<span className="text-muted-foreground text-sm font-medium">
											{timeLabel}
										</span>
									</td>
									{Array.from(slotsByDate.entries()).map(([date, slots]) => {
										const slot = slots[timeIndex];
										if (!slot)
											return <td key={date} className="border border-border" />;

										return (
											<td key={date} className="border border-border p-2">
												<GridCell
													timestamp={slot}
													displayTime={timeLabel}
													isSelected={selectedSlots.has(slot)}
													mode={mode}
													onInteraction={handleSlotInteraction}
													isDragging={isDragging}
													heatmapData={heatmapData?.get(slot)}
													heatmapColor={getHeatmapColor?.(slot)}
												/>
											</td>
										);
									})}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{/* Mobile Accordion View */}
			<div className="md:hidden space-y-4">
				{Array.from(slotsByDate.entries()).map(([date, slots]) => {
					const isExpanded = expandedDates.has(date);

					return (
						<div
							key={date}
							className="bg-card border border-border rounded-lg overflow-hidden"
						>
							<button
								type="button"
								onClick={() => toggleDateExpansion(date)}
								className="w-full p-4 flex items-center justify-between hover:bg-accent transition-colors cursor-pointer"
							>
								<div className="text-left">
									<div className="text-foreground font-semibold">
										{getDateColumnLabel(date)}
									</div>
									<div className="text-muted-foreground text-sm">
										{formatDateDisplay(date)}
									</div>
								</div>
								{isExpanded ? (
									<ChevronDown className="w-5 h-5 text-muted-foreground" />
								) : (
									<ChevronRight className="w-5 h-5 text-muted-foreground" />
								)}
							</button>

							{isExpanded && (
								<div className="p-4 pt-0 space-y-2">
									{slots.map((slot) => {
										const timeLabel = formatTimeSlot(
											slot,
											event.timeZone,
											"short",
										);
										return (
											<GridCell
												key={slot}
												timestamp={slot}
												displayTime={timeLabel}
												isSelected={selectedSlots.has(slot)}
												mode={mode}
												onInteraction={handleSlotInteraction}
												heatmapData={heatmapData?.get(slot)}
												heatmapColor={getHeatmapColor?.(slot)}
											/>
										);
									})}
								</div>
							)}
						</div>
					);
				})}
			</div>

			{/* Selection Summary (for select mode) */}
			{mode === "select" && (
				<div className="mt-4 p-4 bg-card border border-border rounded-lg">
					<p className="text-muted-foreground">
						Selected:{" "}
						<span className="text-cyan-400 font-semibold">
							{selectedSlots.size}
						</span>{" "}
						time slot{selectedSlots.size !== 1 ? "s" : ""}
					</p>
				</div>
			)}
		</div>
	);
}
