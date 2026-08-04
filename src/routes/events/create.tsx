import { useStore } from "@tanstack/react-form";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { format } from "date-fns";
import {
	Bell,
	CalendarDays,
	CalendarIcon,
	Clock,
	Crown,
	Eye,
	EyeOff,
	Lock,
	Mail,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DayPoolPicker } from "@/components/availability-grid/DayPoolPicker";
import { PatternRangePicker } from "@/components/availability-grid/PatternRangePicker";
import { LinkCopy } from "@/components/LinkCopy";
import { TimezoneSelect } from "@/components/TimezoneSelect";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
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
import { trackEvent } from "@/lib/analytics-events";
import {
	type DatePattern,
	getDateBlocks,
	patternLabel,
	weekdaysForPattern,
} from "@/lib/date-blocks";
import { getErrorMessage } from "@/lib/form-utils";
import { getDateRangeSpanDays, TIER_LIMITS } from "@/lib/tier-config";
import { getBrowserTimezone, isDateInPast } from "@/lib/time-utils";
import { cn } from "@/lib/utils";
import { createEventSchemaForTier } from "@/lib/validation-schemas";
import { api } from "../../../convex/_generated/api";

// Matches the tier-limit validation messages from
// `src/lib/validation-schemas.ts` (`refineDatesLimit`) so
// `event_create_tier_limit_hit` fires only for those messages, not every
// validation error on the `dates` field.
const TIER_LIMIT_MESSAGE_PATTERNS: {
	pattern: RegExp;
	limitType: "maxDates" | "maxDateSpanDays";
}[] = [
	{
		pattern: /^Maximum \d+ dates allowed for \w+ tier$/,
		limitType: "maxDates",
	},
	{
		pattern: /^Dates can span at most \d+ weeks for \w+ tier$/,
		limitType: "maxDateSpanDays",
	},
];

const PATTERN_OPTIONS: { value: DatePattern; label: string }[] = [
	{ value: "individual", label: "Individual" },
	{ value: "weekends", label: "Weekends" },
	{ value: "weekdays", label: "Weekdays" },
	{ value: "custom", label: "Custom" },
];

const WEEKDAY_CHIPS = [
	{ index: 0, label: "Su" },
	{ index: 1, label: "Mo" },
	{ index: 2, label: "Tu" },
	{ index: 3, label: "We" },
	{ index: 4, label: "Th" },
	{ index: 5, label: "Fr" },
	{ index: 6, label: "Sa" },
];

export const Route = createFileRoute("/events/create")({
	component: CreateEvent,
});

function CreateEvent() {
	const createEventMutation = useMutation(api.events.create);
	const router = useRouter();
	const { isPremium, tier, isAuthenticated } = useSubscription();
	const [createdEvent, setCreatedEvent] = useState<{
		eventId: string;
		adminToken: string;
	} | null>(null);

	const [selectedDates, setSelectedDates] = useState<Date[]>([]);
	const [showCalendar, setShowCalendar] = useState(false);

	// "times" = align on time slots (default), "dates" = align on whole days.
	const [eventMode, setEventMode] = useState<"times" | "dates">("times");
	// For dates events: how candidate days are shaped.
	const [datePattern, setDatePattern] = useState<DatePattern>("individual");
	const [customWeekdays, setCustomWeekdays] = useState<number[]>([]);

	const tierLimits = isPremium ? TIER_LIMITS.premium : TIER_LIMITS.free;
	const eventSchema = useMemo(() => createEventSchemaForTier(tier), [tier]);

	const [showPassword, setShowPassword] = useState(false);

	// Fires `event_create_started` once per page load, on the first
	// field-level interaction anywhere in the create form.
	const hasStartedRef = useRef(false);
	const trackCreateStartedOnce = () => {
		if (hasStartedRef.current) return;
		hasStartedRef.current = true;
		trackEvent("event_create_started", { eventMode, isAuthenticated });
	};

	const form = useAppForm({
		defaultValues: {
			title: "",
			description: "" as string | undefined,
			timeZone: getBrowserTimezone(),
			eventMode: "times" as "times" | "dates",
			datePattern: "individual" as DatePattern,
			patternWeekdays: [] as number[],
			dates: [] as string[],
			timeRangeStart: "09:00",
			timeRangeEnd: "17:00",
			slotDuration: "30" as "15" | "30" | "60",
			password: "" as string | undefined,
			notifyOnResponse: isAuthenticated ? true : undefined,
			creatorEmail: "" as string | undefined,
		},
		validators: {
			onSubmit: eventSchema as never,
		},
		onSubmit: async ({ value }) => {
			try {
				const isDates = value.eventMode === "dates";
				const grouped = isDates && value.datePattern !== "individual";
				trackEvent("event_create_submitted", {
					eventMode: value.eventMode,
					datePattern: value.datePattern,
					isAuthenticated,
					hasPassword: Boolean(value.password),
					notifyOnResponse: Boolean(value.notifyOnResponse),
				});
				const result = await createEventMutation({
					title: value.title,
					description: value.description || undefined,
					timeZone: value.timeZone,
					eventMode: value.eventMode,
					datePattern: isDates ? value.datePattern : undefined,
					patternWeekdays: grouped ? value.patternWeekdays : undefined,
					dates: value.dates,
					// Dates events ignore these; send sentinels the server also enforces.
					timeRangeStart: isDates ? "00:00" : value.timeRangeStart,
					timeRangeEnd: isDates ? "00:00" : value.timeRangeEnd,
					slotDuration: isDates
						? 1440
						: Number.parseInt(value.slotDuration, 10),
					maxRespondents: tierLimits.maxParticipants,
					password: value.password || undefined,
					notifyOnResponse: value.notifyOnResponse || undefined,
					// Only guests supply an email; signed-in users use their account email.
					creatorEmail: isAuthenticated
						? undefined
						: value.creatorEmail || undefined,
				});
				setCreatedEvent({
					eventId: result.eventId,
					adminToken: result.adminToken,
				});
				trackEvent("event_create_completed", {
					eventId: result.eventId,
					eventMode: value.eventMode,
					isAuthenticated,
				});
				toast.success("Event created successfully!");
			} catch (error) {
				console.error("Failed to create event:", error);
				let errorCode = "unknown_error";
				let message = "Failed to create event. Please try again.";
				if (
					error instanceof ConvexError &&
					typeof error.data?.message === "string"
				) {
					message = error.data.message;
					if (typeof error.data?.code === "string") {
						errorCode = error.data.code;
					}
				}
				trackEvent("event_create_failed", {
					errorCode,
					eventMode: value.eventMode,
				});
				toast.error(message);
			}
		},
	});

	useEffect(() => {
		const current = form.getFieldValue("notifyOnResponse");
		if (isAuthenticated && current === undefined) {
			form.setFieldValue("notifyOnResponse", true);
		}
	}, [form, isAuthenticated]);

	// Fires `event_create_tier_limit_hit` only when the `dates` field's
	// validation error is one of the tier-limit messages from
	// `refineDatesLimit` (src/lib/validation-schemas.ts), not on every
	// validation error. Dedupes on message content so it doesn't re-fire on
	// every render while the same limit error stays visible.
	const datesFieldErrors = useStore(
		form.store,
		(state) => state.fieldMeta.dates?.errors ?? [],
	);
	const lastTierLimitMessageRef = useRef<string | null>(null);
	useEffect(() => {
		const message =
			datesFieldErrors.length > 0
				? getErrorMessage(datesFieldErrors[0])
				: undefined;
		if (!message) {
			lastTierLimitMessageRef.current = null;
			return;
		}
		if (lastTierLimitMessageRef.current === message) return;
		const match = TIER_LIMIT_MESSAGE_PATTERNS.find(({ pattern }) =>
			pattern.test(message),
		);
		if (!match) return;
		lastTierLimitMessageRef.current = message;
		const currentDates = form.getFieldValue("dates");
		trackEvent("event_create_tier_limit_hit", {
			limitType: match.limitType,
			tier,
			attemptedValue:
				match.limitType === "maxDates"
					? currentDates.length
					: getDateRangeSpanDays(currentDates),
		});
	}, [datesFieldErrors, form, tier]);

	const maxDateSpanDays = tierLimits.maxDateSpanDays;
	const spanWeeks = Math.round(maxDateSpanDays / 7);

	// Handle multi-select calendar for time-slot events (dates events use the
	// shared DayPoolPicker, which manages its own selection).
	const handleDateSelect = (dates: Date[] | undefined) => {
		if (!dates) return;
		const dateStrings = dates.map((d) => format(d, "yyyy-MM-dd")).sort();
		setSelectedDates(dates);
		form.setFieldValue("dates", dateStrings);
	};

	// Toggle between "times" and "dates" event modes (keep form field in sync).
	const handleModeChange = (mode: "times" | "dates") => {
		trackEvent("event_create_mode_selected", {
			eventMode: mode,
			previousMode: eventMode,
		});
		setEventMode(mode);
		form.setFieldValue("eventMode", mode);
	};

	// Switch the dates-event day pattern. Clears the current day selection since
	// candidate days must match the new pattern's weekdays.
	const handlePatternChange = (pattern: DatePattern) => {
		setDatePattern(pattern);
		form.setFieldValue("datePattern", pattern);
		form.setFieldValue(
			"patternWeekdays",
			weekdaysForPattern(pattern, customWeekdays),
		);
		form.setFieldValue("dates", []);
		setSelectedDates([]);
	};

	// Toggle a weekday for the custom pattern (also clears the selection).
	const toggleCustomWeekday = (index: number) => {
		const next = customWeekdays.includes(index)
			? customWeekdays.filter((d) => d !== index)
			: [...customWeekdays, index].sort((a, b) => a - b);
		setCustomWeekdays(next);
		form.setFieldValue("patternWeekdays", next);
		form.setFieldValue("dates", []);
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
								{eventMode === "dates"
									? `Span up to ${spanWeeks} weeks`
									: `Up to ${tierLimits.maxDates} dates`}
								, unlimited participants
							</p>
						</div>
					</div>
				) : (
					<div className="mb-6 p-4 bg-muted/50 border border-border rounded-xl">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-foreground font-medium">Free Tier</p>
								<p className="text-sm text-muted-foreground">
									{eventMode === "dates"
										? `Span up to ${spanWeeks} weeks`
										: `Up to ${tierLimits.maxDates} dates`}
									, {tierLimits.maxParticipants} participants
								</p>
							</div>
							<Link
								to="/pricing"
								search={{
									success: false,
									canceled: false,
									from: "create_form",
								}}
							>
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
					onChangeCapture={trackCreateStartedOnce}
					onClickCapture={trackCreateStartedOnce}
					className="space-y-6 bg-card border border-border rounded-xl p-6 shadow-lg"
				>
					{/* Event Mode Chooser */}
					<div className="space-y-2">
						<Label className="text-xl font-bold text-foreground">
							What do you want to align on?
						</Label>
						<div className="grid grid-cols-2 gap-3">
							<button
								type="button"
								onClick={() => handleModeChange("times")}
								aria-pressed={eventMode === "times"}
								className={cn(
									"flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors",
									eventMode === "times"
										? "border-teal-500 bg-teal-500/10"
										: "border-border bg-background hover:bg-muted/50",
								)}
							>
								<span className="flex items-center gap-2 font-medium text-foreground">
									<Clock className="h-4 w-4" /> Times
								</span>
								<span className="text-sm text-muted-foreground">
									Find the best time of day across a set of dates.
								</span>
							</button>
							<button
								type="button"
								onClick={() => handleModeChange("dates")}
								aria-pressed={eventMode === "dates"}
								className={cn(
									"flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors",
									eventMode === "dates"
										? "border-teal-500 bg-teal-500/10"
										: "border-border bg-background hover:bg-muted/50",
								)}
							>
								<span className="flex items-center gap-2 font-medium text-foreground">
									<CalendarDays className="h-4 w-4" /> Dates
								</span>
								<span className="text-sm text-muted-foreground">
									Find the best days — no specific times. Great for trips.
								</span>
							</button>
						</div>
					</div>

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
										{eventMode === "dates"
											? "Select candidate days"
											: "Select Dates"}
									</Label>
									<span className="text-sm text-muted-foreground">
										{eventMode === "dates"
											? datePattern === "individual"
												? `${field.state.value.length} days · up to ${spanWeeks} weeks`
												: `${getDateBlocks(field.state.value).length} groups · up to ${spanWeeks} weeks`
											: `${selectedDates.length}/${tierLimits.maxDates} dates`}
									</span>
								</div>
								{eventMode === "dates" ? (
									<>
										{/* Pattern chooser */}
										<p className="text-sm text-muted-foreground">
											How should people choose days?
										</p>
										<div className="flex flex-wrap gap-2">
											{PATTERN_OPTIONS.map((opt) => (
												<button
													key={opt.value}
													type="button"
													onClick={() => handlePatternChange(opt.value)}
													aria-pressed={datePattern === opt.value}
													className={cn(
														"rounded-md border px-3 py-2 text-sm font-medium transition-colors min-h-[44px]",
														datePattern === opt.value
															? "border-teal-500 bg-teal-500/10 text-foreground"
															: "border-border bg-background text-muted-foreground hover:bg-muted/50",
													)}
												>
													{opt.label}
												</button>
											))}
										</div>
										{datePattern === "custom" && (
											<div className="flex flex-wrap gap-1">
												{WEEKDAY_CHIPS.map((wd) => (
													<button
														key={wd.index}
														type="button"
														onClick={() => toggleCustomWeekday(wd.index)}
														aria-pressed={customWeekdays.includes(wd.index)}
														className={cn(
															"h-9 w-9 rounded-md border text-sm font-medium transition-colors",
															customWeekdays.includes(wd.index)
																? "border-teal-500 bg-teal-500/15 text-teal-600 dark:text-teal-400"
																: "border-border bg-background text-muted-foreground hover:bg-muted/50",
														)}
													>
														{wd.label}
													</button>
												))}
											</div>
										)}

										{datePattern === "individual" ? (
											<>
												<p className="text-sm text-muted-foreground">
													Pick the days people can choose from. Add a whole
													range — or just weekends — then fine-tune individual
													days.
												</p>
												<DayPoolPicker
													selected={field.state.value}
													onSelectedChange={(next) => field.handleChange(next)}
													disablePast
													maxSpanDays={maxDateSpanDays}
													spanWeeks={spanWeeks}
												/>
											</>
										) : (
											<>
												<p className="text-sm text-muted-foreground">
													{patternLabel(datePattern, customWeekdays)} — add a
													date range and each occurrence becomes a group people
													pick from.
												</p>
												<PatternRangePicker
													weekdays={weekdaysForPattern(
														datePattern,
														customWeekdays,
													)}
													selected={field.state.value}
													onSelectedChange={(next) => field.handleChange(next)}
													disablePast
													maxSpanDays={maxDateSpanDays}
													spanWeeks={spanWeeks}
												/>
											</>
										)}
									</>
								) : (
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
													disabled={(date) =>
														isDateInPast(format(date, "yyyy-MM-dd"))
													}
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
									</div>
								)}
								{field.state.meta.errors.length > 0 && (
									<p className="text-red-500 text-sm mt-1">
										{getErrorMessage(field.state.meta.errors[0])}
									</p>
								)}
							</div>
						)}
					</form.AppField>

					{/* Time Range (times mode only) */}
					{eventMode === "times" && (
						<>
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
						</>
					)}

					{/* Password Protection */}
					{isPremium ? (
						<form.AppField name="password">
							{(field) => (
								<div className="space-y-2">
									<Label className="text-xl font-bold text-foreground flex items-center gap-2">
										<Lock className="h-4 w-4" />
										Password Protection
										<span className="text-xs font-normal bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-2 py-0.5 rounded-full">
											Premium
										</span>
									</Label>
									<div className="relative">
										<Input
											type={showPassword ? "text" : "password"}
											value={field.state.value ?? ""}
											onChange={(e) =>
												field.handleChange(e.target.value || undefined)
											}
											placeholder="Leave empty for no password"
											className="bg-background border-border text-foreground pr-10"
										/>
										<button
											type="button"
											onClick={() => setShowPassword(!showPassword)}
											className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
											tabIndex={-1}
										>
											{showPassword ? (
												<EyeOff className="w-4 h-4" />
											) : (
												<Eye className="w-4 h-4" />
											)}
										</button>
									</div>
									<p className="text-xs text-muted-foreground">
										Respondents will need this password to view and submit
										availability.
									</p>
									{field.state.meta.errors.length > 0 && (
										<p className="text-red-500 text-sm mt-1">
											{getErrorMessage(field.state.meta.errors[0])}
										</p>
									)}
								</div>
							)}
						</form.AppField>
					) : (
						<div className="space-y-2">
							<Label className="text-xl font-bold text-muted-foreground flex items-center gap-2">
								<Lock className="h-4 w-4" />
								Password Protection
							</Label>
							<div className="bg-muted/50 border border-border rounded-md px-3 py-3 flex items-center justify-between">
								<p className="text-sm text-muted-foreground">
									Require a password for respondents to access your event.
								</p>
								<Link
									to="/pricing"
									search={{
										success: false,
										canceled: false,
										from: "create_form",
									}}
								>
									<Button variant="outline" size="sm" className="gap-1 ml-3">
										<Crown className="w-4 h-4" />
										Upgrade
									</Button>
								</Link>
							</div>
						</div>
					)}

					{/* Email Notifications (signed-in creators) */}
					{isAuthenticated && (
						<form.AppField name="notifyOnResponse">
							{(field) => (
								<div className="flex items-center gap-3">
									<Checkbox
										id="notify-on-response"
										checked={field.state.value ?? false}
										onCheckedChange={(checked) =>
											field.handleChange(checked === true)
										}
									/>
									<label
										htmlFor="notify-on-response"
										className="flex items-center gap-2 text-sm text-foreground"
									>
										<Bell className="h-4 w-4 text-muted-foreground" />
										Email me when someone responds
									</label>
								</div>
							)}
						</form.AppField>
					)}

					{/* Email the links to the creator */}
					{isAuthenticated ? (
						<p className="flex items-center gap-2 text-sm text-muted-foreground">
							<Mail className="h-4 w-4" />
							We'll email your event links to your account.
						</p>
					) : (
						<form.AppField name="creatorEmail">
							{(field) => (
								<div className="space-y-2">
									<Label
										htmlFor="creator-email"
										className="flex items-center gap-2 text-sm text-foreground"
									>
										<Mail className="h-4 w-4 text-muted-foreground" />
										Email me the event links (optional)
									</Label>
									<Input
										id="creator-email"
										type="email"
										inputMode="email"
										autoComplete="email"
										placeholder="you@example.com"
										value={field.state.value ?? ""}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
									/>
									<p className="text-xs text-muted-foreground">
										We'll send the public and admin links here so you don't lose
										them. No account required, and we won't use it for anything
										else.
									</p>
									{field.state.meta.errors.length > 0 && (
										<p className="text-red-500 text-sm mt-1">
											{getErrorMessage(field.state.meta.errors[0])}
										</p>
									)}
								</div>
							)}
						</form.AppField>
					)}

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
