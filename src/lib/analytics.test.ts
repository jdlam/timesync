import { describe, expect, it } from "vitest";
import { getUmamiScriptConfig } from "./analytics";

describe("getUmamiScriptConfig", () => {
	const validScriptUrl = "https://analytics.example.com/script.js";
	const validWebsiteId = "abc123-website-id";

	it("should return script config when both URL and website ID are provided", () => {
		const result = getUmamiScriptConfig(validScriptUrl, validWebsiteId);

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			src: validScriptUrl,
			defer: true,
			"data-website-id": validWebsiteId,
			"data-auto-track": "false",
			"data-exclude-search": "true",
		});
	});

	it("should return empty array when script URL is undefined", () => {
		const result = getUmamiScriptConfig(undefined, validWebsiteId);

		expect(result).toEqual([]);
	});

	it("should return empty array when website ID is undefined", () => {
		const result = getUmamiScriptConfig(validScriptUrl, undefined);

		expect(result).toEqual([]);
	});

	it("should return empty array when both are undefined", () => {
		const result = getUmamiScriptConfig(undefined, undefined);

		expect(result).toEqual([]);
	});

	it("should return empty array when script URL is empty string", () => {
		const result = getUmamiScriptConfig("", validWebsiteId);

		expect(result).toEqual([]);
	});

	it("should return empty array when website ID is empty string", () => {
		const result = getUmamiScriptConfig(validScriptUrl, "");

		expect(result).toEqual([]);
	});
});
