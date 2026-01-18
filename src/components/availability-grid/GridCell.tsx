import type { HeatmapSlotData } from "@/lib/heatmap-utils";
import { cn } from "@/lib/utils";

interface GridCellProps {
	timestamp: string;
	displayTime: string;
	isSelected: boolean;
	mode: "select" | "view";
	onInteraction: (
		timestamp: string,
		action: "start" | "enter" | "click",
		shiftKey?: boolean,
	) => void;
	heatmapData?: HeatmapSlotData;
	heatmapColor?: string;
	isDragging?: boolean;
	hasDayOffset?: boolean;
}

export function GridCell({
	timestamp,
	displayTime,
	isSelected,
	mode,
	onInteraction,
	heatmapData,
	heatmapColor,
	isDragging,
	hasDayOffset,
}: GridCellProps) {
	const handleClick = (e: React.MouseEvent) => {
		// Only handle shift+click here, regular clicks are handled by mousedown
		if (mode === "select" && e.shiftKey) {
			e.preventDefault();
			e.stopPropagation(); // Prevent container from handling this
			onInteraction(timestamp, "click", true);
		}
	};

	const handleMouseDown = (e: React.MouseEvent) => {
		if (mode === "select") {
			if (e.shiftKey) {
				// Prevent container from starting drag mode during shift+click
				e.stopPropagation();
			} else {
				// Start drag selection (also handles single click)
				onInteraction(timestamp, "start");
			}
		}
	};

	const handleMouseEnter = () => {
		if (mode === "select" && isDragging) {
			onInteraction(timestamp, "enter");
		}
	};

	const handleTouchStart = (e: React.TouchEvent) => {
		if (mode === "select") {
			e.preventDefault();
			onInteraction(timestamp, "start");
		}
	};

	// View mode (heatmap display)
	if (mode === "view" && heatmapData) {
		return (
			<div
				className={cn(
					"relative h-12 border border-border rounded flex items-center justify-center",
					"text-sm font-medium transition-all cursor-pointer",
					"hover:ring-2 hover:ring-cyan-500",
				)}
				style={{ backgroundColor: heatmapColor }}
				title={`${heatmapData.count} available (${Math.round(heatmapData.percentage)}%)`}
			>
				{heatmapData.count > 0 && (
					<span className="text-white font-bold text-lg">
						{heatmapData.count}
					</span>
				)}
			</div>
		);
	}

	// Select mode (user interaction)
	return (
		<button
			type="button"
			onClick={handleClick}
			onMouseDown={handleMouseDown}
			onMouseEnter={handleMouseEnter}
			onTouchStart={handleTouchStart}
			className={cn(
				"h-12 w-full border rounded transition-all",
				"focus:outline-none focus:ring-2 focus:ring-cyan-500",
				"hover:border-cyan-500",
				isSelected
					? "bg-cyan-600 border-cyan-500 text-white hover:bg-cyan-700"
					: "bg-muted border-border text-muted-foreground hover:bg-accent",
				"active:scale-95",
				hasDayOffset && !isSelected && "border-amber-500/50",
			)}
			aria-label={`${displayTime} - ${isSelected ? "Selected" : "Not selected"}`}
			aria-pressed={isSelected}
		>
			<span
				className={cn(
					"text-sm font-medium",
					hasDayOffset && !isSelected && "text-amber-400",
				)}
			>
				{displayTime}
			</span>
		</button>
	);
}
