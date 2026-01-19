import { useUser } from "@clerk/clerk-react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { CalendarDays, Loader2 } from "lucide-react";
import { type ReactNode, useEffect } from "react";

interface MyEventsLayoutProps {
	children: ReactNode;
}

export function MyEventsLayout({ children }: MyEventsLayoutProps) {
	const { isLoaded, isSignedIn, user } = useUser();
	const location = useLocation();
	const navigate = useNavigate();

	// Redirect unauthenticated users to /my-events (which shows sign in prompt)
	const isUnauthorized = isLoaded && !isSignedIn;

	useEffect(() => {
		if (isUnauthorized && location.pathname !== "/my-events") {
			navigate({ to: "/my-events", replace: true });
		}
	}, [isUnauthorized, location.pathname, navigate]);

	// Show loading while auth is loading or during redirect
	if (!isLoaded || isUnauthorized) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			{/* My Events Header */}
			<div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-16 z-40">
				<div className="container mx-auto px-4">
					<div className="flex items-center gap-2 py-3">
						<CalendarDays className="w-5 h-5 text-cyan-400" />
						<span className="font-semibold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
							My Events
						</span>
						<span className="text-xs text-muted-foreground ml-2">
							{user?.primaryEmailAddress?.emailAddress}
						</span>
					</div>

					{/* Single tab for events list */}
					<nav className="flex overflow-x-auto -mb-px scrollbar-none">
						<Link
							to="/my-events"
							className={`flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap transition-colors ${
								location.pathname === "/my-events"
									? "border-primary text-foreground"
									: "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
							}`}
						>
							<CalendarDays className="w-4 h-4" />
							<span className="text-sm font-medium">Events</span>
						</Link>
					</nav>
				</div>
			</div>

			{/* Content */}
			<main className="container mx-auto px-4 py-6">{children}</main>
		</div>
	);
}
