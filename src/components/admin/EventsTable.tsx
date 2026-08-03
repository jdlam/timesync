import { useMutation } from "convex/react";
import { format } from "date-fns";
import { Eye, Loader2, Power, PowerOff, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { type RowAction, RowActionsMenu } from "@/components/RowActionsMenu";
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

interface Event {
	_id: Id<"events">;
	title: string;
	description?: string;
	isActive: boolean;
	createdAt: number;
	responseCount: number;
	creatorEmail?: string;
}

interface EventsTableProps {
	events: Event[];
	onViewEvent: (eventId: Id<"events">) => void;
}

export function EventsTable({ events, onViewEvent }: EventsTableProps) {
	const [deleteEventId, setDeleteEventId] = useState<Id<"events"> | null>(null);
	const [actionLoading, setActionLoading] = useState<Id<"events"> | null>(null);

	const toggleStatus = useMutation(api.admin.toggleEventStatus);
	const deleteEvent = useMutation(api.admin.deleteEvent);

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

	// One action list per event, rendered identically on both breakpoints.
	const actionsFor = (event: Event): RowAction[] => [
		{
			label: "View Details",
			icon: Eye,
			onSelect: () => onViewEvent(event._id),
		},
		{
			label: event.isActive ? "Deactivate" : "Activate",
			icon: event.isActive ? PowerOff : Power,
			onSelect: () => handleToggleStatus(event._id),
			loading: actionLoading === event._id,
		},
		{
			label: "Delete",
			icon: Trash2,
			onSelect: () => setDeleteEventId(event._id),
			destructive: true,
		},
	];

	if (events.length === 0) {
		return (
			<div className="text-center py-12 text-muted-foreground">
				No events found
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

						<p className="text-sm text-muted-foreground mb-1">
							{event.responseCount} responses
						</p>
						<p className="text-xs text-muted-foreground mb-3">
							Creator: {event.creatorEmail || "Guest"}
						</p>

						<div className="flex flex-wrap gap-2">
							<Button
								variant="outline"
								size="sm"
								className="flex-1 min-h-[44px]"
								onClick={() => onViewEvent(event._id)}
							>
								<Eye className="w-4 h-4 mr-1" />
								View
							</Button>
							<RowActionsMenu
								touch
								label={`Actions for ${event.title}`}
								actions={actionsFor(event)}
							/>
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
								Creator
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
									{event.creatorEmail || (
										<span className="text-muted-foreground/60 italic">
											Guest
										</span>
									)}
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
									<RowActionsMenu
										label={`Actions for ${event.title}`}
										actions={actionsFor(event)}
									/>
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
