/**
 * Environment variable validation
 *
 * This module validates that all required environment variables are set.
 * It should be imported early in the app startup to fail fast if something is missing.
 */

interface EnvConfig {
	VITE_CONVEX_URL: string;
	VITE_CLERK_PUBLISHABLE_KEY: string;
	VITE_STRIPE_PUBLISHABLE_KEY: string | undefined;
}

function validateEnv(): EnvConfig {
	const requiredVars = [
		"VITE_CONVEX_URL",
		"VITE_CLERK_PUBLISHABLE_KEY",
	] as const;

	const missing: string[] = [];

	for (const varName of requiredVars) {
		if (!import.meta.env[varName]) {
			missing.push(varName);
		}
	}

	if (missing.length > 0) {
		throw new Error(
			`Missing required environment variables:\n${missing.map((v) => `  - ${v}`).join("\n")}\n\n` +
				"Please check your .env.local file or environment configuration.",
		);
	}

	return {
		VITE_CONVEX_URL: import.meta.env.VITE_CONVEX_URL,
		VITE_CLERK_PUBLISHABLE_KEY: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
		VITE_STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
	};
}

// Validate and export env vars
// This runs at module load time, so missing vars will throw immediately
export const env = validateEnv();
