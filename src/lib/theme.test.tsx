import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ThemeProvider, useTheme } from "./theme";

// Mock matchMedia
const mockMatchMedia = (matches: boolean) => {
	return vi.fn().mockImplementation((query: string) => ({
		matches,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}));
};

describe("theme", () => {
	beforeEach(() => {
		// Clear localStorage
		localStorage.clear();
		// Reset document classes
		document.documentElement.classList.remove("light", "dark");
		// Default to light mode system preference
		window.matchMedia = mockMatchMedia(false);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("inline script behavior", () => {
		test("sets dark class when localStorage has dark theme", () => {
			localStorage.setItem("theme", "dark");

			// Simulate the inline script logic
			const stored = localStorage.getItem("theme");
			const theme = stored || "system";
			const isDark =
				theme === "dark" ||
				(theme === "system" &&
					window.matchMedia("(prefers-color-scheme: dark)").matches);
			document.documentElement.classList.add(isDark ? "dark" : "light");

			expect(document.documentElement.classList.contains("dark")).toBe(true);
			expect(document.documentElement.classList.contains("light")).toBe(false);
		});

		test("sets light class when localStorage has light theme", () => {
			localStorage.setItem("theme", "light");

			// Simulate the inline script logic
			const stored = localStorage.getItem("theme");
			const theme = stored || "system";
			const isDark =
				theme === "dark" ||
				(theme === "system" &&
					window.matchMedia("(prefers-color-scheme: dark)").matches);
			document.documentElement.classList.add(isDark ? "dark" : "light");

			expect(document.documentElement.classList.contains("light")).toBe(true);
			expect(document.documentElement.classList.contains("dark")).toBe(false);
		});

		test("respects system preference when no theme stored", () => {
			// System prefers dark
			window.matchMedia = mockMatchMedia(true);

			// Simulate the inline script logic
			const stored = localStorage.getItem("theme");
			const theme = stored || "system";
			const isDark =
				theme === "dark" ||
				(theme === "system" &&
					window.matchMedia("(prefers-color-scheme: dark)").matches);
			document.documentElement.classList.add(isDark ? "dark" : "light");

			expect(document.documentElement.classList.contains("dark")).toBe(true);
		});

		test("respects system preference light when no theme stored", () => {
			// System prefers light
			window.matchMedia = mockMatchMedia(false);

			// Simulate the inline script logic
			const stored = localStorage.getItem("theme");
			const theme = stored || "system";
			const isDark =
				theme === "dark" ||
				(theme === "system" &&
					window.matchMedia("(prefers-color-scheme: dark)").matches);
			document.documentElement.classList.add(isDark ? "dark" : "light");

			expect(document.documentElement.classList.contains("light")).toBe(true);
		});
	});

	describe("ThemeProvider", () => {
		const wrapper = ({ children }: { children: ReactNode }) => (
			<ThemeProvider>{children}</ThemeProvider>
		);

		test("reads existing dark class from document", () => {
			// Simulate inline script already ran and localStorage set
			document.documentElement.classList.add("dark");
			localStorage.setItem("theme", "dark");

			const { result } = renderHook(() => useTheme(), { wrapper });

			expect(result.current.effectiveTheme).toBe("dark");
		});

		test("reads existing light class from document", () => {
			// Simulate inline script already ran and localStorage set
			document.documentElement.classList.add("light");
			localStorage.setItem("theme", "light");

			const { result } = renderHook(() => useTheme(), { wrapper });

			expect(result.current.effectiveTheme).toBe("light");
		});

		test("defaults to system theme", () => {
			const { result } = renderHook(() => useTheme(), { wrapper });

			expect(result.current.theme).toBe("system");
		});

		test("reads stored theme from localStorage", () => {
			localStorage.setItem("theme", "dark");

			const { result } = renderHook(() => useTheme(), { wrapper });

			expect(result.current.theme).toBe("dark");
		});

		test("setTheme updates theme and localStorage", () => {
			const { result } = renderHook(() => useTheme(), { wrapper });

			act(() => {
				result.current.setTheme("dark");
			});

			expect(result.current.theme).toBe("dark");
			expect(localStorage.getItem("theme")).toBe("dark");
			expect(document.documentElement.classList.contains("dark")).toBe(true);
		});

		test("setTheme to light removes dark class", () => {
			document.documentElement.classList.add("dark");

			const { result } = renderHook(() => useTheme(), { wrapper });

			act(() => {
				result.current.setTheme("light");
			});

			expect(result.current.theme).toBe("light");
			expect(document.documentElement.classList.contains("light")).toBe(true);
			expect(document.documentElement.classList.contains("dark")).toBe(false);
		});

		test("system theme uses matchMedia preference", () => {
			window.matchMedia = mockMatchMedia(true); // System prefers dark

			const { result } = renderHook(() => useTheme(), { wrapper });

			act(() => {
				result.current.setTheme("system");
			});

			expect(result.current.effectiveTheme).toBe("dark");
		});
	});

	describe("useTheme hook", () => {
		test("throws error when used outside ThemeProvider", () => {
			// Suppress console.error for this test
			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			expect(() => {
				renderHook(() => useTheme());
			}).toThrow("useTheme must be used within a ThemeProvider");

			consoleSpy.mockRestore();
		});
	});
});
