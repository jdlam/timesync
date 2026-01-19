import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { EventsTable } from "@/components/admin/EventsTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export const Route = createFileRoute("/admin/events/")({
	component: AdminEvents,
});

interface EventWithCount {
	_id: Id<"events">;
	_creationTime: number;
	title: string;
	description?: string;
	isActive: boolean;
	createdAt: number;
	responseCount: number;
	creatorEmail?: string;
}

function AdminEvents() {
	const navigate = useNavigate();
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<
		"all" | "active" | "inactive"
	>("all");
	const [cursor, setCursor] = useState<string | undefined>(undefined);
	const [accumulatedEvents, setAccumulatedEvents] = useState<EventWithCount[]>(
		[],
	);

	const eventsData = useQuery(api.admin.getAllEvents, {
		limit: 20,
		cursor,
		search: search || undefined,
		statusFilter,
	});

	// Accumulate events when new data arrives
	useEffect(() => {
		if (eventsData?.events) {
			if (cursor === undefined) {
				// First page or filter changed - replace all
				setAccumulatedEvents(eventsData.events as EventWithCount[]);
			} else {
				// Subsequent pages - append new events
				setAccumulatedEvents((prev) => {
					const existingIds = new Set(prev.map((e) => e._id));
					const newEvents = (eventsData.events as EventWithCount[]).filter(
						(e) => !existingIds.has(e._id),
					);
					return [...prev, ...newEvents];
				});
			}
		}
	}, [eventsData?.events, cursor]);

	// Memoize the display events to avoid unnecessary re-renders
	const displayEvents = useMemo(() => accumulatedEvents, [accumulatedEvents]);

	const handleViewEvent = (eventId: Id<"events">) => {
		navigate({ to: "/admin/events/$eventId", params: { eventId } });
	};

	const handleLoadMore = () => {
		if (eventsData?.nextCursor) {
			setCursor(eventsData.nextCursor);
		}
	};

	return (
		<AdminLayout>
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold">Events</h1>
					<p className="text-muted-foreground mt-1">
						Manage all events across the platform
					</p>
				</div>

				{/* Filters */}
				<div className="flex flex-col sm:flex-row gap-3">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
						<Input
							type="text"
							placeholder="Search events..."
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								setCursor(undefined);
								setAccumulatedEvents([]);
							}}
							className="pl-9"
						/>
					</div>
					<Select
						value={statusFilter}
						onValueChange={(value: "all" | "active" | "inactive") => {
							setStatusFilter(value);
							setCursor(undefined);
							setAccumulatedEvents([]);
						}}
					>
						<SelectTrigger className="w-full sm:w-[150px]">
							<SelectValue placeholder="Status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Status</SelectItem>
							<SelectItem value="active">Active</SelectItem>
							<SelectItem value="inactive">Inactive</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Results Count */}
				{eventsData && (
					<p className="text-sm text-muted-foreground">
						Showing {displayEvents.length} of {eventsData.totalCount} events
					</p>
				)}

				{/* Events Table */}
				{eventsData ? (
					<>
						<EventsTable events={displayEvents} onViewEvent={handleViewEvent} />

						{eventsData.nextCursor && (
							<div className="flex justify-center pt-4">
								<Button variant="outline" onClick={handleLoadMore}>
									Load More
								</Button>
							</div>
						)}
					</>
				) : (
					<div className="flex justify-center py-12">
						<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
					</div>
				)}
			</div>
		</AdminLayout>
	);
}
