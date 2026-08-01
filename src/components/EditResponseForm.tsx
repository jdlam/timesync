import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AvailabilityGrid } from "@/components/availability-grid/AvailabilityGrid";
import { DateAvailabilityCalendar } from "@/components/availability-grid/DateAvailabilityCalendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import type { PublicEvent } from "../../convex/shared_types";

/**
 * Editing form for an existing response. Used by the dedicated edit-link route
 * and by the event page when this browser has already responded.
 */
export function EditResponseForm({
	event,
	response,
	footer,
}: {
	event: PublicEvent;
	response: Doc<"responses">;
	footer?: React.ReactNode;
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
			setError(
				event.eventMode === "dates"
					? "Please select at least one day"
					: "Please select at least one time slot",
			);
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
		<div className="bg-card backdrop-blur-sm border border-border rounded-xl p-6">
			<h2 className="text-2xl font-bold text-foreground mb-4">
				Update Your Availability
			</h2>
			<p className="text-muted-foreground mb-6">
				Make changes to your availability and click Update to save.
			</p>

			{event.eventMode === "dates" ? (
				<DateAvailabilityCalendar
					event={event}
					initialSelections={selectedSlots}
					onChange={setSelectedSlots}
				/>
			) : (
				<AvailabilityGrid
					event={event}
					initialSelections={selectedSlots}
					onChange={setSelectedSlots}
					mode="select"
				/>
			)}

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

				<div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4">
					<div>{footer}</div>
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
	);
}
