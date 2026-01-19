import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import {
	ArrowLeft,
	Calendar,
	Clock,
	ExternalLink,
	Loader2,
	MessageSquare,
	Power,
	PowerOff,
	Trash2,
	Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { MyEventsLayout } from "@/components/my-events/MyEventsLayout";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface ResponseItem {
	_id: Id<"responses">;
	respondentName: string;
	selectedSlots: string[];
	createdAt: number;
}

export const Route = createFileRoute("/my-events/$eventId")({
	component: MyEventDetail,
});

function MyEventDetail() {
	const { eventId } = Route.useParams();
	const navigate = useNavigate();
	const eventData = useQuery(api.myEvents.getMyEventById, {
		eventId: eventId as Id<"events">,
	});
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const toggleStatus = useMutation(api.myEvents.toggleMyEventStatus);
	const deleteEvent = useMutation(api.myEvents.deleteMyEvent);

	const handleToggleStatus = async () => {
		if (!eventData) return;
		setIsLoading(true);
		try {
			const result = await toggleStatus({
				eventId: eventId as Id<"events">,
			});
			toast.success(
				`Event ${result.newStatus ? "activated" : "deactivated"} successfully`,
			);
		} catch (_error) {
			toast.error("Failed to toggle event status");
		} finally {
			setIsLoading(false);
		}
	};

	const handleDeleteEvent = async () => {
		setIsLoading(true);
		try {
			await deleteEvent({ eventId: eventId as Id<"events"> });
			toast.success("Event deleted successfully");
			navigate({ to: "/my-events" });
		} catch (_error) {
			toast.error("Failed to delete event");
		} finally {
			setIsLoading(false);
			setShowDeleteDialog(false);
		}
	};

	if (eventData === undefined) {
		return (
			<MyEventsLayout>
				<div className="flex justify-center py-12">
					<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
				</div>
			</MyEventsLayout>
		);
	}

	if (eventData === null) {
		return (
			<MyEventsLayout>
				<div className="text-center py-12">
					<p className="text-muted-foreground mb-4">
						Event not found or you don't have permission to view it.
					</p>
					<Link to="/my-events">
						<Button>Back to My Events</Button>
					</Link>
				</div>
			</MyEventsLayout>
		);
	}

	const { event, responses } = eventData;

	return (
		<MyEventsLayout>
			<div className="space-y-6">
				{/* Back Button & Header */}
				<div className="flex flex-col sm:flex-row sm:items-center gap-4">
					<Link to="/my-events">
						<Button variant="ghost" size="sm">
							<ArrowLeft className="w-4 h-4 mr-2" />
							Back to My Events
						</Button>
					</Link>

					<div className="flex-1">
						<h1 className="text-2xl sm:text-3xl font-bold">{event.title}</h1>
						{event.description && (
							<p className="text-muted-foreground mt-1">{event.description}</p>
						)}
					</div>

					<div className="flex gap-2">
						<Button
							variant="outline"
							onClick={handleToggleStatus}
							disabled={isLoading}
						>
							{isLoading ? (
								<Loader2 className="w-4 h-4 animate-spin mr-2" />
							) : event.isActive ? (
								<PowerOff className="w-4 h-4 mr-2" />
							) : (
								<Power className="w-4 h-4 mr-2" />
							)}
							{event.isActive ? "Deactivate" : "Activate"}
						</Button>
						<Button
							variant="destructive"
							onClick={() => setShowDeleteDialog(true)}
							disabled={isLoading}
						>
							<Trash2 className="w-4 h-4 mr-2" />
							Delete
						</Button>
					</div>
				</div>

				{/* Event Details */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="bg-card border border-border rounded-lg p-4 sm:p-6 space-y-4">
						<h2 className="font-semibold text-lg">Event Details</h2>

						<div className="space-y-3">
							<div className="flex items-center gap-3">
								<Calendar className="w-4 h-4 text-muted-foreground" />
								<div>
									<p className="text-sm text-muted-foreground">Dates</p>
									<p className="font-medium">
										{event.dates.length} date(s) selected
									</p>
								</div>
							</div>

							<div className="flex items-center gap-3">
								<Clock className="w-4 h-4 text-muted-foreground" />
								<div>
									<p className="text-sm text-muted-foreground">Time Range</p>
									<p className="font-medium">
										{event.timeRangeStart} - {event.timeRangeEnd}
									</p>
								</div>
							</div>

							<div className="flex items-center gap-3">
								<Users className="w-4 h-4 text-muted-foreground" />
								<div>
									<p className="text-sm text-muted-foreground">
										Max Respondents
									</p>
									<p className="font-medium">
										{event.maxRespondents === -1
											? "Unlimited"
											: event.maxRespondents}
									</p>
								</div>
							</div>

							<div className="flex items-center gap-3">
								<MessageSquare className="w-4 h-4 text-muted-foreground" />
								<div>
									<p className="text-sm text-muted-foreground">Slot Duration</p>
									<p className="font-medium">{event.slotDuration} minutes</p>
								</div>
							</div>
						</div>

						<div className="pt-4 border-t border-border">
							<p className="text-xs text-muted-foreground">
								Created: {format(new Date(event.createdAt), "PPpp")}
							</p>
							<p className="text-xs text-muted-foreground">
								Updated: {format(new Date(event.updatedAt), "PPpp")}
							</p>
						</div>

						<div className="pt-4">
							<a
								href={`/events/${event._id}`}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center text-sm text-primary hover:underline"
							>
								View Public Page
								<ExternalLink className="w-3 h-3 ml-1" />
							</a>
						</div>
					</div>

					<div className="bg-card border border-border rounded-lg p-4 sm:p-6">
						<div className="flex items-center justify-between mb-4">
							<h2 className="font-semibold text-lg">
								Responses ({responses.length})
							</h2>
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

						{responses.length > 0 ? (
							<div className="space-y-3 max-h-[400px] overflow-y-auto">
								{(responses as ResponseItem[]).map((response) => (
									<div
										key={response._id}
										className="flex items-center justify-between py-2 border-b border-border last:border-0"
									>
										<div>
											<p className="font-medium">{response.respondentName}</p>
											<p className="text-xs text-muted-foreground">
												{response.selectedSlots.length} slots selected
											</p>
											<p className="text-xs text-muted-foreground">
												{format(new Date(response.createdAt), "MMM d, yyyy")}
											</p>
										</div>
									</div>
								))}
							</div>
						) : (
							<p className="text-muted-foreground text-sm">No responses yet</p>
						)}
					</div>
				</div>
			</div>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Event</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete "{event.title}"? This will also
							delete all {responses.length} associated responses. This action
							cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteEvent}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isLoading ? (
								<Loader2 className="w-4 h-4 animate-spin mr-2" />
							) : null}
							Delete Event
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</MyEventsLayout>
	);
}
