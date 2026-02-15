/**
 * Password hashing and verification using Web Crypto API.
 *
 * Current storage format: "pbkdf2_sha256$iterations$salt$hash" (hex-encoded)
 * Legacy storage format (still accepted for verification): "salt:hash" (hex-encoded)
 */

const SALT_LENGTH_BYTES = 16;
const HASH_LENGTH_BYTES = 32;
const PBKDF2_ITERATIONS = 210_000;
const PBKDF2_SCHEME = "pbkdf2_sha256";

function toHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function fromHex(hex: string): Uint8Array | null {
	if (hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {
		return null;
	}

	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
	}
	return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) {
		return false;
	}

	let diff = 0;
	for (let i = 0; i < a.length; i++) {
		diff |= a[i] ^ b[i];
	}
	return diff === 0;
}

async function sha256(data: Uint8Array): Promise<ArrayBuffer> {
	return await crypto.subtle.digest("SHA-256", data as unknown as BufferSource);
}

async function derivePbkdf2Hash(
	password: string,
	salt: Uint8Array,
	iterations: number,
): Promise<Uint8Array> {
	const encoder = new TextEncoder();
	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		encoder.encode(password),
		"PBKDF2",
		false,
		["deriveBits"],
	);

	const bits = await crypto.subtle.deriveBits(
		{
			name: "PBKDF2",
			salt: salt as unknown as BufferSource,
			iterations,
			hash: "SHA-256",
		},
		keyMaterial,
		HASH_LENGTH_BYTES * 8,
	);

	return new Uint8Array(bits);
}

/**
 * Hash a password with PBKDF2-HMAC-SHA256 + random salt.
 */
export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));
	const hash = await derivePbkdf2Hash(password, salt, PBKDF2_ITERATIONS);
	return `${PBKDF2_SCHEME}$${PBKDF2_ITERATIONS}$${toHex(salt)}$${toHex(hash)}`;
}

async function verifyLegacyHash(
	password: string,
	storedHash: string,
): Promise<boolean> {
	const parts = storedHash.split(":");
	if (parts.length !== 2) return false;

	const [saltHex, hashHex] = parts;
	if (!saltHex || !hashHex) return false;
	if (saltHex.length !== 32 || hashHex.length !== 64) return false;

	const salt = fromHex(saltHex);
	const expectedHash = fromHex(hashHex);
	if (!salt || !expectedHash) {
		return false;
	}

	const encoder = new TextEncoder();
	const passwordBytes = encoder.encode(password);
	const combined = new Uint8Array(salt.length + passwordBytes.length);
	combined.set(salt);
	combined.set(passwordBytes, salt.length);

	const hash = new Uint8Array(await sha256(combined));
	return timingSafeEqual(hash, expectedHash);
}

/**
 * Verify a password against a stored hash.
 * Supports both current PBKDF2 and legacy salt:sha256 formats.
 * Returns false for malformed stored hashes.
 */
export async function verifyPassword(
	password: string,
	storedHash: string,
): Promise<boolean> {
	const pbkdf2Parts = storedHash.split("$");
	if (pbkdf2Parts.length === 4) {
		const [scheme, iterationStr, saltHex, hashHex] = pbkdf2Parts;
		if (scheme !== PBKDF2_SCHEME || !iterationStr || !saltHex || !hashHex) {
			return false;
		}

		const iterations = Number.parseInt(iterationStr, 10);
		if (!Number.isSafeInteger(iterations) || iterations <= 0) {
			return false;
		}

		const salt = fromHex(saltHex);
		const expectedHash = fromHex(hashHex);
		if (!salt || !expectedHash) {
			return false;
		}
		if (
			salt.length !== SALT_LENGTH_BYTES ||
			expectedHash.length !== HASH_LENGTH_BYTES
		) {
			return false;
		}

		const computedHash = await derivePbkdf2Hash(password, salt, iterations);
		return timingSafeEqual(computedHash, expectedHash);
	}

	return await verifyLegacyHash(password, storedHash);
}
