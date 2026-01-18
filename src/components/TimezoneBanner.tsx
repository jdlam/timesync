import { AlertTriangle, Globe } from "lucide-react";
import {
	formatTimezoneOffset,
	getTimezoneOffsetDifference,
} from "@/lib/time-utils";
import { useTimezoneDisplaySafe } from "@/lib/timezone-display";
import { cn } from "@/lib/utils";

export function TimezoneBanner() {
	const context = useTimezoneDisplaySafe();

	// Don't render if not in a provider or if timezones match
	if (!context || context.timezonesMatch) {
		return null;
	}

	const { displayMode, setDisplayMode, eventTimezone, localTimezone } = context;

	const offsetDiff = getTimezoneOffsetDifference(eventTimezone, localTimezone);
	const offsetString = formatTimezoneOffset(offsetDiff);

	return (
		<div className="bg-amber-900/20 border border-amber-700 rounded-xl p-4 mb-6">
			<div className="flex flex-col sm:flex-row sm:items-center gap-4">
				<div className="flex items-start gap-3 flex-1">
					<AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
					<div className="text-sm">
						<p className="font-semibold text-amber-400 mb-1">
							Different Timezone Detected
						</p>
						<p className="text-amber-300/80">
							This event was created in{" "}
							<span className="font-medium text-amber-200">
								{eventTimezone.replace(/_/g, " ")}
							</span>
							.
						</p>
						<p className="text-amber-300/80">
							Your local timezone is{" "}
							<span className="font-medium text-amber-200">
								{localTimezone.replace(/_/g, " ")}
							</span>{" "}
							<span className="text-amber-400">({offsetString})</span>.
						</p>
						{displayMode === "local" && (
							<p className="text-amber-400/70 text-xs mt-2">
								<Globe className="w-3 h-3 inline mr-1" />
								Times may show day offsets when they cross midnight.
							</p>
						)}
					</div>
				</div>

				{/* Toggle Switch */}
				<div className="flex items-center gap-2 self-end sm:self-center">
					<button
						type="button"
						onClick={() => setDisplayMode("event")}
						className={cn(
							"px-3 py-1.5 text-sm font-medium rounded-l-lg border transition-colors",
							displayMode === "event"
								? "bg-amber-600 text-white border-amber-600"
								: "bg-transparent text-amber-300 border-amber-600 hover:bg-amber-800/30",
						)}
					>
						Event
					</button>
					<button
						type="button"
						onClick={() => setDisplayMode("local")}
						className={cn(
							"px-3 py-1.5 text-sm font-medium rounded-r-lg border transition-colors",
							displayMode === "local"
								? "bg-amber-600 text-white border-amber-600"
								: "bg-transparent text-amber-300 border-amber-600 hover:bg-amber-800/30",
						)}
					>
						Local
					</button>
				</div>
			</div>
		</div>
	);
}
