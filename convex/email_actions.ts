import { v } from "convex/values";
import { internal } from "./_generated/api";
import { type ActionCtx, internalAction } from "./_generated/server";

// Our registered project id in lame-mail (see its src/config/projects.ts).
const LAME_MAIL_PROJECT = "timesync";

/**
 * Resolve the creator's email for an event: the canonical users-table address
 * for signed-in creators, falling back to the email stored on the event doc
 * (guest-supplied, or a snapshot of the creator's email at creation time).
 */
async function resolveRecipientEmail(
	ctx: ActionCtx,
	event: { creatorId?: string; creatorEmail?: string },
): Promise<string | undefined> {
	if (event.creatorId) {
		const userEmail = await ctx.runQuery(internal.email.getUserEmailByClerkId, {
			clerkId: event.creatorId,
		});
		if (userEmail) return userEmail;
	}
	return event.creatorEmail ?? undefined;
}

/**
 * Send one transactional email through lame-mail (self-hosted HTTP email
 * service). We only ever use the "notification" template: lame-mail renders the
 * branded layout and HTML-escapes all `data` values, so callers pass plain-text
 * `subject` + `body` — never HTML. Returns a normalized result to log.
 */
async function sendViaLameMail(
	baseUrl: string,
	apiKey: string,
	payload: { to: string; idempotencyKey?: string; subject: string; body: string },
): Promise<{ ok: boolean; status?: number; error?: unknown }> {
	// The API Gateway stage URL (e.g. the CDK `ApiUrl` output) ends in a slash;
	// normalize so we never build a route-breaking `.../prod//send`.
	const endpoint = `${baseUrl.replace(/\/+$/, "")}/send`;
	try {
		const response = await fetch(endpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": apiKey,
			},
			body: JSON.stringify({
				project: LAME_MAIL_PROJECT,
				template: "notification",
				to: payload.to,
				idempotencyKey: payload.idempotencyKey,
				data: { subject: payload.subject, body: payload.body },
			}),
		});
		if (!response.ok) {
			const detail = await response.text().catch(() => "");
			return { ok: false, status: response.status, error: detail };
		}
		return { ok: true, status: response.status };
	} catch (error) {
		return { ok: false, error };
	}
}

/**
 * Internal action to email the creator their public + admin links right after
 * an event is created. Sent to the account email (signed-in) or a guest-supplied
 * email; a no-op when neither lame-mail nor a recipient/APP_URL is configured.
 */
export const sendEventCreatedEmail = internalAction({
	args: {
		eventId: v.id("events"),
	},
	handler: async (ctx, args) => {
		const baseUrl = process.env.LAME_MAIL_URL;
		const apiKey = process.env.LAME_MAIL_API_KEY;
		const appUrl = process.env.APP_URL;

		if (!baseUrl || !apiKey) {
			console.warn(
				"[Email] lame-mail not configured (LAME_MAIL_URL or LAME_MAIL_API_KEY missing). Skipping event-created email.",
			);
			return;
		}

		const event = await ctx.runQuery(internal.email.getEventForEmail, {
			eventId: args.eventId,
		});

		if (!event) {
			console.warn(
				`[Email] Event ${args.eventId} not found. Skipping event-created email.`,
			);
			return;
		}

		const recipientEmail = await resolveRecipientEmail(ctx, event);
		if (!recipientEmail) {
			console.warn(
				`[Email] No recipient email for event ${args.eventId}. Skipping event-created email.`,
			);
			return;
		}

		// Without APP_URL we can't build shareable links — and links are the whole
		// point of this email — so skip rather than send a broken message.
		if (!appUrl) {
			console.warn(
				"[Email] APP_URL not configured. Skipping event-created email (no links to send).",
			);
			return;
		}

		const publicUrl = `${appUrl}/events/${args.eventId}`;
		const adminUrl = `${appUrl}/events/${args.eventId}/admin/${event.adminToken}`;

		const sanitizedTitle = event.title.replace(/[\r\n]/g, " ");
		const subject = `Your TimeSync event "${sanitizedTitle}" is ready`;
		const body = [
			`"${event.title}" has been created — here are your links.`,
			"",
			"Share this link with participants:",
			publicUrl,
			"",
			"Your private admin link (view results and manage responses — keep this secret):",
			adminUrl,
		].join("\n");

		const { ok, status, error } = await sendViaLameMail(baseUrl, apiKey, {
			to: recipientEmail,
			idempotencyKey: `event-created-${args.eventId}`,
			subject,
			body,
		});
		if (ok) {
			console.log(
				`[Email] Event-created email queued for ${recipientEmail} (event ${args.eventId})`,
			);
		} else {
			console.error(
				`[Email] Failed to queue event-created email for event ${args.eventId} (status ${status ?? "n/a"}):`,
				error,
			);
		}
	},
});

/**
 * Internal action to send an email notification when someone
 * submits a new response to an event.
 */
export const sendResponseNotification = internalAction({
	args: {
		eventId: v.id("events"),
		respondentName: v.string(),
		responseCount: v.number(),
	},
	handler: async (ctx, args) => {
		const baseUrl = process.env.LAME_MAIL_URL;
		const apiKey = process.env.LAME_MAIL_API_KEY;
		const appUrl = process.env.APP_URL;

		if (!baseUrl || !apiKey) {
			console.warn(
				"[Email] lame-mail not configured (LAME_MAIL_URL or LAME_MAIL_API_KEY missing). Skipping notification.",
			);
			return;
		}

		// Look up the event
		const event = await ctx.runQuery(internal.email.getEventForEmail, {
			eventId: args.eventId,
		});

		if (!event) {
			console.warn(
				`[Email] Event ${args.eventId} not found. Skipping notification.`,
			);
			return;
		}

		// Determine recipient email (users-table canonical, then event fallback)
		const recipientEmail = await resolveRecipientEmail(ctx, event);

		if (!recipientEmail) {
			console.warn(
				`[Email] No recipient email found for event ${args.eventId}. Skipping notification.`,
			);
			return;
		}

		const adminUrl = appUrl
			? `${appUrl}/events/${args.eventId}/admin/${event.adminToken}`
			: undefined;

		const convexSiteUrl = process.env.CONVEX_CLOUD_URL?.replace(
			".cloud",
			".site",
		);
		const unsubscribeUrl = convexSiteUrl
			? `${convexSiteUrl}/unsubscribe?eventId=${args.eventId}&adminToken=${event.adminToken}`
			: undefined;

		const sanitizedTitle = event.title.replace(/[\r\n]/g, " ");
		const subject = `New response to "${sanitizedTitle}"`;

		const responseWord = args.responseCount === 1 ? "response" : "responses";
		const lines = [
			`${args.respondentName} just submitted their availability for "${event.title}".`,
			"",
			`Your event now has ${args.responseCount} ${responseWord}.`,
		];
		if (adminUrl) {
			lines.push("", "View results:", adminUrl);
		}
		if (unsubscribeUrl) {
			lines.push("", "To stop notifications for this event:", unsubscribeUrl);
		}
		const body = lines.join("\n");

		const { ok, status, error } = await sendViaLameMail(baseUrl, apiKey, {
			to: recipientEmail,
			idempotencyKey: `response-${args.eventId}-${args.responseCount}`,
			subject,
			body,
		});
		if (ok) {
			console.log(
				`[Email] Notification queued for ${recipientEmail} (event ${args.eventId})`,
			);
		} else {
			console.error(
				`[Email] Failed to queue notification for event ${args.eventId} (status ${status ?? "n/a"}):`,
				error,
			);
		}
	},
});
