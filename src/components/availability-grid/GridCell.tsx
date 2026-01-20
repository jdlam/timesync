import { memo, useRef } from "react";
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

export const GridCell = memo(function GridCell({
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
	// Track if interaction was already handled to prevent double-firing
	const interactionHandled = useRef(false);

	const handleClick = (e: React.MouseEvent) => {
		if (mode !== "select") return;

		// Handle shift+click for range selection
		if (e.shiftKey) {
			e.preventDefault();
			e.stopPropagation();
			onInteraction(timestamp, "click", true);
			return;
		}

		// If already handled by mousedown or touchend, skip
		if (interactionHandled.current) {
			interactionHandled.current = false;
			return;
		}

		// Fallback - shouldn't normally reach here
		onInteraction(timestamp, "start");
	};

	const handleMouseDown = (e: React.MouseEvent) => {
		if (mode === "select") {
			if (e.shiftKey) {
				// Prevent container from starting drag mode during shift+click
				e.stopPropagation();
			} else {
				// Skip if already handled by touch event (prevents double-toggle on mobile)
				if (interactionHandled.current) {
					return;
				}
				// Start drag selection (also handles single click)
				interactionHandled.current = true;
				onInteraction(timestamp, "start");
			}
		}
	};

	const handleMouseEnter = () => {
		if (mode === "select" && isDragging) {
			onInteraction(timestamp, "enter");
		}
	};

	const handleTouchEnd = () => {
		if (mode === "select") {
			// Handle tap selection on mobile. We intentionally use touchend instead of
			// touchstart because quick taps often begin as scroll gestures, and firing
			// on touchstart can cause accidental selections before the browser knows
			// whether the user is scrolling or tapping. Using touchend more closely
			// matches click behavior and avoids these false positives on touch devices.
			interactionHandled.current = true;
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
			onTouchEnd={handleTouchEnd}
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
});
