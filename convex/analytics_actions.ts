import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { sendToPostHog } from "./lib/analytics";

/**
 * Internal action so mutations (which cannot fetch) can schedule a
 * fire-and-forget PostHog capture via `ctx.scheduler.runAfter(0, ...)` — the
 * same scheduling pattern used for the "event created" / "response
 * submitted" emails in email_actions.ts. `properties` is a flat, generic
 * string-keyed record (not a per-event discriminated union): Convex rejects
 * a union at the top level of `args` (see the comment on
 * sendResponseNotification in email_actions.ts), and that constraint applies
 * transitively to any nested union too, so callers narrow to the documented
 * shape per event name before scheduling.
 */
export const capture = internalAction({
	args: {
		event: v.string(),
		distinctId: v.string(),
		properties: v.optional(
			v.record(v.string(), v.union(v.string(), v.number(), v.boolean())),
		),
	},
	handler: async (_ctx, args) => {
		await sendToPostHog(args.event, args.distinctId, args.properties);
	},
});
