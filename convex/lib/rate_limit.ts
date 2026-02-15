import type { MutationCtx } from "../_generated/server";

interface RateLimitOptions {
	key: string;
	maxRequests: number;
	windowMs: number;
	errorMessage: string;
}

/**
 * Enforces a fixed-window rate limit using Convex storage.
 * The key should identify the actor/scope being limited.
 */
export async function enforceRateLimit(
	ctx: MutationCtx,
	options: RateLimitOptions,
): Promise<void> {
	const { key, maxRequests, windowMs, errorMessage } = options;
	const now = Date.now();

	const existing = await ctx.db
		.query("rateLimits")
		.withIndex("by_key", (q) => q.eq("key", key))
		.unique();

	if (!existing) {
		await ctx.db.insert("rateLimits", {
			key,
			count: 1,
			windowStart: now,
			updatedAt: now,
		});
		return;
	}

	const inSameWindow = now - existing.windowStart < windowMs;
	if (!inSameWindow) {
		await ctx.db.patch(existing._id, {
			count: 1,
			windowStart: now,
			updatedAt: now,
		});
		return;
	}

	if (existing.count >= maxRequests) {
		throw new Error(errorMessage);
	}

	await ctx.db.patch(existing._id, {
		count: existing.count + 1,
		updatedAt: now,
	});
}
