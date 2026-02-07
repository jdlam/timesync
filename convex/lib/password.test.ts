import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

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
		const parts = hash.split(":");
		expect(parts).toHaveLength(2);
		// 16 bytes salt = 32 hex chars
		expect(parts[0]).toHaveLength(32);
		// SHA-256 = 32 bytes = 64 hex chars
		expect(parts[1]).toHaveLength(64);
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
	});
});
