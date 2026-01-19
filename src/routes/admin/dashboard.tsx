import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowRight, CalendarDays, Loader2, MessageSquare } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatsCards } from "@/components/admin/StatsCards";
import { Button } from "@/components/ui/button";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface EventWithCount {
	_id: Id<"events">;
	title: string;
	isActive: boolean;
	responseCount: number;
}

export const Route = createFileRoute("/admin/dashboard")({
	component: AdminDashboard,
});

function AdminDashboard() {
	const stats = useQuery(api.admin.getStats);
	const recentEvents = useQuery(api.admin.getAllEvents, { limit: 5 });

	return (
		<AdminLayout>
			<div className="space-y-8">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
					<p className="text-muted-foreground mt-1">
						Overview of all TimeSync activity
					</p>
				</div>

				{/* Stats Cards */}
				{stats ? (
					<StatsCards stats={stats} />
				) : (
					<div className="flex justify-center py-12">
						<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
					</div>
				)}

				{/* Quick Links */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-lg font-semibold flex items-center gap-2">
								<CalendarDays className="w-5 h-5 text-cyan-400" />
								Recent Events
							</h2>
							<Link to="/admin/events">
								<Button variant="ghost" size="sm">
									View all
									<ArrowRight className="w-4 h-4 ml-1" />
								</Button>
							</Link>
						</div>

						{recentEvents?.events ? (
							<div className="space-y-3">
								{recentEvents.events.length > 0 ? (
									(recentEvents.events as EventWithCount[]).map((event) => (
										<div
											key={event._id}
											className="flex items-center justify-between py-2 border-b border-border last:border-0"
										>
											<div className="min-w-0">
												<p className="font-medium truncate">{event.title}</p>
												<p className="text-xs text-muted-foreground">
													{event.responseCount} responses
												</p>
											</div>
											<span
												className={`text-xs px-2 py-1 rounded-full ${
													event.isActive
														? "bg-green-500/10 text-green-500"
														: "bg-orange-500/10 text-orange-500"
												}`}
											>
												{event.isActive ? "Active" : "Inactive"}
											</span>
										</div>
									))
								) : (
									<p className="text-muted-foreground text-sm">No events yet</p>
								)}
							</div>
						) : (
							<div className="flex justify-center py-6">
								<Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
							</div>
						)}
					</div>

					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-lg font-semibold flex items-center gap-2">
								<MessageSquare className="w-5 h-5 text-purple-400" />
								Quick Actions
							</h2>
						</div>

						<div className="space-y-3">
							<Link to="/admin/events" className="block">
								<Button variant="outline" className="w-full justify-start">
									<CalendarDays className="w-4 h-4 mr-2" />
									Manage Events
								</Button>
							</Link>
							<Link to="/admin/responses" className="block">
								<Button variant="outline" className="w-full justify-start">
									<MessageSquare className="w-4 h-4 mr-2" />
									View All Responses
								</Button>
							</Link>
							<Link to="/admin/logs" className="block">
								<Button variant="outline" className="w-full justify-start">
									<CalendarDays className="w-4 h-4 mr-2" />
									View Audit Logs
								</Button>
							</Link>
						</div>
					</div>
				</div>
			</div>
		</AdminLayout>
	);
}
