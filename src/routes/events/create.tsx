import { useUser } from "@clerk/clerk-react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { format } from "date-fns";
import { CalendarIcon, Crown } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { LinkCopy } from "@/components/LinkCopy";
import { TimezoneSelect } from "@/components/TimezoneSelect";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAppForm } from "@/hooks/form";
import { useSubscription } from "@/hooks/useSubscription";
import { getErrorMessage } from "@/lib/form-utils";
import { TIER_LIMITS } from "@/lib/tier-config";
import { getBrowserTimezone } from "@/lib/time-utils";
import { generateAdminToken } from "@/lib/token-utils";
import { createEventSchemaForTier } from "@/lib/validation-schemas";
import { api } from "../../../convex/_generated/api";

export const Route = createFileRoute("/events/create")({
	component: CreateEvent,
});

function CreateEvent() {
	const { user } = useUser();
	const createEventMutation = useMutation(api.events.create);
	const router = useRouter();
	const { isPremium, tier } = useSubscription();
	const [createdEvent, setCreatedEvent] = useState<{
		eventId: string;
		adminToken: string;
	} | null>(null);

	const [selectedDates, setSelectedDates] = useState<Date[]>([]);
	const [showCalendar, setShowCalendar] = useState(false);

	const tierLimits = isPremium ? TIER_LIMITS.premium : TIER_LIMITS.free;
	const eventSchema = useMemo(() => createEventSchemaForTier(tier), [tier]);

	const form = useAppForm({
		defaultValues: {
			title: "",
			description: "" as string | undefined,
			timeZone: getBrowserTimezone(),
			dates: [] as string[],
			timeRangeStart: "09:00",
			timeRangeEnd: "17:00",
			slotDuration: "30" as "15" | "30" | "60",
		},
		validators: {
			onSubmit: eventSchema as never,
		},
		onSubmit: async ({ value }) => {
			try {
				const adminToken = generateAdminToken();
				const result = await createEventMutation({
					title: value.title,
					description: value.description || undefined,
					timeZone: value.timeZone,
					dates: value.dates,
					timeRangeStart: value.timeRangeStart,
					timeRangeEnd: value.timeRangeEnd,
					slotDuration: Number.parseInt(value.slotDuration, 10),
					adminToken,
					maxRespondents: tierLimits.maxParticipants,
					creatorId: user?.id, // Clerk subject ID or undefined for guests
					creatorEmail: user?.primaryEmailAddress?.emailAddress, // Creator's email or undefined for guests
				});
				setCreatedEvent({
					eventId: result.eventId,
					adminToken: result.adminToken,
				});
				toast.success("Event created successfully!");
			} catch (error) {
				console.error("Failed to create event:", error);
				const errorMessage =
					error instanceof Error
						? error.message
						: "Failed to create event. Please try again.";
				toast.error(errorMessage);
			}
		},
	});

	// Handle calendar date selection
	const handleDateSelect = (dates: Date[] | undefined) => {
		if (!dates) return;
		setSelectedDates(dates);

		// Convert dates to YYYY-MM-DD strings and sort
		const dateStrings = dates.map((d) => format(d, "yyyy-MM-dd")).sort();

		form.setFieldValue("dates", dateStrings);
	};

	// Generate URLs for success dialog
	const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
	const publicUrl = createdEvent
		? `${baseUrl}/events/${createdEvent.eventId}`
		: "";
	const adminUrl = createdEvent
		? `${baseUrl}/events/${createdEvent.eventId}/admin/${createdEvent.adminToken}`
		: "";

	return (
		<div className="min-h-screen bg-background py-12 px-4">
			<div className="max-w-3xl mx-auto">
				<div className="mb-8">
					<h1 className="text-4xl font-bold text-foreground mb-2">
						Create Event
					</h1>
					<p className="text-muted-foreground">
						Set up your availability poll - no signup required
					</p>
				</div>

				{/* Tier Badge */}
				{isPremium ? (
					<div className="mb-6 p-4 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-500/30 rounded-xl flex items-center gap-3">
						<Crown className="w-5 h-5 text-teal-400" />
						<div>
							<p className="text-teal-400 font-medium">Premium Event</p>
							<p className="text-sm text-muted-foreground">
								Up to {tierLimits.maxDates} dates, unlimited participants
							</p>
						</div>
					</div>
				) : (
					<div className="mb-6 p-4 bg-muted/50 border border-border rounded-xl">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-foreground font-medium">Free Tier</p>
								<p className="text-sm text-muted-foreground">
									Up to {tierLimits.maxDates} dates,{" "}
									{tierLimits.maxParticipants} participants
								</p>
							</div>
							<Link to="/pricing" search={{ success: false, canceled: false }}>
								<Button variant="outline" size="sm" className="gap-1">
									<Crown className="w-4 h-4" />
									Upgrade
								</Button>
							</Link>
						</div>
					</div>
				)}

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-6 bg-card border border-border rounded-xl p-6 shadow-lg"
				>
					{/* Title Field */}
					<form.AppField name="title">
						{(field) => (
							<div className="space-y-2">
								<field.TextField
									label="Event Title"
									placeholder="Team Meeting"
								/>
							</div>
						)}
					</form.AppField>

					{/* Description Field */}
					<form.AppField name="description">
						{(field) => (
							<div className="space-y-2">
								<field.TextArea
									label="Description (Optional)"
									placeholder="What's this event about?"
									rows={3}
								/>
							</div>
						)}
					</form.AppField>

					{/* Timezone Field */}
					<form.AppField name="timeZone">
						{(field) => (
							<div className="space-y-2">
								<Label
									htmlFor="timezone"
									className="text-xl font-bold text-foreground"
								>
									Timezone
								</Label>
								<TimezoneSelect
									value={field.state.value}
									onChange={(value) => field.handleChange(value)}
								/>
								{field.state.meta.errors.length > 0 && (
									<p className="text-red-500 text-sm mt-1">
										{getErrorMessage(field.state.meta.errors[0])}
									</p>
								)}
							</div>
						)}
					</form.AppField>

					{/* Date Selection */}
					<form.AppField name="dates">
						{(field) => (
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<Label className="text-xl font-bold text-foreground">
										Select Dates
									</Label>
									<span className="text-sm text-muted-foreground">
										{selectedDates.length}/{tierLimits.maxDates} dates
									</span>
								</div>
								<div>
									<Button
										type="button"
										variant="outline"
										onClick={() => setShowCalendar(!showCalendar)}
										className="w-full justify-start text-left font-normal"
									>
										<CalendarIcon className="mr-2 h-4 w-4" />
										{selectedDates.length > 0
											? `${selectedDates.length} date(s) selected`
											: "Pick dates"}
									</Button>
									{showCalendar && (
										<div className="mt-2 bg-card border border-border rounded-lg p-4">
											<Calendar
												mode="multiple"
												selected={selectedDates}
												onSelect={handleDateSelect}
												disabled={(date) => date < new Date()}
												className="rounded-md"
											/>
										</div>
									)}
									{selectedDates.length > 0 && (
										<div className="mt-2 flex flex-wrap gap-2">
											{[...selectedDates]
												.sort((a, b) => a.getTime() - b.getTime())
												.map((date) => (
													<div
														key={date.toISOString()}
														className="bg-teal-600/20 text-teal-600 dark:text-teal-400 px-2 py-1 rounded text-sm"
													>
														{format(date, "MMM d, yyyy")}
													</div>
												))}
										</div>
									)}
									{field.state.meta.errors.length > 0 && (
										<p className="text-red-500 text-sm mt-1">
											{getErrorMessage(field.state.meta.errors[0])}
										</p>
									)}
								</div>
							</div>
						)}
					</form.AppField>

					{/* Time Range */}
					<div className="grid grid-cols-2 gap-4">
						<form.AppField name="timeRangeStart">
							{(field) => (
								<div className="space-y-2">
									<Label
										htmlFor="start-time"
										className="text-xl font-bold text-foreground"
									>
										Start Time
									</Label>
									<Input
										id="start-time"
										type="time"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										className="bg-background border-border text-foreground"
									/>
								</div>
							)}
						</form.AppField>

						<form.AppField name="timeRangeEnd">
							{(field) => (
								<div className="space-y-2">
									<Label
										htmlFor="end-time"
										className="text-xl font-bold text-foreground"
									>
										End Time
									</Label>
									<Input
										id="end-time"
										type="time"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										className="bg-background border-border text-foreground"
									/>
									{field.state.meta.errors.length > 0 && (
										<p className="text-red-500 text-sm mt-1">
											{getErrorMessage(field.state.meta.errors[0])}
										</p>
									)}
								</div>
							)}
						</form.AppField>
					</div>

					{/* Slot Duration */}
					<form.AppField name="slotDuration">
						{(field) => (
							<div className="space-y-2">
								<Label className="text-xl font-bold text-foreground">
									Time Slot Duration
								</Label>
								<Select
									value={field.state.value}
									onValueChange={(value) =>
										field.handleChange(value as "15" | "30" | "60")
									}
								>
									<SelectTrigger className="bg-background border-border text-foreground">
										<SelectValue placeholder="Select duration" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="15">15 minutes</SelectItem>
										<SelectItem value="30">30 minutes</SelectItem>
										<SelectItem value="60">60 minutes</SelectItem>
									</SelectContent>
								</Select>
							</div>
						)}
					</form.AppField>

					{/* Submit Button */}
					<div className="flex justify-end pt-4">
						<form.AppForm>
							<form.SubscribeButton label="Create Event" />
						</form.AppForm>
					</div>
				</form>
			</div>

			{/* Success Dialog */}
			<Dialog
				open={createdEvent !== null}
				onOpenChange={() => setCreatedEvent(null)}
			>
				<DialogContent className="bg-card border-border text-card-foreground max-w-2xl">
					<DialogHeader>
						<DialogTitle className="text-2xl">
							Event Created Successfully!
						</DialogTitle>
						<DialogDescription className="text-muted-foreground">
							Share the public link with participants. Keep the admin link for
							yourself to view results.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 mt-4">
						<LinkCopy
							url={publicUrl}
							label="Public Link (Share with participants)"
						/>
						<LinkCopy url={adminUrl} label="Admin Link (Keep this private!)" />

						<div className="bg-teal-900/20 border border-teal-700 rounded-lg p-4 mt-6">
							<p className="text-sm text-teal-400">
								<strong>Important:</strong> Save your admin link! You'll need it
								to view results and manage responses.
							</p>
						</div>

						<div className="flex justify-end mt-6">
							<Button
								onClick={() => {
									setCreatedEvent(null);
									router.navigate({ to: "/" });
								}}
							>
								Done
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
