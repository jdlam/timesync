import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

async function hashPasswordLegacy(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const passwordBytes = new TextEncoder().encode(password);

	const combined = new Uint8Array(salt.length + passwordBytes.length);
	combined.set(salt);
	combined.set(passwordBytes, salt.length);

	const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", combined));
	const toHex = (bytes: Uint8Array) =>
		Array.from(bytes)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");

	return `${toHex(salt)}:${toHex(digest)}`;
}

describe("password utilities", () => {
	it("should hash and verify a correct password", async () => {
		const password = "mySecurePassword";
		const hash = await hashPassword(password);
		const isValid = await verifyPassword(password, hash);
		expect(isValid).toBe(true);
	});

	it("should reject an incorrect password", async () => {
		const hash = await hashPassword("correctPassword");
		const isValid = await verifyPassword("wrongPassword", hash);
		expect(isValid).toBe(false);
	});

	it("should produce different hashes for the same password (salt uniqueness)", async () => {
		const password = "samePassword";
		const hash1 = await hashPassword(password);
		const hash2 = await hashPassword(password);
		expect(hash1).not.toBe(hash2);

		// Both should still verify correctly
		expect(await verifyPassword(password, hash1)).toBe(true);
		expect(await verifyPassword(password, hash2)).toBe(true);
	});

	it("should produce hash in salt:hash format with correct hex lengths", async () => {
		const hash = await hashPassword("test");
		const parts = hash.split("$");
		expect(parts).toHaveLength(4);
		expect(parts[0]).toBe("pbkdf2_sha256");
		expect(Number(parts[1])).toBeGreaterThan(0);
		expect(parts[2]).toHaveLength(32);
		expect(parts[3]).toHaveLength(64);
	});

	it("should handle empty string password", async () => {
		const hash = await hashPassword("");
		expect(await verifyPassword("", hash)).toBe(true);
		expect(await verifyPassword("notempty", hash)).toBe(false);
	});

	it("should return false for malformed stored hash", async () => {
		expect(await verifyPassword("test", "not-a-valid-hash")).toBe(false);
		expect(await verifyPassword("test", "")).toBe(false);
		expect(await verifyPassword("test", "abc:def")).toBe(false);
		expect(await verifyPassword("test", ":")).toBe(false);
		expect(await verifyPassword("test", "pbkdf2_sha256$bad$abcd$abcd")).toBe(
			false,
		);
		expect(await verifyPassword("test", "pbkdf2_sha256$10000$zzzz$abcd")).toBe(
			false,
		);
	});

	it("should verify legacy salt:hash passwords for backward compatibility", async () => {
		const legacyHash = await hashPasswordLegacy("legacy-password");
		expect(await verifyPassword("legacy-password", legacyHash)).toBe(true);
		expect(await verifyPassword("wrong-password", legacyHash)).toBe(false);
	});
});
