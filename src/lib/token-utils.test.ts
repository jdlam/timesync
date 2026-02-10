import { describe, expect, it } from "vitest";
import { isValidUUID } from "./token-utils";

describe("token-utils", () => {
	describe("isValidUUID", () => {
		it("should return true for valid UUID v4", () => {
			expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
			expect(isValidUUID("6ba7b810-9dad-41d4-80b4-00c04fd430c8")).toBe(true);
		});

		it("should return false for invalid UUIDs", () => {
			expect(isValidUUID("not-a-uuid")).toBe(false);
			expect(isValidUUID("550e8400-e29b-41d4-a716")).toBe(false);
			expect(isValidUUID("")).toBe(false);
		});

		it("should return false for wrong version UUIDs", () => {
			// Version 1 UUID (has '1' in version position)
			expect(isValidUUID("550e8400-e29b-11d4-a716-446655440000")).toBe(false);
		});

		it("should be case insensitive", () => {
			expect(isValidUUID("550E8400-E29B-41D4-A716-446655440000")).toBe(true);
			expect(isValidUUID("550e8400-E29B-41D4-a716-446655440000")).toBe(true);
		});
	});
});
