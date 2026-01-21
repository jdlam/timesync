import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
	Download,
	Link as LinkIcon,
	Loader2,
	Pencil,
	Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EditEventDialog } from "@/components/EditEventDialog";
import { EventHeader } from "@/components/EventHeader";
import { HeatmapGrid } from "@/components/heatmap/HeatmapGrid";
import { LinkCopy } from "@/components/LinkCopy";
import { NotFound } from "@/components/NotFound";
import { ResponsesList } from "@/components/ResponsesList";
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
import { exportEventToCsv } from "@/lib/csv-export";
import { TimezoneDisplayProvider } from "@/lib/timezone-display";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";

export const Route = createFileRoute("/events/$eventId/admin/$adminToken")({
	component: AdminDashboard,
});

function AdminDashboard() {
	const { eventId, adminToken } = Route.useParams();

	// All hooks must be called unconditionally at the top
	const event = useQuery(api.events.getByAdminToken, {
		eventId: eventId as Id<"events">,
		adminToken,
	});

	const responses = useQuery(api.responses.getByEventId, {
		eventId: eventId as Id<"events">,
	});

	// Loading state
	if (event === undefined || responses === undefined) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
			</div>
		);
	}

	// Error state
	if (!event) {
		return (
			<NotFound
				title="Admin Access Denied"
				message="This event doesn't exist or the admin link is invalid."
			/>
		);
	}

	return (
		<TimezoneDisplayProvider eventTimezone={event.timeZone} eventId={event._id}>
			<AdminDashboardContent
				event={event}
				responses={responses}
				adminToken={adminToken}
			/>
		</TimezoneDisplayProvider>
	);
}

function AdminDashboardContent({
	event,
	responses,
	adminToken,
}: {
	event: Doc<"events">;
	responses: Doc<"responses">[];
	adminToken: string;
}) {
	const deleteResponseMutation = useMutation(api.responses.remove);

	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [responseToDelete, setResponseToDelete] = useState<string | null>(null);
	const [selectedResponseId, setSelectedResponseId] = useState<string | null>(
		null,
	);
	const [editDialogOpen, setEditDialogOpen] = useState(false);

	// Find the highlighted response object
	const highlightedResponse = selectedResponseId
		? responses?.find((r) => r._id === selectedResponseId)
		: undefined;

	const handleDeleteClick = (responseId: string) => {
		setResponseToDelete(responseId);
		setDeleteDialogOpen(true);
	};

	const handleConfirmDelete = async () => {
		if (!responseToDelete) return;

		setDeletingId(responseToDelete);
		setDeleteDialogOpen(false);

		try {
			await deleteResponseMutation({
				responseId: responseToDelete as Id<"responses">,
			});

			// Convex will automatically update the responses query
			toast.success("Response deleted successfully");
		} catch (error) {
			console.error("Failed to delete response:", error);
			const errorMessage =
				error instanceof Error
					? error.message
					: "Failed to delete response. Please try again.";
			toast.error(errorMessage);
		} finally {
			setDeletingId(null);
			setResponseToDelete(null);
		}
	};

	// Generate URLs
	const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
	const publicUrl = `${baseUrl}/events/${event._id}`;
	const adminUrl = typeof window !== "undefined" ? window.location.href : "";

	return (
		<div className="min-h-screen bg-background py-12 px-4">
			<div className="max-w-7xl mx-auto">
				{/* Admin Badge and Edit Button */}
				<div className="mb-4 flex items-center gap-2 flex-wrap">
					<div className="bg-cyan-600/20 text-cyan-400 px-3 py-1 rounded-full text-sm font-semibold">
						Admin Dashboard
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setEditDialogOpen(true)}
						className="gap-1.5"
					>
						<Pencil className="h-3.5 w-3.5" />
						Edit Event
					</Button>
					{event.isPremium && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								try {
									exportEventToCsv(event, responses);
									toast.success("CSV exported successfully");
								} catch (error) {
									console.error("Failed to export CSV:", error);
									toast.error("Failed to export CSV. Please try again.");
								}
							}}
							className="gap-1.5"
						>
							<Download className="h-3.5 w-3.5" />
							Export CSV
						</Button>
					)}
				</div>

				<EventHeader event={event} />

				{/* Stats Section */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center gap-3">
							<Users className="w-8 h-8 text-cyan-400" />
							<div>
								<p className="text-muted-foreground text-sm">Total Responses</p>
								<p className="text-3xl font-bold text-foreground">
									{responses.length}
								</p>
							</div>
						</div>
					</div>

					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center gap-3">
							<Users className="w-8 h-8 text-muted-foreground" />
							<div>
								<p className="text-muted-foreground text-sm">Max Respondents</p>
								<p className="text-3xl font-bold text-foreground">
									{event.maxRespondents}
								</p>
							</div>
						</div>
					</div>

					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center gap-3">
							<LinkIcon className="w-8 h-8 text-green-400" />
							<div>
								<p className="text-muted-foreground text-sm">Capacity</p>
								<p className="text-3xl font-bold text-foreground">
									{Math.round((responses.length / event.maxRespondents) * 100)}%
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Link Sharing Section */}
				<div className="bg-card backdrop-blur-sm border border-border rounded-xl p-6 mb-6">
					<h2 className="text-2xl font-bold text-foreground mb-4">
						Share Links
					</h2>
					<div className="space-y-4">
						<LinkCopy
							url={publicUrl}
							label="Public Link (Share with participants)"
						/>
						<LinkCopy url={adminUrl} label="Admin Link (Keep this private!)" />
					</div>
				</div>

				{/* Heatmap Section */}
				<div className="bg-card backdrop-blur-sm border border-border rounded-xl p-6 mb-6">
					<HeatmapGrid
						event={event}
						responses={responses}
						highlightedResponse={highlightedResponse}
						onClearHighlight={() => setSelectedResponseId(null)}
						onSelectResponse={(id) => setSelectedResponseId(id)}
					/>
				</div>

				{/* Responses List */}
				<div className="bg-card backdrop-blur-sm border border-border rounded-xl p-6">
					<ResponsesList
						responses={responses}
						onDeleteResponse={handleDeleteClick}
						isDeletingId={deletingId}
						selectedResponseId={selectedResponseId}
						onSelectResponse={(id) =>
							setSelectedResponseId((prev) => (prev === id ? null : id))
						}
					/>
				</div>
			</div>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent className="bg-card border-border text-card-foreground">
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Response</AlertDialogTitle>
						<AlertDialogDescription className="text-muted-foreground">
							Are you sure you want to delete this response? This action cannot
							be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmDelete}
							className="bg-destructive text-white hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Edit Event Dialog */}
			<EditEventDialog
				event={event}
				adminToken={adminToken}
				open={editDialogOpen}
				onOpenChange={setEditDialogOpen}
			/>
		</div>
	);
}
