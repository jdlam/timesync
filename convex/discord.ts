import { v } from "convex/values";
import { internalAction } from "./_generated/server";

interface DiscordEmbed {
	title: string;
	description: string;
	color: number;
	fields?: Array<{ name: string; value: string; inline?: boolean }>;
	timestamp?: string;
}

/**
 * Builds a Discord webhook payload with a rich embed.
 * Exported for testing.
 */
export function buildDiscordEmbed(args: {
	event: "subscribe" | "unsubscribe";
	email: string;
	userName: string;
}): { embeds: DiscordEmbed[] } {
	const isSubscribe = args.event === "subscribe";

	return {
		embeds: [
			{
				title: isSubscribe
					? "New Premium Subscription"
					: "Premium Subscription Cancelled",
				description: isSubscribe
					? `**${args.userName}** just subscribed to Premium!`
					: `**${args.userName}** cancelled their Premium subscription.`,
				color: isSubscribe ? 0x0d9488 : 0xef4444,
				fields: [
					{ name: "Email", value: args.email, inline: true },
					{ name: "Event", value: isSubscribe ? "Subscribe" : "Unsubscribe", inline: true },
				],
				timestamp: new Date().toISOString(),
			},
		],
	};
}

/**
 * Sends a Discord webhook notification for subscription changes.
 * Silently skips if DISCORD_WEBHOOK_URL is not configured.
 */
export const sendSubscriptionNotification = internalAction({
	args: {
		event: v.union(v.literal("subscribe"), v.literal("unsubscribe")),
		email: v.string(),
		userName: v.string(),
	},
	handler: async (_ctx, args) => {
		const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

		if (!webhookUrl) {
			console.warn(
				"[Discord] DISCORD_WEBHOOK_URL not configured. Skipping notification.",
			);
			return;
		}

		const payload = buildDiscordEmbed(args);

		try {
			const response = await fetch(webhookUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				console.error(
					`[Discord] Webhook request failed: ${response.status} ${response.statusText}`,
				);
				return;
			}

			console.log(
				`[Discord] Sent ${args.event} notification for ${args.email}`,
			);
		} catch (error) {
			console.error("[Discord] Failed to send webhook:", error);
		}
	},
});
