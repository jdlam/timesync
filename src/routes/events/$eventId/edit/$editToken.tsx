import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AvailabilityGrid } from "@/components/availability-grid/AvailabilityGrid";
import { EventHeader } from "@/components/EventHeader";
import { NotFound } from "@/components/NotFound";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TimezoneDisplayProvider } from "@/lib/timezone-display";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import type { PublicEvent } from "../../../../../convex/shared_types";

export const Route = createFileRoute("/events/$eventId/edit/$editToken")({
	component: EditResponseWrapper,
});

function EditResponseWrapper() {
	const { eventId, editToken } = Route.useParams();

	// Fetch event (pass editToken to bypass password gate)
	const event = useQuery(api.events.getById, {
		eventId: eventId as Id<"events">,
		editToken,
	});

	// Fetch response by edit token
	const response = useQuery(api.responses.getByEditToken, {
		eventId: eventId as Id<"events">,
		editToken,
	});

	// Loading state
	if (event === undefined || response === undefined) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
			</div>
		);
	}

	// Error state
	if (!event || !response) {
		return (
			<NotFound
				title="Response Not Found"
				message="This response doesn't exist or the edit link is invalid."
			/>
		);
	}

	return (
		<TimezoneDisplayProvider eventTimezone={event.timeZone} eventId={event._id}>
			<EditResponseForm event={event} response={response} />
		</TimezoneDisplayProvider>
	);
}

function EditResponseForm({
	event,
	response,
}: {
	event: PublicEvent;
	response: Doc<"responses">;
}) {
	const updateResponseMutation = useMutation(api.responses.update);

	const [selectedSlots, setSelectedSlots] = useState<string[]>(
		response.selectedSlots,
	);
	const [name, setName] = useState(response.respondentName);
	const [comment, setComment] = useState(response.respondentComment || "");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setSuccess(false);

		// Validate
		if (!name.trim()) {
			setError("Please enter your name");
			return;
		}

		if (selectedSlots.length === 0) {
			setError("Please select at least one time slot");
			return;
		}

		setIsSubmitting(true);

		try {
			await updateResponseMutation({
				responseId: response._id,
				editToken: response.editToken,
				respondentName: name.trim(),
				respondentComment: comment.trim() || undefined,
				selectedSlots,
			});

			setSuccess(true);
			toast.success("Response updated successfully!");

			// Hide success message after 3 seconds
			setTimeout(() => setSuccess(false), 3000);
		} catch (err) {
			console.error("Failed to update response:", err);
			const errorMessage =
				err instanceof Error ? err.message : "Failed to update response";
			setError(errorMessage);
			toast.error(errorMessage);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen bg-background py-12 px-4">
			<div className="max-w-6xl mx-auto">
				<div className="mb-4 flex items-center gap-2">
					<div className="bg-teal-600/20 text-teal-400 px-3 py-1 rounded-full text-sm font-semibold">
						Editing Response
					</div>
				</div>

				<EventHeader event={event} />

				<div className="bg-card backdrop-blur-sm border border-border rounded-xl p-6">
					<h2 className="text-2xl font-bold text-foreground mb-4">
						Update Your Availability
					</h2>
					<p className="text-muted-foreground mb-6">
						Make changes to your availability and click Update to save.
					</p>

					<AvailabilityGrid
						event={event}
						initialSelections={selectedSlots}
						onChange={setSelectedSlots}
						mode="select"
					/>

					<form onSubmit={handleSubmit} className="mt-8 space-y-6">
						<div className="space-y-2">
							<Label htmlFor="name" className="text-foreground">
								Your Name <span className="text-red-500">*</span>
							</Label>
							<Input
								id="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Enter your name"
								className="bg-background border-border text-foreground"
								required
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="comment" className="text-foreground">
								Comment (Optional)
							</Label>
							<Textarea
								id="comment"
								value={comment}
								onChange={(e) => setComment(e.target.value)}
								placeholder="Any additional notes..."
								rows={3}
								className="bg-background border-border text-foreground"
							/>
						</div>

						{error && (
							<div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
								<p className="text-red-400">{error}</p>
							</div>
						)}

						{success && (
							<div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
								<p className="text-green-400">
									Your response has been updated successfully!
								</p>
							</div>
						)}

						<div className="flex justify-end">
							<Button
								type="submit"
								disabled={isSubmitting || selectedSlots.length === 0}
								className="px-8"
							>
								{isSubmitting && <Loader2 className="animate-spin" />}
								{isSubmitting ? "Updating..." : "Update Response"}
							</Button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
