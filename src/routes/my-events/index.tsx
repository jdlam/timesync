import { SignInButton, useUser } from "@clerk/clerk-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { CalendarDays, Loader2, LogIn, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { MyEventsLayout } from "@/components/my-events/MyEventsLayout";
import { MyEventsTable } from "@/components/my-events/MyEventsTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export const Route = createFileRoute("/my-events/")({
	component: MyEventsIndex,
});

interface EventWithCount {
	_id: Id<"events">;
	_creationTime: number;
	title: string;
	description?: string;
	isActive: boolean;
	createdAt: number;
	responseCount: number;
}

function MyEventsIndex() {
	const { isLoaded, isSignedIn } = useUser();
	const navigate = useNavigate();
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<
		"all" | "active" | "inactive"
	>("all");
	const [cursor, setCursor] = useState<string | undefined>(undefined);
	const [accumulatedEvents, setAccumulatedEvents] = useState<EventWithCount[]>(
		[],
	);

	const eventsData = useQuery(
		api.myEvents.getMyEvents,
		isSignedIn
			? {
					limit: 20,
					cursor,
					search: search || undefined,
					statusFilter,
				}
			: "skip",
	);

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

	const handleViewEvent = (eventId: Id<"events">) => {
		navigate({ to: "/my-events/$eventId", params: { eventId } });
	};

	const handleLoadMore = () => {
		if (eventsData?.nextCursor) {
			setCursor(eventsData.nextCursor);
		}
	};

	// Show loading while auth is loading
	if (!isLoaded) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	// Show sign-in prompt for unauthenticated users
	if (!isSignedIn) {
		return (
			<div className="min-h-screen flex items-center justify-center px-4">
				<div className="text-center max-w-md">
					<div className="mb-6">
						<CalendarDays className="w-16 h-16 mx-auto text-cyan-400" />
					</div>
					<h1 className="text-3xl font-bold mb-4">My Events</h1>
					<p className="text-muted-foreground mb-8">
						Sign in to view and manage events you've created. You can track
						responses, toggle event status, and delete events.
					</p>
					<SignInButton mode="modal">
						<Button size="lg">
							<LogIn className="mr-2" size={20} />
							Sign In
						</Button>
					</SignInButton>
				</div>
			</div>
		);
	}

	return (
		<MyEventsLayout>
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold">My Events</h1>
					<p className="text-muted-foreground mt-1">
						View and manage events you've created
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
						Showing {accumulatedEvents.length} of {eventsData.totalCount} events
					</p>
				)}

				{/* Events Table */}
				{eventsData ? (
					<>
						<MyEventsTable
							events={accumulatedEvents}
							onViewEvent={handleViewEvent}
						/>

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
		</MyEventsLayout>
	);
}
