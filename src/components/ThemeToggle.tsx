import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "@/lib/theme";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export function ThemeToggle() {
	const { theme, setTheme, effectiveTheme } = useTheme();
	// Prevent hydration mismatch by only rendering theme-dependent content after mount
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="text-muted-foreground hover:text-foreground hover:bg-accent"
					aria-label="Toggle theme"
				>
					{!mounted ? (
						// Render a placeholder with same dimensions during SSR/hydration
						<div className="h-5 w-5" />
					) : effectiveTheme === "dark" ? (
						<Moon className="h-5 w-5" />
					) : (
						<Sun className="h-5 w-5" />
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-40 p-2 bg-card border-border">
				<div className="space-y-1">
					<button
						onClick={() => setTheme("light")}
						className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
							theme === "light"
								? "bg-teal-600 text-white"
								: "hover:bg-accent text-foreground"
						}`}
					>
						<Sun className="h-4 w-4" />
						<span>Light</span>
					</button>
					<button
						onClick={() => setTheme("dark")}
						className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
							theme === "dark"
								? "bg-teal-600 text-white"
								: "hover:bg-accent text-foreground"
						}`}
					>
						<Moon className="h-4 w-4" />
						<span>Dark</span>
					</button>
					<button
						onClick={() => setTheme("system")}
						className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
							theme === "system"
								? "bg-teal-600 text-white"
								: "hover:bg-accent text-foreground"
						}`}
					>
						<Monitor className="h-4 w-4" />
						<span>System</span>
					</button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
