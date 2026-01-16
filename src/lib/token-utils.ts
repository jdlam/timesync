import { randomUUID } from "crypto";

/**
 * Generate a secure admin token for event admin access
 * Uses UUID v4 for cryptographically secure random tokens
 * @returns UUID string
 */
export function generateAdminToken(): string {
	return randomUUID();
}

/**
 * Generate a secure edit token for response editing
 * Uses UUID v4 for cryptographically secure random tokens
 * @returns UUID string
 */
export function generateEditToken(): string {
	return randomUUID();
}

/**
 * Validate UUID format
 * @param token - Token string to validate
 * @returns true if valid UUID format
 */
export function isValidUUID(token: string): boolean {
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(token);
}
