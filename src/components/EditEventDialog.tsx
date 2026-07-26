import { useMutation, useQuery } from "convex/react";
import { eachDayOfInterval, format, parse } from "date-fns";
import {
	AlertTriangle,
	Bell,
	CalendarIcon,
	Clock,
	Globe,
	Lock,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAppForm } from "@/hooks/form";
import { getErrorMessage } from "@/lib/form-utils";
import { TIER_LIMITS } from "@/lib/tier-config";
import { editEventSchemaForTier } from "@/lib/validation-schemas";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Checkbox } from "./ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface EditEventDialogProps {
	event: Doc<"events">;
	adminToken: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function EditEventDialog({
	event,
	adminToken,
	open,
	onOpenChange,
}: EditEventDialogProps) {
	const updateEventMutation = useMutation(api.events.update);

	const isDatesMode = event.eventMode === "dates";
	const maxDates = TIER_LIMITS[event.isPremium ? "premium" : "free"].maxDates;
	const [rangeFrom, setRangeFrom] = useState("");
	const [rangeTo, setRangeTo] = useState("");

	// Get response count for warning (only when dialog is open)
	const responseCountData = useQuery(
		api.events.getResponseCount,
		open
			? {
					eventId: event._id as Id<"events">,
					adminToken,
				}
			: "skip",
	);
	const responseCount = responseCountData?.count ?? 0;

	// Initialize selected dates from event
	const [selectedDates, setSelectedDates] = useState<Date[]>(() =>
		event.dates.map((d) => parse(d, "yyyy-MM-dd", new Date())),
	);
	const [showCalendar, setShowCalendar] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showPasswordInput, setShowPasswordInput] = useState(false);

	const editSchema = editEventSchemaForTier(
		event.isPremium ? "premium" : "free",
	);

	const form = useAppForm({
		defaultValues: {
			title: event.title,
			description: event.description ?? ("" as string | undefined | null),
			eventMode: event.eventMode ?? ("times" as "times" | "dates"),
			dates: event.dates,
			timeRangeStart: event.timeRangeStart,
			timeRangeEnd: event.timeRangeEnd,
			password: "" as string | undefined | null,
			notifyOnResponse: event.notifyOnResponse ?? false,
		},
		validators: {
			onSubmit: editSchema as never,
		},
		onSubmit: async ({ value }) => {
			setIsSubmitting(true);
			try {
				// Password logic: empty string = no change, non-empty = set/change, null = remove
				let passwordValue: string | null | undefined;
				if (value.password === null) {
					passwordValue = null; // Remove password
				} else if (value.password && value.password.length > 0) {
					passwordValue = value.password; // Set/change password
				}
				// undefined = no change (default)

				await updateEventMutation({
					eventId: event._id as Id<"events">,
					adminToken,
					title: value.title,
					description: value.description || null,
					dates: value.dates,
					// Dates events keep sentinel time fields — don't send them.
					timeRangeStart: isDatesMode ? undefined : value.timeRangeStart,
					timeRangeEnd: isDatesMode ? undefined : value.timeRangeEnd,
					password: passwordValue,
					notifyOnResponse: value.notifyOnResponse,
				});
				toast.success("Event updated successfully!");
				onOpenChange(false);
			} catch (error) {
				console.error("Failed to update event:", error);
				const errorMessage =
					error instanceof Error
						? error.message
						: "Failed to update event. Please try again.";
				toast.error(errorMessage);
			} finally {
				setIsSubmitting(false);
			}
		},
	});

	// Reset form when event changes or dialog opens
	// biome-ignore lint/correctness/useExhaustiveDependencies: form methods are stable references
	useEffect(() => {
		if (open) {
			form.reset();
			form.setFieldValue("title", event.title);
			form.setFieldValue("description", event.description ?? "");
			form.setFieldValue("dates", event.dates);
			form.setFieldValue("timeRangeStart", event.timeRangeStart);
			form.setFieldValue("timeRangeEnd", event.timeRangeEnd);
			form.setFieldValue("password", "");
			form.setFieldValue("notifyOnResponse", event.notifyOnResponse ?? false);
			setSelectedDates(
				event.dates.map((d) => parse(d, "yyyy-MM-dd", new Date())),
			);
			setShowCalendar(false);
			setShowPasswordInput(false);
			setRangeFrom("");
			setRangeTo("");
		}
	}, [open, event]);

	// Handle calendar date selection
	const handleDateSelect = (dates: Date[] | undefined) => {
		if (!dates) return;
		setSelectedDates(dates);

		// Convert dates to YYYY-MM-DD strings and sort
		const dateStrings = dates.map((d) => format(d, "yyyy-MM-dd")).sort();
		form.setFieldValue("dates", dateStrings);
	};

	// Merge a set of dates into the candidate pool (dedupe, cap to tier).
	const addDatesToSelection = (datesToAdd: Date[]) => {
		const keys = new Set(selectedDates.map((d) => format(d, "yyyy-MM-dd")));
		const merged = [...selectedDates];
		for (const d of datesToAdd) {
			const key = format(d, "yyyy-MM-dd");
			if (keys.has(key)) continue;
			keys.add(key);
			merged.push(d);
		}
		merged.sort((a, b) => a.getTime() - b.getTime());

		let capped = merged;
		if (merged.length > maxDates) {
			capped = merged.slice(0, maxDates);
			toast.error(`Only ${maxDates} dates allowed on this plan`);
		}
		setSelectedDates(capped);
		form.setFieldValue(
			"dates",
			capped.map((d) => format(d, "yyyy-MM-dd")),
		);
	};

	const handleAddRange = () => {
		if (!rangeFrom || !rangeTo) return;
		const start = parse(rangeFrom, "yyyy-MM-dd", new Date());
		const end = parse(rangeTo, "yyyy-MM-dd", new Date());
		if (end < start) {
			toast.error("End date must be on or after start date");
			return;
		}
		addDatesToSelection(eachDayOfInterval({ start, end }));
		setRangeFrom("");
		setRangeTo("");
	};

	// Format slot duration for display
	const formatSlotDuration = (minutes: number) => {
		if (minutes === 60) return "1 hour";
		return `${minutes} minutes`;
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="bg-card border-border text-card-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="text-2xl">Edit Event</DialogTitle>
					<DialogDescription className="text-muted-foreground">
						Update event details. Slot duration and timezone cannot be changed.
					</DialogDescription>
				</DialogHeader>

				{/* Warning if event has responses */}
				{responseCount > 0 && (
					<div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4 flex items-start gap-3">
						<AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
						<div>
							<p className="text-sm text-amber-400 font-medium">
								This event has {responseCount}{" "}
								{responseCount === 1 ? "response" : "responses"}
							</p>
							<p className="text-sm text-amber-400/80 mt-1">
								Changing dates or time range may affect existing availability
								data. Responses outside the new range will not be deleted, but
								may no longer be visible.
							</p>
						</div>
					</div>
				)}

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-6 mt-4"
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

					{/* Read-only: Timezone */}
					<div className="space-y-2">
						<Label className="text-xl font-bold text-foreground flex items-center gap-2">
							<Globe className="h-4 w-4" />
							Timezone
						</Label>
						<div className="bg-muted/50 border border-border rounded-md px-3 py-2 text-muted-foreground">
							{event.timeZone}
						</div>
						<p className="text-xs text-muted-foreground">
							Timezone cannot be changed after event creation.
						</p>
					</div>

					{/* Date Selection */}
					<form.AppField name="dates">
						{(field) => (
							<div className="space-y-2">
								<Label className="text-xl font-bold text-foreground">
									{isDatesMode ? "Select candidate days" : "Select Dates"}
								</Label>
								<div>
									{isDatesMode && (
										<div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end">
											<div className="flex-1 space-y-1">
												<Label htmlFor="edit-range-from" className="text-sm">
													From
												</Label>
												<Input
													id="edit-range-from"
													type="date"
													value={rangeFrom}
													onChange={(e) => setRangeFrom(e.target.value)}
													className="bg-background border-border text-foreground"
												/>
											</div>
											<div className="flex-1 space-y-1">
												<Label htmlFor="edit-range-to" className="text-sm">
													To
												</Label>
												<Input
													id="edit-range-to"
													type="date"
													value={rangeTo}
													onChange={(e) => setRangeTo(e.target.value)}
													className="bg-background border-border text-foreground"
												/>
											</div>
											<Button
												type="button"
												variant="outline"
												onClick={handleAddRange}
												disabled={!rangeFrom || !rangeTo}
											>
												Add range
											</Button>
										</div>
									)}
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
												className="rounded-md"
											/>
											<p className="text-xs text-muted-foreground mt-2">
												Past dates are allowed when editing to preserve existing
												data.
											</p>
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

					{/* Time Range (times mode only) */}
					{!isDatesMode && (
						<>
							<div className="grid grid-cols-2 gap-4">
								<form.AppField name="timeRangeStart">
									{(field) => (
										<div className="space-y-2">
											<Label
												htmlFor="edit-start-time"
												className="text-xl font-bold text-foreground"
											>
												Start Time
											</Label>
											<Input
												id="edit-start-time"
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
												htmlFor="edit-end-time"
												className="text-xl font-bold text-foreground"
											>
												End Time
											</Label>
											<Input
												id="edit-end-time"
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

							{/* Read-only: Slot Duration */}
							<div className="space-y-2">
								<Label className="text-xl font-bold text-foreground flex items-center gap-2">
									<Clock className="h-4 w-4" />
									Time Slot Duration
								</Label>
								<div className="bg-muted/50 border border-border rounded-md px-3 py-2 text-muted-foreground">
									{formatSlotDuration(event.slotDuration)}
								</div>
								<p className="text-xs text-muted-foreground">
									Slot duration cannot be changed as it would invalidate
									existing responses.
								</p>
							</div>
						</>
					)}

					{/* Password Protection (Premium only) */}
					{event.isPremium && (
						<div className="space-y-2">
							<Label className="text-xl font-bold text-foreground flex items-center gap-2">
								<Lock className="h-4 w-4" />
								Password Protection
							</Label>

							{event.password ? (
								<div className="space-y-3">
									<div className="bg-teal-900/20 border border-teal-700 rounded-lg p-3 flex items-center gap-2">
										<Lock className="w-4 h-4 text-teal-400 flex-shrink-0" />
										<span className="text-sm text-teal-400">
											This event is password protected
										</span>
									</div>

									{showPasswordInput ? (
										<form.AppField name="password">
											{(field) => (
												<div className="space-y-2">
													<div className="relative">
														<Input
															type="password"
															value={
																typeof field.state.value === "string"
																	? field.state.value
																	: ""
															}
															onChange={(e) =>
																field.handleChange(e.target.value)
															}
															placeholder="Enter new password"
															className="bg-background border-border text-foreground"
														/>
													</div>
													<div className="flex gap-2">
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={() => {
																field.handleChange("");
																setShowPasswordInput(false);
															}}
														>
															Cancel
														</Button>
													</div>
												</div>
											)}
										</form.AppField>
									) : (
										<div className="flex gap-2">
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => setShowPasswordInput(true)}
											>
												Change Password
											</Button>
											<Button
												type="button"
												variant="outline"
												size="sm"
												className="text-red-400 hover:text-red-300"
												onClick={() => {
													form.setFieldValue("password", null);
												}}
											>
												Remove Password
											</Button>
										</div>
									)}
								</div>
							) : (
								<div className="space-y-3">
									{showPasswordInput ? (
										<form.AppField name="password">
											{(field) => (
												<div className="space-y-2">
													<div className="relative">
														<Input
															type="password"
															value={
																typeof field.state.value === "string"
																	? field.state.value
																	: ""
															}
															onChange={(e) =>
																field.handleChange(e.target.value)
															}
															placeholder="Enter a password (min 4 characters)"
															className="bg-background border-border text-foreground"
														/>
													</div>
													<p className="text-xs text-muted-foreground">
														Respondents will need this password to access the
														event.
													</p>
													<Button
														type="button"
														variant="outline"
														size="sm"
														onClick={() => {
															field.handleChange("");
															setShowPasswordInput(false);
														}}
													>
														Cancel
													</Button>
												</div>
											)}
										</form.AppField>
									) : (
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => setShowPasswordInput(true)}
										>
											<Lock className="w-4 h-4 mr-1" />
											Add Password
										</Button>
									)}
								</div>
							)}
						</div>
					)}

					{/* Email Notifications (only for events created by signed-in users) */}
					{event.creatorId && (
						<form.AppField name="notifyOnResponse">
							{(field) => (
								<div className="flex items-center gap-3">
									<Checkbox
										id="edit-notify-on-response"
										checked={field.state.value ?? false}
										onCheckedChange={(checked) =>
											field.handleChange(checked === true)
										}
									/>
									<label
										htmlFor="edit-notify-on-response"
										className="flex items-center gap-2 text-sm text-foreground"
									>
										<Bell className="h-4 w-4 text-muted-foreground" />
										Email me when someone responds
									</label>
								</div>
							)}
						</form.AppField>
					)}

					{/* Submit Button */}
					<div className="flex justify-end gap-3 pt-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Saving..." : "Save Changes"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
