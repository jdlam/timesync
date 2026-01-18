import { Calendar, Clock, Globe, MapPin, Users } from "lucide-react";
import { useTimezoneDisplaySafe } from "@/lib/timezone-display";
import type { Doc } from "../../convex/_generated/dataModel";
import { TimezoneBanner } from "./TimezoneBanner";

interface EventHeaderProps {
	event: Doc<"events">;
	responseCount?: number;
}

export function EventHeader({ event, responseCount }: EventHeaderProps) {
	const timezoneContext = useTimezoneDisplaySafe();
	const spotsRemaining =
		responseCount !== undefined
			? event.maxRespondents - responseCount
			: undefined;

	// Determine what timezone to display
	const isLocalMode = timezoneContext?.displayMode === "local";
	const displayTimezone = timezoneContext?.displayTimezone ?? event.timeZone;

	return (
		<>
			<TimezoneBanner />
			<div className="bg-card backdrop-blur-sm border border-border rounded-xl p-6 mb-6">
				<h1 className="text-3xl font-bold text-foreground mb-2">
					{event.title}
				</h1>

				{event.description && (
					<p className="text-muted-foreground text-lg mb-4">
						{event.description}
					</p>
				)}

				<div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
					<div className="flex items-center gap-2">
						<Clock className="w-4 h-4" />
						<span>{event.slotDuration} minute slots</span>
					</div>

					<div className="flex items-center gap-2">
						<Calendar className="w-4 h-4" />
						<span>
							{event.dates.length} {event.dates.length === 1 ? "day" : "days"}
						</span>
					</div>

					<div
						className={`flex items-center gap-2 ${isLocalMode ? "text-amber-400" : ""}`}
					>
						{isLocalMode ? (
							<Globe className="w-4 h-4" />
						) : (
							<MapPin className="w-4 h-4" />
						)}
						<span>
							{displayTimezone.replace(/_/g, " ")}
							{isLocalMode && <span className="text-xs ml-1">(your time)</span>}
						</span>
					</div>

					{spotsRemaining !== undefined && (
						<div
							className={`flex items-center gap-2 ${spotsRemaining <= 2 ? "text-amber-500" : ""}`}
						>
							<Users className="w-4 h-4" />
							<span>
								{spotsRemaining > 0
									? `${spotsRemaining} spot${spotsRemaining === 1 ? "" : "s"} remaining`
									: "No spots remaining"}
							</span>
						</div>
					)}
				</div>
			</div>
		</>
	);
}
