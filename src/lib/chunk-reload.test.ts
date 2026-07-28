import { afterEach, describe, expect, it, vi } from "vitest";
import { hasAttemptedChunkReload, isChunkLoadError } from "./chunk-reload";

describe("isChunkLoadError", () => {
	it("matches the browser 'Importing a module script failed' message", () => {
		expect(
			isChunkLoadError(new Error("Importing a module script failed.")),
		).toBe(true);
	});

	it("matches dynamic import fetch failures", () => {
		expect(
			isChunkLoadError(
				new Error(
					"Failed to fetch dynamically imported module: https://x/create-abc.js",
				),
			),
		).toBe(true);
		expect(
			isChunkLoadError(new Error("error loading dynamically imported module")),
		).toBe(true);
	});

	it("matches classic chunk-load errors", () => {
		const err = new Error("Loading chunk 42 failed");
		expect(isChunkLoadError(err)).toBe(true);
		const named = new Error("boom");
		named.name = "ChunkLoadError";
		expect(isChunkLoadError(named)).toBe(true);
	});

	it("accepts string messages", () => {
		expect(isChunkLoadError("Importing a module script failed")).toBe(true);
	});

	it("ignores unrelated errors and empty input", () => {
		expect(
			isChunkLoadError(new Error("Cannot read properties of undefined")),
		).toBe(false);
		expect(isChunkLoadError(undefined)).toBe(false);
		expect(isChunkLoadError(null)).toBe(false);
	});
});

describe("hasAttemptedChunkReload", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		try {
			window.sessionStorage.clear();
		} catch {
			// ignore
		}
		window.history.replaceState(window.history.state, "", "/");
	});

	it("is false with no guard set", () => {
		expect(hasAttemptedChunkReload()).toBe(false);
	});

	it("is true when the sessionStorage flag is set", () => {
		window.sessionStorage.setItem("ts:chunk-reloaded", "1");
		expect(hasAttemptedChunkReload()).toBe(true);
	});

	it("is true when the URL guard param is present", () => {
		window.history.replaceState(window.history.state, "", "/?__chunk_reload=1");
		expect(hasAttemptedChunkReload()).toBe(true);
	});

	it("falls back to the URL param when sessionStorage throws", () => {
		vi.spyOn(window.sessionStorage, "getItem").mockImplementation(() => {
			throw new Error("storage disabled");
		});
		// No URL param → still safe (false), not a crash.
		expect(hasAttemptedChunkReload()).toBe(false);
		window.history.replaceState(window.history.state, "", "/?__chunk_reload=1");
		expect(hasAttemptedChunkReload()).toBe(true);
	});
});
