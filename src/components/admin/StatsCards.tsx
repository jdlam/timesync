import {
	Calendar,
	CalendarCheck,
	CalendarX,
	MessageSquare,
	TrendingUp,
} from "lucide-react";

interface StatsCardsProps {
	stats: {
		totalEvents: number;
		totalResponses: number;
		activeEvents: number;
		inactiveEvents: number;
		eventsThisWeek: number;
		responsesThisWeek: number;
	};
}

export function StatsCards({ stats }: StatsCardsProps) {
	const cards = [
		{
			title: "Total Events",
			value: stats.totalEvents,
			icon: Calendar,
			description: "All events created",
			color: "text-blue-500",
		},
		{
			title: "Active Events",
			value: stats.activeEvents,
			icon: CalendarCheck,
			description: "Currently accepting responses",
			color: "text-green-500",
		},
		{
			title: "Inactive Events",
			value: stats.inactiveEvents,
			icon: CalendarX,
			description: "Deactivated or archived",
			color: "text-orange-500",
		},
		{
			title: "Total Responses",
			value: stats.totalResponses,
			icon: MessageSquare,
			description: "Availability submissions",
			color: "text-purple-500",
		},
		{
			title: "Events This Week",
			value: stats.eventsThisWeek,
			icon: TrendingUp,
			description: "Created in last 7 days",
			color: "text-cyan-500",
		},
		{
			title: "Responses This Week",
			value: stats.responsesThisWeek,
			icon: TrendingUp,
			description: "Submitted in last 7 days",
			color: "text-pink-500",
		},
	];

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			{cards.map((card) => (
				<div
					key={card.title}
					className="bg-card border border-border rounded-lg p-4 sm:p-6"
				>
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm font-medium text-muted-foreground">
							{card.title}
						</span>
						<card.icon className={`w-5 h-5 ${card.color}`} />
					</div>
					<div className="text-2xl sm:text-3xl font-bold">{card.value}</div>
					<p className="text-xs text-muted-foreground mt-1">
						{card.description}
					</p>
				</div>
			))}
		</div>
	);
}
