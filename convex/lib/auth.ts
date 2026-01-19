import type { QueryCtx, MutationCtx } from "../_generated/server";

/**
 * Get the current user identity from Clerk
 * Returns null if not authenticated
 */
export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
	const identity = await ctx.auth.getUserIdentity();
	return identity;
}

/**
 * Check if the current user is a super admin
 * Super admins are defined by the SUPER_ADMIN_EMAILS environment variable
 */
export function isSuperAdmin(email: string | undefined): boolean {
	if (!email) return false;

	const superAdminEmails = process.env.SUPER_ADMIN_EMAILS?.split(",") || [];
	return superAdminEmails.some(
		(adminEmail) => adminEmail.trim().toLowerCase() === email.toLowerCase()
	);
}

/**
 * Require authentication and super admin status
 * Throws an error if user is not authenticated or not a super admin
 */
export async function requireSuperAdmin(ctx: QueryCtx | MutationCtx) {
	const identity = await ctx.auth.getUserIdentity();

	if (!identity) {
		throw new Error("Not authenticated");
	}

	const email = identity.email;
	if (!isSuperAdmin(email)) {
		throw new Error("Not authorized: Super admin access required");
	}

	return identity;
}

/**
 * Check if the current user is a super admin (for queries that need soft checks)
 * Returns the identity if super admin, null otherwise
 */
export async function checkSuperAdmin(ctx: QueryCtx | MutationCtx) {
	const identity = await ctx.auth.getUserIdentity();

	if (!identity) {
		return null;
	}

	if (!isSuperAdmin(identity.email)) {
		return null;
	}

	return identity;
}
