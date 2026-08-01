import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { AlertCircle, Bell, BellOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/unsubscribe")({
	component: UnsubscribeRoute,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			eventId: typeof search.eventId === "string" ? search.eventId : undefined,
			token: typeof search.token === "string" ? search.token : undefined,
		};
	},
});

function UnsubscribeRoute() {
	const { eventId, token } = useSearch({ from: "/unsubscribe" });
	return <UnsubscribePage eventId={eventId} token={token} />;
}

function PortalShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen bg-gradient-to-b from-background via-muted to-background flex items-center justify-center px-4">
			<div className="w-full max-w-md">
				<div className="flex justify-center mb-6">
					<Logo size={48} />
				</div>
				<div className="bg-card border border-border rounded-xl p-8 shadow-lg text-center">
					{children}
				</div>
			</div>
		</div>
	);
}

export function UnsubscribePage({
	eventId,
	token,
}: {
	eventId?: string;
	token?: string;
}) {
	const [override, setOverride] = useState<boolean | null>(null);
	const [justResubscribed, setJustResubscribed] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [lastAction, setLastAction] = useState<
		"unsubscribe" | "resubscribe" | null
	>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const hasParams = Boolean(eventId && token);
	const info = useQuery(
		api.email.getUnsubscribeInfo,
		hasParams ? { eventId: eventId as string, token: token as string } : "skip",
	);
	const unsubscribeMutation = useMutation(api.email.unsubscribe);
	const resubscribeMutation = useMutation(api.email.resubscribe);

	if (!hasParams) {
		return <InvalidLinkCard />;
	}

	if (info === undefined) {
		return (
			<PortalShell>
				<Loader2 className="animate-spin h-8 w-8 text-muted-foreground mx-auto" />
			</PortalShell>
		);
	}

	if (info === null) {
		return <InvalidLinkCard />;
	}

	const runAction = async (action: "unsubscribe" | "resubscribe") => {
		setError(null);
		setLastAction(action);
		setIsSubmitting(true);
		try {
			const mutate =
				action === "unsubscribe" ? unsubscribeMutation : resubscribeMutation;
			const result = await mutate({
				eventId: eventId as string,
				token: token as string,
			});
			if (!result.success) {
				setError(
					"This link is no longer valid. Please check the link in your email.",
				);
				return;
			}
			setOverride(action !== "unsubscribe");
			setJustResubscribed(action === "resubscribe");
		} catch {
			setError("Something went wrong. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (error) {
		return (
			<PortalShell>
				<AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
				<h1 className="text-xl font-bold text-foreground mb-2">
					Something went wrong
				</h1>
				<p className="text-muted-foreground mb-6">{error}</p>
				<Button
					onClick={() => lastAction && runAction(lastAction)}
					disabled={isSubmitting}
					className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
				>
					{isSubmitting ? "Retrying..." : "Try again"}
				</Button>
			</PortalShell>
		);
	}

	const notifyOnResponse = override ?? info.notifyOnResponse;

	if (!notifyOnResponse) {
		return (
			<PortalShell>
				<BellOff className="w-10 h-10 text-teal-500 mx-auto mb-4" />
				<h1 className="text-xl font-bold text-foreground mb-2">
					You're unsubscribed
				</h1>
				<p className="text-muted-foreground mb-6">
					You won't receive email notifications for "{info.title}".
				</p>
				<Button
					onClick={() => runAction("resubscribe")}
					disabled={isSubmitting}
					variant="outline"
					className="w-full"
				>
					{isSubmitting ? "Re-enabling..." : "Re-enable notifications"}
				</Button>
			</PortalShell>
		);
	}

	if (justResubscribed) {
		return (
			<PortalShell>
				<Bell className="w-10 h-10 text-teal-500 mx-auto mb-4" />
				<h1 className="text-xl font-bold text-foreground mb-2">
					Notifications are back on
				</h1>
				<p className="text-muted-foreground mb-6">
					You'll receive email notifications for "{info.title}" again.
				</p>
				<Button
					onClick={() => runAction("unsubscribe")}
					disabled={isSubmitting}
					variant="outline"
					className="w-full"
				>
					{isSubmitting ? "Turning off..." : "Turn off again"}
				</Button>
			</PortalShell>
		);
	}

	return (
		<PortalShell>
			<Bell className="w-10 h-10 text-teal-500 mx-auto mb-4" />
			<h1 className="text-xl font-bold text-foreground mb-2">
				Stop email notifications for "{info.title}"?
			</h1>
			<p className="text-muted-foreground mb-6">
				You'll no longer receive an email when someone responds to this event.
			</p>
			<Button
				onClick={() => runAction("unsubscribe")}
				disabled={isSubmitting}
				className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
			>
				{isSubmitting ? "Unsubscribing..." : "Confirm unsubscribe"}
			</Button>
		</PortalShell>
	);
}

function InvalidLinkCard() {
	return (
		<PortalShell>
			<AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
			<h1 className="text-xl font-bold text-foreground mb-2">Invalid link</h1>
			<p className="text-muted-foreground">
				This unsubscribe link is invalid. Please check the link in your email.
			</p>
		</PortalShell>
	);
}
