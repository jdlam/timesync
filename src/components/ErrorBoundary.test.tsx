import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the reload utilities so tests never actually navigate (jsdom can't).
vi.mock("@/lib/chunk-reload", () => ({
	isChunkLoadError: vi.fn(() => false),
	reloadForChunkError: vi.fn(() => true),
	clearChunkReloadGuard: vi.fn(),
}));

import { isChunkLoadError, reloadForChunkError } from "@/lib/chunk-reload";
import { ErrorBoundary } from "./ErrorBoundary";

const mockedIsChunk = vi.mocked(isChunkLoadError);
const mockedReload = vi.mocked(reloadForChunkError);

// A child that throws during render so the boundary catches it.
function Boom(): never {
	throw new Error("Importing a module script failed");
}

describe("ErrorBoundary", () => {
	beforeEach(() => {
		mockedIsChunk.mockReset().mockReturnValue(false);
		mockedReload.mockReset().mockReturnValue(true);
	});
	afterEach(() => cleanup());

	it("renders children when there is no error", () => {
		render(
			<ErrorBoundary>
				<div>hello</div>
			</ErrorBoundary>,
		);
		expect(screen.getByText("hello")).toBeTruthy();
	});

	it("reloads (guarded) and prevents default on a vite:preloadError event", () => {
		render(
			<ErrorBoundary>
				<div>ok</div>
			</ErrorBoundary>,
		);
		const event = new Event("vite:preloadError", { cancelable: true });
		window.dispatchEvent(event);
		expect(event.defaultPrevented).toBe(true);
		expect(mockedReload).toHaveBeenCalledTimes(1);
	});

	it("auto-reloads and shows update copy for a caught chunk-load error", () => {
		mockedIsChunk.mockReturnValue(true);
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		render(
			<ErrorBoundary>
				<Boom />
			</ErrorBoundary>,
		);
		expect(mockedReload).toHaveBeenCalled();
		expect(screen.getByText("A new version is available")).toBeTruthy();
		expect(screen.getByRole("button", { name: /Reload/ })).toBeTruthy();
		spy.mockRestore();
	});

	it("shows the generic error UI for non-chunk errors without reloading", () => {
		mockedIsChunk.mockReturnValue(false);
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		render(
			<ErrorBoundary>
				<Boom />
			</ErrorBoundary>,
		);
		expect(mockedReload).not.toHaveBeenCalled();
		expect(screen.getByText("Something went wrong")).toBeTruthy();
		expect(screen.getByRole("button", { name: /Try Again/ })).toBeTruthy();
		spy.mockRestore();
	});
});
