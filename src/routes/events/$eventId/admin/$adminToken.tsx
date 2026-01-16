import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import { Link as LinkIcon, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { db, events, responses } from "@/db";

export const Route = createFileRoute("/events/$eventId/admin/$adminToken")({
	component: AdminDashboard,
	loader: async ({ params }) => {
		try {
			const event = await getEventByAdminToken({
				data: {
					eventId: params.eventId,
					adminToken: params.adminToken,
				},
			});

			const allResponses = await getEventResponses({
				data: params.eventId,
			});

			return { event, responses: allResponses, error: null };
		} catch (error) {
			return {
				event: null,
				responses: [],
				error:
					error instanceof Error
						? error.message
						: "Event not found or invalid admin token",
			};
		}
	},
});

// Server function to get event by admin token
const getEventByAdminToken = createServerFn({ method: "POST" })
	.inputValidator((data: { eventId: string; adminToken: string }) => data)
	.handler(async ({ data }) => {
		const [event] = await db
			.select()
			.from(events)
			.where(
				and(
					eq(events.id, data.eventId),
					eq(events.adminToken, data.adminToken),
				),
			)
			.limit(1);

		if (!event) {
			throw new Error("Event not found or invalid admin token");
		}

		return event;
	});

// Server function to get all responses for an event
const getEventResponses = createServerFn({ method: "GET" })
	.inputValidator((data: string) => data)
	.handler(async ({ data: eventId }) => {
		return await db
			.select()
			.from(responses)
			.where(eq(responses.eventId, eventId))
			.orderBy(desc(responses.createdAt));
	});

// Server function to delete a response
const deleteResponse = createServerFn({ method: "POST" })
	.inputValidator((data: string) => data)
	.handler(async ({ data: responseId }) => {
		await db.delete(responses).where(eq(responses.id, responseId));
		return { success: true };
	});

function AdminDashboard() {
	const {
		event,
		responses: initialResponses,
		error: loaderError,
	} = Route.useLoaderData();

	if (loaderError || !event) {
		return (
			<NotFound
				title="Admin Access Denied"
				message={
					loaderError ||
					"This event doesn't exist or the admin link is invalid."
				}
			/>
		);
	}

	const router = useRouter();
	const [responses, setResponses] = useState(initialResponses);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [responseToDelete, setResponseToDelete] = useState<string | null>(null);

	const handleDeleteClick = (responseId: string) => {
		setResponseToDelete(responseId);
		setDeleteDialogOpen(true);
	};

	const handleConfirmDelete = async () => {
		if (!responseToDelete) return;

		setDeletingId(responseToDelete);
		setDeleteDialogOpen(false);

		try {
			await deleteResponse({ data: responseToDelete });

			// Remove from local state
			setResponses((prev) => prev.filter((r) => r.id !== responseToDelete));

			// Optionally invalidate router to refetch
			router.invalidate();

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
	const publicUrl = `${baseUrl}/events/${event.id}`;
	const adminUrl = typeof window !== "undefined" ? window.location.href : "";

	return (
		<div className="min-h-screen bg-background py-12 px-4">
			<div className="max-w-7xl mx-auto">
				{/* Admin Badge */}
				<div className="mb-4 flex items-center gap-2">
					<div className="bg-cyan-600/20 text-cyan-400 px-3 py-1 rounded-full text-sm font-semibold">
						Admin Dashboard
					</div>
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
					<HeatmapGrid event={event} responses={responses} />
				</div>

				{/* Responses List */}
				<div className="bg-card backdrop-blur-sm border border-border rounded-xl p-6">
					<ResponsesList
						responses={responses}
						onDeleteResponse={handleDeleteClick}
						isDeletingId={deletingId}
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
		</div>
	);
}
