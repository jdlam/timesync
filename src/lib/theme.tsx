import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	effectiveTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, setTheme] = useState<Theme>(() => {
		// Check localStorage first
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem("theme") as Theme;
			if (stored) return stored;
		}
		return "system";
	});

	const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">(() => {
		if (typeof window !== "undefined") {
			return window.matchMedia("(prefers-color-scheme: dark)").matches
				? "dark"
				: "light";
		}
		return "light";
	});

	useEffect(() => {
		const root = window.document.documentElement;

		// Remove both classes first
		root.classList.remove("light", "dark");

		if (theme === "system") {
			const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
				.matches
				? "dark"
				: "light";
			root.classList.add(systemTheme);
			setEffectiveTheme(systemTheme);
		} else {
			root.classList.add(theme);
			setEffectiveTheme(theme);
		}

		// Save to localStorage
		localStorage.setItem("theme", theme);
	}, [theme]);

	// Listen for system theme changes
	useEffect(() => {
		if (theme !== "system") return;

		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const handleChange = (e: MediaQueryListEvent) => {
			const newTheme = e.matches ? "dark" : "light";
			setEffectiveTheme(newTheme);
			const root = window.document.documentElement;
			root.classList.remove("light", "dark");
			root.classList.add(newTheme);
		};

		mediaQuery.addEventListener("change", handleChange);
		return () => mediaQuery.removeEventListener("change", handleChange);
	}, [theme]);

	// Listen for storage changes from other tabs
	useEffect(() => {
		const handleStorageChange = (e: StorageEvent) => {
			if (e.key === "theme" && e.newValue) {
				const newTheme = e.newValue as Theme;
				if (["light", "dark", "system"].includes(newTheme)) {
					setTheme(newTheme);
				}
			}
		};

		window.addEventListener("storage", handleStorageChange);
		return () => window.removeEventListener("storage", handleStorageChange);
	}, []);

	return (
		<ThemeContext.Provider value={{ theme, setTheme, effectiveTheme }}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme() {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
}
