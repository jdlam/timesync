import { createContext, useContext, useEffect, useState } from "react";
import { getBrowserTimezone } from "./time-utils";

type DisplayMode = "event" | "local";

interface TimezoneDisplayContextType {
	displayMode: DisplayMode;
	setDisplayMode: (mode: DisplayMode) => void;
	eventTimezone: string;
	localTimezone: string;
	displayTimezone: string;
	timezonesMatch: boolean;
}

const TimezoneDisplayContext = createContext<
	TimezoneDisplayContextType | undefined
>(undefined);

interface TimezoneDisplayProviderProps {
	children: React.ReactNode;
	eventTimezone: string;
	eventId: string;
}

export function TimezoneDisplayProvider({
	children,
	eventTimezone,
	eventId,
}: TimezoneDisplayProviderProps) {
	const localTimezone = getBrowserTimezone();
	const timezonesMatch = eventTimezone === localTimezone;

	const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
		// Check localStorage for this event's preference
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem(`timezone-display-${eventId}`);
			if (stored === "event" || stored === "local") {
				return stored;
			}
		}
		// Default to event timezone
		return "event";
	});

	// Persist preference to localStorage
	useEffect(() => {
		localStorage.setItem(`timezone-display-${eventId}`, displayMode);
	}, [displayMode, eventId]);

	// Determine the actual display timezone based on mode
	const displayTimezone =
		displayMode === "local" ? localTimezone : eventTimezone;

	return (
		<TimezoneDisplayContext.Provider
			value={{
				displayMode,
				setDisplayMode,
				eventTimezone,
				localTimezone,
				displayTimezone,
				timezonesMatch,
			}}
		>
			{children}
		</TimezoneDisplayContext.Provider>
	);
}

export function useTimezoneDisplay() {
	const context = useContext(TimezoneDisplayContext);
	if (context === undefined) {
		throw new Error(
			"useTimezoneDisplay must be used within a TimezoneDisplayProvider",
		);
	}
	return context;
}

/**
 * Safe version of useTimezoneDisplay that returns undefined if not in a provider.
 * Use this for components that may or may not be wrapped in a TimezoneDisplayProvider.
 */
export function useTimezoneDisplaySafe() {
	return useContext(TimezoneDisplayContext);
}
