import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { EditResponseForm } from "@/components/EditResponseForm";
import { EventHeader } from "@/components/EventHeader";
import { NotFound } from "@/components/NotFound";
import { TimezoneDisplayProvider } from "@/lib/timezone-display";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

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
			<div className="min-h-screen bg-background py-12 px-4">
				<div className="max-w-6xl mx-auto">
					<div className="mb-4 flex items-center gap-2">
						<div className="bg-teal-600/20 text-teal-400 px-3 py-1 rounded-full text-sm font-semibold">
							Editing Response
						</div>
					</div>

					<EventHeader event={event} />

					<EditResponseForm event={event} response={response} />
				</div>
			</div>
		</TimezoneDisplayProvider>
	);
}
