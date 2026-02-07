/**
 * Password hashing and verification using Web Crypto API.
 * Uses SHA-256 with a random 16-byte salt.
 * Storage format: "salt:hash" (both hex-encoded).
 */

function toHex(buffer: ArrayBuffer): string {
	return Array.from(new Uint8Array(buffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function fromHex(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
	}
	return bytes;
}

async function sha256(data: Uint8Array): Promise<ArrayBuffer> {
	return await crypto.subtle.digest("SHA-256", data as unknown as BufferSource);
}

/**
 * Hash a password with a random salt.
 * Returns "salt:hash" where both are hex strings.
 */
export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const encoder = new TextEncoder();
	const passwordBytes = encoder.encode(password);

	// Combine salt + password
	const combined = new Uint8Array(salt.length + passwordBytes.length);
	combined.set(salt);
	combined.set(passwordBytes, salt.length);

	const hash = await sha256(combined);
	return `${toHex(salt.buffer)}:${toHex(hash)}`;
}

/**
 * Verify a password against a stored "salt:hash" string.
 * Returns false for malformed stored hashes.
 */
export async function verifyPassword(
	password: string,
	storedHash: string,
): Promise<boolean> {
	const parts = storedHash.split(":");
	if (parts.length !== 2) return false;

	const [saltHex, hashHex] = parts;
	if (!saltHex || !hashHex) return false;

	// Validate hex lengths: 16 bytes salt = 32 hex chars, SHA-256 = 64 hex chars
	if (saltHex.length !== 32 || hashHex.length !== 64) return false;

	const salt = fromHex(saltHex);
	const encoder = new TextEncoder();
	const passwordBytes = encoder.encode(password);

	const combined = new Uint8Array(salt.length + passwordBytes.length);
	combined.set(salt);
	combined.set(passwordBytes, salt.length);

	const hash = await sha256(combined);
	const computedHex = toHex(hash);

	return computedHex === hashHex;
}
