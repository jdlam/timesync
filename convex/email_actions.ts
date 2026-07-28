"use node";

import sgMail from "@sendgrid/mail";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { type ActionCtx, internalAction } from "./_generated/server";

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

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
 * Internal action to email the creator their public + admin links right after
 * an event is created. Sent to the account email (signed-in) or a guest-supplied
 * email; a no-op when neither SendGrid nor a recipient/APP_URL is configured.
 *
 * Runs in the Node.js runtime because SendGrid SDK requires Node APIs.
 */
export const sendEventCreatedEmail = internalAction({
	args: {
		eventId: v.id("events"),
	},
	handler: async (ctx, args) => {
		const apiKey = process.env.SENDGRID_API_KEY;
		const fromEmail = process.env.SENDGRID_FROM_EMAIL;
		const appUrl = process.env.APP_URL;

		if (!apiKey || !fromEmail) {
			console.warn(
				"[Email] SendGrid not configured (SENDGRID_API_KEY or SENDGRID_FROM_EMAIL missing). Skipping event-created email.",
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

		const html = `
			<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
				<h2 style="color: #0d9488;">Your event is ready to share</h2>
				<p><strong>${escapeHtml(event.title)}</strong> has been created. Here are your links — keep the admin link private.</p>
				<p style="margin: 20px 0;">
					<a href="${escapeHtml(publicUrl)}" style="display: inline-block; background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Open sharing link</a>
				</p>
				<table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
					<tr>
						<td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Public link (share with participants)</td>
					</tr>
					<tr>
						<td style="padding: 0 0 12px; font-size: 13px;"><a href="${escapeHtml(publicUrl)}" style="color: #0d9488; word-break: break-all;">${escapeHtml(publicUrl)}</a></td>
					</tr>
					<tr>
						<td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Admin link (keep this private — it manages results)</td>
					</tr>
					<tr>
						<td style="padding: 0 0 12px; font-size: 13px;"><a href="${escapeHtml(adminUrl)}" style="color: #0d9488; word-break: break-all;">${escapeHtml(adminUrl)}</a></td>
					</tr>
				</table>
				<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
				<p style="color: #6b7280; font-size: 12px;">
					You're receiving this because an event was created with your email on TimeSync.
				</p>
			</div>
		`;

		sgMail.setApiKey(apiKey);

		try {
			await sgMail.send({
				to: recipientEmail,
				from: fromEmail,
				subject,
				html,
			});
			console.log(
				`[Email] Event-created email sent to ${recipientEmail} for event ${args.eventId}`,
			);
		} catch (error) {
			console.error(
				`[Email] Failed to send event-created email for event ${args.eventId}:`,
				error,
			);
		}
	},
});

/**
 * Internal action to send an email notification when someone
 * submits a new response to an event.
 *
 * Runs in the Node.js runtime because SendGrid SDK requires Node APIs.
 */
export const sendResponseNotification = internalAction({
	args: {
		eventId: v.id("events"),
		respondentName: v.string(),
		responseCount: v.number(),
	},
	handler: async (ctx, args) => {
		const apiKey = process.env.SENDGRID_API_KEY;
		const fromEmail = process.env.SENDGRID_FROM_EMAIL;
		const appUrl = process.env.APP_URL;

		if (!apiKey || !fromEmail) {
			console.warn(
				"[Email] SendGrid not configured (SENDGRID_API_KEY or SENDGRID_FROM_EMAIL missing). Skipping notification.",
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

		const html = `
			<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
				<h2 style="color: #0d9488;">New Response Submitted</h2>
				<p><strong>${escapeHtml(args.respondentName)}</strong> just submitted their availability for <strong>${escapeHtml(event.title)}</strong>.</p>
				<p>Your event now has <strong>${args.responseCount}</strong> ${args.responseCount === 1 ? "response" : "responses"}.</p>
				${adminUrl ? `<p><a href="${escapeHtml(adminUrl)}" style="display: inline-block; background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 8px;">View Results</a></p>` : ""}
				<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
				<p style="color: #6b7280; font-size: 12px;">
					This notification was sent by TimeSync.
					${unsubscribeUrl ? `<br /><a href="${escapeHtml(unsubscribeUrl)}" style="color: #6b7280;">Unsubscribe from notifications for this event</a>` : ""}
				</p>
			</div>
		`;

		sgMail.setApiKey(apiKey);

		try {
			await sgMail.send({
				to: recipientEmail,
				from: fromEmail,
				subject,
				html,
			});
			console.log(
				`[Email] Notification sent to ${recipientEmail} for event ${args.eventId}`,
			);
		} catch (error) {
			console.error(
				`[Email] Failed to send notification for event ${args.eventId}:`,
				error,
			);
		}
	},
});
