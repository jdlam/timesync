import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AvailabilityGrid } from "@/components/availability-grid/AvailabilityGrid";
import { DateAvailabilityCalendar } from "@/components/availability-grid/DateAvailabilityCalendar";
import { EditResponseForm } from "@/components/EditResponseForm";
import { EventHeader } from "@/components/EventHeader";
import { LinkCopy } from "@/components/LinkCopy";
import { NotFound } from "@/components/NotFound";
import { PasswordGate } from "@/components/PasswordGate";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trackEvent } from "@/lib/analytics-events";
import {
	clearStoredResponse,
	getStoredResponse,
	type StoredResponse,
	setStoredResponse,
} from "@/lib/stored-response";
import { TimezoneDisplayProvider } from "@/lib/timezone-display";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { PublicEvent } from "../../../../convex/shared_types";

export const Route = createFileRoute("/events/$eventId/")({
	component: EventResponse,
});

function EventResponse() {
	const { eventId } = Route.useParams();
	const [password, setPassword] = useState<string | undefined>(undefined);
	const hasTrackedPasswordShownRef = useRef(false);

	// All hooks must be called unconditionally at the top
	const eventData = useQuery(api.events.getByIdWithResponseCount, {
		eventId: eventId as Id<"events">,
		password,
	});

	useEffect(() => {
		if (eventData?.passwordRequired && !hasTrackedPasswordShownRef.current) {
			hasTrackedPasswordShownRef.current = true;
			trackEvent("event_password_required_shown", { eventId });
		}
	}, [eventData?.passwordRequired, eventId]);

	// Loading state
	if (eventData === undefined) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
			</div>
		);
	}

	// Password gate
	if (eventData?.passwordRequired) {
		return (
			<PasswordGate
				eventTitle={eventData.eventTitle}
				wrongPassword={eventData.wrongPassword}
				onSubmit={(pw) => setPassword(pw)}
				isLoading={false}
			/>
		);
	}

	// Error state - eventData will throw if event not found
	if (!eventData?.event) {
		return (
			<NotFound
				title="Event Not Found"
				message="This event doesn't exist or is no longer accepting responses."
			/>
		);
	}

	const { event, responseCount } = eventData;

	return (
		<TimezoneDisplayProvider eventTimezone={event.timeZone} eventId={event._id}>
			<EventResponseContent
				event={event}
				responseCount={responseCount}
				eventPassword={password}
				isPasswordProtected={eventData.isPasswordProtected}
			/>
		</TimezoneDisplayProvider>
	);
}

function EventResponseContent({
	event,
	responseCount,
	eventPassword,
	isPasswordProtected,
}: {
	event: PublicEvent & { isPasswordProtected?: boolean };
	responseCount: number;
	eventPassword?: string;
	isPasswordProtected?: boolean;
}) {
	// If this browser already responded, edit that response rather than creating
	// a second one — a duplicate would consume another respondent slot.
	const [storedResponse, setStoredResponseState] =
		useState<StoredResponse | null>(() => getStoredResponse(event._id));
	const [submittedEditToken, setSubmittedEditToken] = useState<string | null>(
		null,
	);

	const existingResponse = useQuery(
		api.responses.getByEditToken,
		storedResponse
			? { eventId: event._id, editToken: storedResponse.editToken }
			: "skip",
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: fire once per mount only
	useEffect(() => {
		trackEvent("event_page_viewed", {
			eventId: event._id,
			isReturningRespondent: storedResponse !== null,
			eventMode: event.eventMode === "dates" ? "dates" : "times",
		});
	}, []);

	// The saved response may have been deleted by the event admin. Forget the
	// stale token so the visitor can submit again.
	useEffect(() => {
		if (storedResponse && existingResponse === null) {
			clearStoredResponse(event._id);
			setStoredResponseState(null);
		}
	}, [storedResponse, existingResponse, event._id]);

	const hasTrackedEditViewedRef = useRef(false);
	useEffect(() => {
		if (existingResponse && !hasTrackedEditViewedRef.current) {
			hasTrackedEditViewedRef.current = true;
			trackEvent("response_edit_viewed", { eventId: event._id });
		}
	}, [existingResponse, event._id]);

	const handleSubmitted = (response: StoredResponse) => {
		setStoredResponse(event._id, response);
		setStoredResponseState(response);
		setSubmittedEditToken(response.editToken);
	};

	const startNewResponse = () => {
		clearStoredResponse(event._id);
		setStoredResponseState(null);
	};

	const isLoadingExisting =
		storedResponse !== null && existingResponse === undefined;

	// Generate edit URL for the post-submit dialog
	const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
	const editUrl = submittedEditToken
		? `${baseUrl}/events/${event._id}/edit/${submittedEditToken}`
		: "";

	return (
		<div className="min-h-screen bg-background py-12 px-4">
			<div className="max-w-6xl mx-auto">
				<EventHeader
					event={event}
					responseCount={responseCount}
					isPasswordProtected={isPasswordProtected}
				/>

				{isLoadingExisting ? (
					<div className="bg-card backdrop-blur-sm border border-border rounded-xl p-6 flex items-center justify-center">
						<Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
					</div>
				) : existingResponse ? (
					<>
						<div className="mb-4 flex items-center gap-2">
							<div className="bg-teal-600/20 text-teal-400 px-3 py-1 rounded-full text-sm font-semibold">
								You've already responded
							</div>
						</div>
						<EditResponseForm
							key={existingResponse._id}
							event={event}
							response={existingResponse}
							footer={
								<Button
									type="button"
									variant="ghost"
									onClick={startNewResponse}
									className="text-muted-foreground"
								>
									Not {existingResponse.respondentName}? Submit a new response
								</Button>
							}
						/>
					</>
				) : (
					<SubmitResponseForm
						event={event}
						eventPassword={eventPassword}
						onSubmitted={handleSubmitted}
					/>
				)}
			</div>

			{/* Success Dialog */}
			<Dialog
				open={submittedEditToken !== null}
				onOpenChange={() => setSubmittedEditToken(null)}
			>
				<DialogContent className="bg-card border-border text-card-foreground max-w-2xl">
					<DialogHeader>
						<DialogTitle className="text-2xl">Thank You!</DialogTitle>
						<DialogDescription className="text-muted-foreground">
							Your availability has been submitted successfully.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 mt-4">
						<LinkCopy
							url={editUrl}
							label="Edit Link (Save this to update your response)"
						/>

						<div className="bg-teal-900/20 border border-teal-700 rounded-lg p-4">
							<p className="text-sm text-teal-400">
								<strong>Save this link!</strong> You can use it to edit your
								availability later if your schedule changes.
							</p>
						</div>

						<div className="flex justify-end mt-6">
							<Button onClick={() => setSubmittedEditToken(null)}>Done</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function SubmitResponseForm({
	event,
	eventPassword,
	onSubmitted,
}: {
	event: PublicEvent;
	eventPassword?: string;
	onSubmitted: (response: StoredResponse) => void;
}) {
	const submitResponseMutation = useMutation(api.responses.submit);

	const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
	const [name, setName] = useState("");
	const [comment, setComment] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

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

		trackEvent("response_submit_attempted", {
			eventId: event._id,
			slotCount: selectedSlots.length,
			hasComment: comment.trim().length > 0,
		});

		try {
			const result = await submitResponseMutation({
				eventId: event._id,
				respondentName: name.trim(),
				respondentComment: comment.trim() || undefined,
				selectedSlots,
				password: eventPassword,
			});

			onSubmitted({
				responseId: result.responseId,
				editToken: result.editToken,
			});
			trackEvent("response_submit_completed", {
				eventId: event._id,
				slotCount: selectedSlots.length,
			});
			toast.success("Availability submitted successfully!");
		} catch (err) {
			console.error("Failed to submit response:", err);
			const rawMessage =
				err instanceof Error ? err.message : "Failed to submit response";
			const isMaxRespondents =
				rawMessage === "Maximum number of respondents reached";
			const errorMessage = isMaxRespondents
				? "This event has reached its maximum number of respondents. Please contact the event creator to increase the limit."
				: rawMessage;
			trackEvent("response_submit_failed", {
				eventId: event._id,
				errorType: isMaxRespondents ? "max_respondents" : "other",
			});
			setError(errorMessage);
			toast.error(errorMessage);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="bg-card backdrop-blur-sm border border-border rounded-xl p-6">
			<h2 className="text-2xl font-bold text-foreground mb-4">
				Select Your Availability
			</h2>
			<p className="text-muted-foreground mb-6">
				{event.eventMode === "dates"
					? "Select the days when you're available."
					: "Click or drag to select the times when you're available."}
			</p>

			{event.eventMode === "dates" ? (
				<DateAvailabilityCalendar
					event={event}
					initialSelections={[]}
					onChange={setSelectedSlots}
				/>
			) : (
				<AvailabilityGrid
					event={event}
					initialSelections={[]}
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

				<div className="flex justify-end">
					<Button
						type="submit"
						disabled={isSubmitting || selectedSlots.length === 0}
						className="px-8"
					>
						{isSubmitting && <Loader2 className="animate-spin" />}
						{isSubmitting ? "Submitting..." : "Submit Availability"}
					</Button>
				</div>
			</form>
		</div>
	);
}
