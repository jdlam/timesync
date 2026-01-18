import {
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	TrendingUp,
	User,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
import type { Doc } from "../../../convex/_generated/dataModel";
import { HeatmapCell } from "./HeatmapCell";

interface HeatmapGridProps {
	event: Doc<"events">;
	responses: Doc<"responses">[];
	highlightedResponse?: Doc<"responses">;
	onClearHighlight?: () => void;
	onSelectResponse?: (responseId: string | null) => void;
}

export function HeatmapGrid({
	event,
	responses,
	highlightedResponse,
	onClearHighlight,
	onSelectResponse,
}: HeatmapGridProps) {
	const [expandedDates, setExpandedDates] = useState<Set<string>>(
		new Set(event.dates),
	);
	const [mobileViewMode, setMobileViewMode] = useState<"all" | "single">("all");
	const [currentDayIndex, setCurrentDayIndex] = useState(0);
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
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-xl font-bold text-foreground">
						Availability Heatmap
					</h3>
					{/* Desktop: Show highlighted response badge */}
					{highlightedResponse && (
						<div className="hidden md:flex items-center gap-2">
							<div className="flex items-center gap-2 bg-cyan-500/20 text-cyan-400 px-3 py-1.5 rounded-full text-sm">
								<User className="w-4 h-4" />
								<span>Viewing: {highlightedResponse.respondentName}</span>
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={onClearHighlight}
								className="text-muted-foreground hover:text-foreground"
							>
								<X className="w-4 h-4 mr-1" />
								Show All
							</Button>
						</div>
					)}
				</div>

				{/* Mobile: Response selector dropdown */}
				{responses.length > 0 && onSelectResponse && (
					<div className="md:hidden mb-4">
						<label className="text-sm text-muted-foreground mb-2 block">
							View individual response:
						</label>
						<Select
							value={highlightedResponse?._id ?? "all"}
							onValueChange={(value) =>
								onSelectResponse(value === "all" ? null : value)
							}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Select a response to highlight" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Show all responses</SelectItem>
								{responses.map((response) => (
									<SelectItem key={response._id} value={response._id}>
										{response.respondentName} ({response.selectedSlots.length}{" "}
										slots)
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}

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

											const isHighlighted = highlightedResponse
												? highlightedResponse.selectedSlots.includes(slot)
												: undefined;

											return (
												<td key={date} className="border border-border p-2">
													<HeatmapCell
														timestamp={slot}
														displayTime={timeLabel}
														data={data}
														bgColor={bgColor}
														totalRespondents={responses.length}
														isFiltered={!!highlightedResponse}
														isHighlighted={isHighlighted}
														highlightedName={
															highlightedResponse?.respondentName
														}
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

				{/* Mobile View */}
				<div className="md:hidden space-y-4">
					{/* View Mode Toggle */}
					<div className="flex items-center gap-2">
						<span className="text-sm text-muted-foreground">View:</span>
						<div className="flex rounded-lg border border-border overflow-hidden">
							<button
								type="button"
								onClick={() => setMobileViewMode("single")}
								className={`px-3 py-1.5 text-sm font-medium transition-colors ${
									mobileViewMode === "single"
										? "bg-primary text-primary-foreground"
										: "bg-card text-muted-foreground hover:text-foreground"
								}`}
							>
								One Day
							</button>
							<button
								type="button"
								onClick={() => setMobileViewMode("all")}
								className={`px-3 py-1.5 text-sm font-medium transition-colors ${
									mobileViewMode === "all"
										? "bg-primary text-primary-foreground"
										: "bg-card text-muted-foreground hover:text-foreground"
								}`}
							>
								All Days
							</button>
						</div>
					</div>

					{/* Single Day View */}
					{mobileViewMode === "single" && (
						<div className="space-y-4">
							{/* Day Navigation */}
							<div className="flex items-center justify-between bg-card border border-border rounded-lg p-3">
								<Button
									variant="ghost"
									size="sm"
									onClick={() =>
										setCurrentDayIndex((prev) => Math.max(0, prev - 1))
									}
									disabled={currentDayIndex === 0}
								>
									<ChevronLeft className="w-5 h-5" />
								</Button>
								<div className="text-center">
									<div className="text-foreground font-semibold">
										{getDateColumnLabel(event.dates[currentDayIndex])}
									</div>
									<div className="text-muted-foreground text-sm">
										{formatDateDisplay(event.dates[currentDayIndex])}
									</div>
									<div className="text-muted-foreground text-xs mt-1">
										{currentDayIndex + 1} of {event.dates.length}
									</div>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={() =>
										setCurrentDayIndex((prev) =>
											Math.min(event.dates.length - 1, prev + 1),
										)
									}
									disabled={currentDayIndex === event.dates.length - 1}
								>
									<ChevronRight className="w-5 h-5" />
								</Button>
							</div>

							{/* Time Slots for Current Day */}
							<div className="bg-card border border-border rounded-lg p-4 space-y-2">
								{(() => {
									const currentDate = event.dates[currentDayIndex];
									const slots = slotsByDate.get(currentDate) || [];
									return slots.map((slot) => {
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
										const isHighlighted = highlightedResponse
											? highlightedResponse.selectedSlots.includes(slot)
											: undefined;

										return (
											<div key={slot} className="flex items-center gap-3">
												<span className="text-muted-foreground text-sm font-medium w-20 shrink-0">
													{timeLabel}
												</span>
												<div className="flex-1">
													<HeatmapCell
														timestamp={slot}
														displayTime={timeLabel}
														data={data}
														bgColor={bgColor}
														totalRespondents={responses.length}
														isFiltered={!!highlightedResponse}
														isHighlighted={isHighlighted}
														highlightedName={
															highlightedResponse?.respondentName
														}
													/>
												</div>
											</div>
										);
									});
								})()}
							</div>
						</div>
					)}

					{/* All Days Accordion View */}
					{mobileViewMode === "all" &&
						Array.from(slotsByDate.entries()).map(([date, slots]) => {
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

												const isHighlighted = highlightedResponse
													? highlightedResponse.selectedSlots.includes(slot)
													: undefined;

												return (
													<div key={slot} className="flex items-center gap-3">
														<span className="text-muted-foreground text-sm font-medium w-20 shrink-0">
															{timeLabel}
														</span>
														<div className="flex-1">
															<HeatmapCell
																timestamp={slot}
																displayTime={timeLabel}
																data={data}
																bgColor={bgColor}
																totalRespondents={responses.length}
																isFiltered={!!highlightedResponse}
																isHighlighted={isHighlighted}
																highlightedName={
																	highlightedResponse?.respondentName
																}
															/>
														</div>
													</div>
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
