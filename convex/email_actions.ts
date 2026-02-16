"use node";

import sgMail from "@sendgrid/mail";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

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

		// Determine recipient email
		let recipientEmail: string | undefined;

		if (event.creatorId) {
			// Look up user's email from users table (canonical source)
			const userEmail = await ctx.runQuery(
				internal.email.getUserEmailByClerkId,
				{ clerkId: event.creatorId },
			);
			recipientEmail = userEmail ?? undefined;
		}

		// Fall back to creatorEmail on the event doc
		if (!recipientEmail && event.creatorEmail) {
			recipientEmail = event.creatorEmail;
		}

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

		const subject = `New response to "${event.title}"`;

		const html = `
			<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
				<h2 style="color: #0d9488;">New Response Submitted</h2>
				<p><strong>${escapeHtml(args.respondentName)}</strong> just submitted their availability for <strong>${escapeHtml(event.title)}</strong>.</p>
				<p>Your event now has <strong>${args.responseCount}</strong> ${args.responseCount === 1 ? "response" : "responses"}.</p>
				${adminUrl ? `<p><a href="${adminUrl}" style="display: inline-block; background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 8px;">View Results</a></p>` : ""}
				<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
				<p style="color: #6b7280; font-size: 12px;">
					This notification was sent by TimeSync.
					${unsubscribeUrl ? `<br /><a href="${unsubscribeUrl}" style="color: #6b7280;">Unsubscribe from notifications for this event</a>` : ""}
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
