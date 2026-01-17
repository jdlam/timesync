import { ChevronDown, ChevronRight, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import type { Doc } from "../../../convex/_generated/dataModel";
import {
	calculateHeatmap,
	getBestTimeSlots,
	getHeatmapColor,
} from "@/lib/heatmap-utils";
import { useTheme } from "@/lib/theme";
import {
	formatDateDisplay,
	formatTimeSlot,
	generateTimeSlots,
	getDateColumnLabel,
	groupSlotsByDate,
} from "@/lib/time-utils";
import { HeatmapCell } from "./HeatmapCell";

interface HeatmapGridProps {
	event: Doc<"events">;
	responses: Doc<"responses">[];
}

export function HeatmapGrid({ event, responses }: HeatmapGridProps) {
	const [expandedDates, setExpandedDates] = useState<Set<string>>(
		new Set(event.dates),
	);
	const { effectiveTheme } = useTheme();
	const isDarkMode = effectiveTheme === "dark";

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

	// Calculate heatmap data
	const heatmapData = useMemo(
		() => calculateHeatmap(responses, allSlots),
		[responses, allSlots],
	);

	// Get best time slots
	const bestSlots = useMemo(
		() => getBestTimeSlots(heatmapData, 3),
		[heatmapData],
	);

	// Group slots by date
	const slotsByDate = useMemo(
		() => groupSlotsByDate(allSlots, event.timeZone),
		[allSlots, event.timeZone],
	);

	// Get unique time labels
	const uniqueTimes = useMemo(() => {
		const firstDateSlots = Array.from(slotsByDate.values())[0] || [];
		return firstDateSlots.map((slot) =>
			formatTimeSlot(slot, event.timeZone, "short"),
		);
	}, [slotsByDate, event.timeZone]);

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
		<div className="space-y-6">
			{/* Best Times Section */}
			{responses.length > 0 && bestSlots.length > 0 && (
				<div className="bg-gradient-to-r from-cyan-900/20 to-green-900/20 border border-cyan-700 rounded-lg p-6">
					<div className="flex items-center gap-2 mb-4">
						<TrendingUp className="w-5 h-5 text-cyan-400" />
						<h3 className="text-xl font-bold text-foreground">
							Best Available Times
						</h3>
					</div>
					<div className="space-y-2">
						{bestSlots.map(([timestamp, data], index) => (
							<div
								key={timestamp}
								className="flex items-center justify-between bg-card/50 rounded-lg p-3"
							>
								<div>
									<span className="text-muted-foreground text-sm">
										#{index + 1}
									</span>
									<span className="text-foreground font-semibold ml-3">
										{formatTimeSlot(timestamp, event.timeZone, "long")}
									</span>
								</div>
								<div className="text-right">
									<div className="text-cyan-400 font-bold">
										{data.count} / {responses.length}
									</div>
									<div className="text-muted-foreground text-xs">
										{Math.round(data.percentage)}% available
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Heatmap Grid */}
			<div>
				<h3 className="text-xl font-bold text-foreground mb-4">
					Availability Heatmap
				</h3>

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
												return (
													<td key={date} className="border border-border" />
												);

											const data = heatmapData.get(slot);
											if (!data)
												return (
													<td key={date} className="border border-border" />
												);

											const bgColor = getHeatmapColor(
												data.percentage,
												isDarkMode,
											);

											return (
												<td key={date} className="border border-border p-2">
													<HeatmapCell
														timestamp={slot}
														displayTime={timeLabel}
														data={data}
														bgColor={bgColor}
														totalRespondents={responses.length}
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
											const data = heatmapData.get(slot);
											if (!data) return null;

											const bgColor = getHeatmapColor(
												data.percentage,
												isDarkMode,
											);

											return (
												<HeatmapCell
													key={slot}
													timestamp={slot}
													displayTime={timeLabel}
													data={data}
													bgColor={bgColor}
													totalRespondents={responses.length}
												/>
											);
										})}
									</div>
								)}
							</div>
						);
					})}
				</div>

				{/* Legend */}
				<div className="mt-6 bg-card border border-border rounded-lg p-4">
					<p className="text-sm text-muted-foreground mb-2">Color Legend:</p>
					<div className="flex flex-wrap gap-4">
						<div className="flex items-center gap-2">
							<div
								className="w-6 h-6 rounded"
								style={{ backgroundColor: getHeatmapColor(0, isDarkMode) }}
							/>
							<span className="text-sm text-foreground">0% (None)</span>
						</div>
						<div className="flex items-center gap-2">
							<div
								className="w-6 h-6 rounded"
								style={{ backgroundColor: getHeatmapColor(20, isDarkMode) }}
							/>
							<span className="text-sm text-foreground">1-20%</span>
						</div>
						<div className="flex items-center gap-2">
							<div
								className="w-6 h-6 rounded"
								style={{ backgroundColor: getHeatmapColor(40, isDarkMode) }}
							/>
							<span className="text-sm text-foreground">21-40%</span>
						</div>
						<div className="flex items-center gap-2">
							<div
								className="w-6 h-6 rounded"
								style={{ backgroundColor: getHeatmapColor(60, isDarkMode) }}
							/>
							<span className="text-sm text-foreground">41-60%</span>
						</div>
						<div className="flex items-center gap-2">
							<div
								className="w-6 h-6 rounded"
								style={{ backgroundColor: getHeatmapColor(80, isDarkMode) }}
							/>
							<span className="text-sm text-foreground">61-80%</span>
						</div>
						<div className="flex items-center gap-2">
							<div
								className="w-6 h-6 rounded"
								style={{ backgroundColor: getHeatmapColor(100, isDarkMode) }}
							/>
							<span className="text-sm text-foreground">81-100%</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
