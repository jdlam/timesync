import { Check } from "lucide-react";
import { memo, useState } from "react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { HeatmapSlotData } from "@/lib/heatmap-utils";

interface HeatmapCellProps {
	timestamp: string;
	displayTime: string;
	data: HeatmapSlotData;
	bgColor: string;
	totalRespondents: number;
	isFiltered?: boolean;
	isHighlighted?: boolean;
	highlightedName?: string;
}

export const HeatmapCell = memo(function HeatmapCell({
	displayTime,
	data,
	bgColor,
	totalRespondents,
	isFiltered,
	isHighlighted,
	highlightedName,
}: HeatmapCellProps) {
	const [isOpen, setIsOpen] = useState(false);

	// Determine the background color based on filter state
	const getCellBackground = () => {
		if (!isFiltered) {
			// Normal aggregate view
			return bgColor;
		}
		if (isHighlighted) {
			// Person selected this slot - use cyan
			return "rgb(6, 182, 212)"; // cyan-500
		}
		// Person did not select this slot - dim/gray
		return "rgb(63, 63, 70)"; // zinc-700
	};

	const cellBgColor = getCellBackground();

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					className={`h-12 w-full rounded transition-all hover:ring-2 hover:ring-cyan-500 border cursor-pointer ${
						isFiltered && !isHighlighted
							? "border-zinc-600 opacity-60"
							: "border-border"
					}`}
					style={{ backgroundColor: cellBgColor }}
					aria-label={
						isFiltered
							? `${displayTime}: ${highlightedName} ${isHighlighted ? "is" : "is not"} available`
							: `${displayTime}: ${data.count} of ${totalRespondents} available`
					}
				>
					{isFiltered
						? isHighlighted && (
								<Check className="w-6 h-6 text-white drop-shadow-md mx-auto" />
							)
						: data.count > 0 && (
								<span className="text-white font-bold text-lg drop-shadow-md">
									{data.count}
								</span>
							)}
				</button>
			</PopoverTrigger>
			<PopoverContent className="bg-card border-border text-card-foreground w-auto max-w-xs">
				<div className="space-y-2">
					{isFiltered ? (
						<>
							<div className="flex items-center gap-2">
								{isHighlighted ? (
									<>
										<Check className="w-5 h-5 text-cyan-400" />
										<p className="font-semibold text-lg text-cyan-400">
											{highlightedName} is available
										</p>
									</>
								) : (
									<p className="font-semibold text-lg text-muted-foreground">
										{highlightedName} is not available
									</p>
								)}
							</div>
							<p className="text-muted-foreground text-sm">
								{data.count} of {totalRespondents} total (
								{Math.round(data.percentage)}%)
							</p>
						</>
					) : (
						<>
							<div>
								<p className="font-semibold text-lg">
									{data.count} of {totalRespondents} available
								</p>
								<p className="text-muted-foreground text-sm">
									{Math.round(data.percentage)}% availability
								</p>
							</div>

							{data.respondents.length > 0 && (
								<div className="pt-2 border-t border-border">
									<p className="text-sm text-muted-foreground mb-1">
										Available:
									</p>
									<ul className="space-y-1">
										{data.respondents.map((name) => (
											<li key={name} className="text-sm text-cyan-400">
												• {name}
											</li>
										))}
									</ul>
								</div>
							)}

							{data.respondents.length === 0 && (
								<p className="text-sm text-muted-foreground italic">
									No one available
								</p>
							)}
						</>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
});
