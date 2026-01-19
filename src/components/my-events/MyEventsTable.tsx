import { useMutation } from "convex/react";
import { format } from "date-fns";
import {
	ExternalLink,
	Eye,
	Loader2,
	MoreVertical,
	Power,
	PowerOff,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface Event {
	_id: Id<"events">;
	title: string;
	description?: string;
	isActive: boolean;
	createdAt: number;
	responseCount: number;
}

interface MyEventsTableProps {
	events: Event[];
	onViewEvent: (eventId: Id<"events">) => void;
}

export function MyEventsTable({ events, onViewEvent }: MyEventsTableProps) {
	const [deleteEventId, setDeleteEventId] = useState<Id<"events"> | null>(null);
	const [actionLoading, setActionLoading] = useState<Id<"events"> | null>(null);

	const toggleStatus = useMutation(api.myEvents.toggleMyEventStatus);
	const deleteEvent = useMutation(api.myEvents.deleteMyEvent);

	const handleToggleStatus = async (eventId: Id<"events">) => {
		setActionLoading(eventId);
		try {
			const result = await toggleStatus({ eventId });
			toast.success(
				`Event ${result.newStatus ? "activated" : "deactivated"} successfully`,
			);
		} catch (_error) {
			toast.error("Failed to toggle event status");
		} finally {
			setActionLoading(null);
		}
	};

	const handleDeleteEvent = async () => {
		if (!deleteEventId) return;

		setActionLoading(deleteEventId);
		try {
			await deleteEvent({ eventId: deleteEventId });
			toast.success("Event deleted successfully");
		} catch (_error) {
			toast.error("Failed to delete event");
		} finally {
			setDeleteEventId(null);
			setActionLoading(null);
		}
	};

	const handleViewPublicPage = (eventId: Id<"events">) => {
		window.open(`/events/${eventId}`, "_blank");
	};

	if (events.length === 0) {
		return (
			<div className="text-center py-12 text-muted-foreground">
				<p className="mb-4">You haven't created any events yet.</p>
				<Button asChild>
					<a href="/events/create">Create Your First Event</a>
				</Button>
			</div>
		);
	}

	return (
		<>
			{/* Mobile Card View */}
			<div className="space-y-3 sm:hidden">
				{events.map((event) => (
					<div
						key={event._id}
						className="bg-card border border-border rounded-lg p-4"
					>
						<div className="flex items-start justify-between gap-2 mb-2">
							<div className="min-w-0 flex-1">
								<h3 className="font-medium truncate">{event.title}</h3>
								<p className="text-xs text-muted-foreground">
									{format(new Date(event.createdAt), "MMM d, yyyy")}
								</p>
							</div>
							<span
								className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
									event.isActive
										? "bg-green-500/10 text-green-500"
										: "bg-orange-500/10 text-orange-500"
								}`}
							>
								{event.isActive ? "Active" : "Inactive"}
							</span>
						</div>

						<p className="text-sm text-muted-foreground mb-3">
							{event.responseCount} responses
						</p>

						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								className="flex-1"
								onClick={() => onViewEvent(event._id)}
							>
								<Eye className="w-4 h-4 mr-1" />
								View
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => handleViewPublicPage(event._id)}
							>
								<ExternalLink className="w-4 h-4" />
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => handleToggleStatus(event._id)}
								disabled={actionLoading === event._id}
							>
								{actionLoading === event._id ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : event.isActive ? (
									<PowerOff className="w-4 h-4" />
								) : (
									<Power className="w-4 h-4" />
								)}
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setDeleteEventId(event._id)}
								disabled={actionLoading === event._id}
								className="text-destructive hover:text-destructive"
							>
								<Trash2 className="w-4 h-4" />
							</Button>
						</div>
					</div>
				))}
			</div>

			{/* Desktop Table View */}
			<div className="hidden sm:block overflow-x-auto">
				<table className="w-full">
					<thead>
						<tr className="border-b border-border">
							<th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
								Title
							</th>
							<th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
								Created
							</th>
							<th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
								Responses
							</th>
							<th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
								Status
							</th>
							<th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
								Actions
							</th>
						</tr>
					</thead>
					<tbody>
						{events.map((event) => (
							<tr
								key={event._id}
								className="border-b border-border hover:bg-muted/50"
							>
								<td className="py-3 px-4">
									<div className="max-w-[200px] lg:max-w-[300px]">
										<p className="font-medium truncate">{event.title}</p>
										{event.description && (
											<p className="text-xs text-muted-foreground truncate">
												{event.description}
											</p>
										)}
									</div>
								</td>
								<td className="py-3 px-4 text-sm text-muted-foreground">
									{format(new Date(event.createdAt), "MMM d, yyyy")}
								</td>
								<td className="py-3 px-4 text-sm">{event.responseCount}</td>
								<td className="py-3 px-4">
									<span
										className={`text-xs px-2 py-1 rounded-full ${
											event.isActive
												? "bg-green-500/10 text-green-500"
												: "bg-orange-500/10 text-orange-500"
										}`}
									>
										{event.isActive ? "Active" : "Inactive"}
									</span>
								</td>
								<td className="py-3 px-4 text-right">
									<Popover>
										<PopoverTrigger asChild>
											<Button variant="ghost" size="sm">
												<MoreVertical className="w-4 h-4" />
											</Button>
										</PopoverTrigger>
										<PopoverContent align="end" className="w-48 p-1">
											<button
												type="button"
												className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded transition-colors"
												onClick={() => onViewEvent(event._id)}
											>
												<Eye className="w-4 h-4" />
												View Details
											</button>
											<button
												type="button"
												className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded transition-colors"
												onClick={() => handleViewPublicPage(event._id)}
											>
												<ExternalLink className="w-4 h-4" />
												View Public Page
											</button>
											<button
												type="button"
												className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded transition-colors"
												onClick={() => handleToggleStatus(event._id)}
												disabled={actionLoading === event._id}
											>
												{actionLoading === event._id ? (
													<Loader2 className="w-4 h-4 animate-spin" />
												) : event.isActive ? (
													<>
														<PowerOff className="w-4 h-4" />
														Deactivate
													</>
												) : (
													<>
														<Power className="w-4 h-4" />
														Activate
													</>
												)}
											</button>
											<button
												type="button"
												className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded transition-colors text-destructive"
												onClick={() => setDeleteEventId(event._id)}
											>
												<Trash2 className="w-4 h-4" />
												Delete
											</button>
										</PopoverContent>
									</Popover>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Delete Confirmation Dialog */}
			<AlertDialog
				open={deleteEventId !== null}
				onOpenChange={(open) => !open && setDeleteEventId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Event</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this event? This will also delete
							all associated responses. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteEvent}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{actionLoading === deleteEventId ? (
								<Loader2 className="w-4 h-4 animate-spin mr-2" />
							) : null}
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
