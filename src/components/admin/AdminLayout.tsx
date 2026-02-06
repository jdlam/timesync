import { useUser } from "@clerk/clerk-react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
	Activity,
	CalendarDays,
	LayoutDashboard,
	Loader2,
	MessageSquare,
	Shield,
} from "lucide-react";
import { type ReactNode, useEffect } from "react";
import { api } from "../../../convex/_generated/api";

interface AdminLayoutProps {
	children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
	const { isLoaded, isSignedIn } = useUser();
	const accessCheck = useQuery(api.admin.checkAccess);
	const location = useLocation();
	const navigate = useNavigate();

	// Redirect unauthorized users to /admin (which shows the error page)
	// Using replace: true prevents admin sub-routes from appearing in browser history
	const isUnauthorized =
		isLoaded &&
		accessCheck !== undefined &&
		(!isSignedIn || !accessCheck.isSuperAdmin);

	useEffect(() => {
		if (isUnauthorized && location.pathname !== "/admin") {
			navigate({ to: "/admin", replace: true });
		}
	}, [isUnauthorized, location.pathname, navigate]);

	const tabs = [
		{
			to: "/admin/dashboard",
			label: "Dashboard",
			icon: LayoutDashboard,
		},
		{
			to: "/admin/events",
			label: "Events",
			icon: CalendarDays,
		},
		{
			to: "/admin/responses",
			label: "Responses",
			icon: MessageSquare,
		},
		{
			to: "/admin/logs",
			label: "Audit Logs",
			icon: Activity,
		},
	];

	// Show loading while auth is loading or during redirect
	if (!isLoaded || accessCheck === undefined || isUnauthorized) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			{/* Admin Header */}
			<div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-16 z-40">
				<div className="container mx-auto px-4">
					<div className="flex items-center gap-2 py-3">
						<Shield className="w-5 h-5 text-teal-400" />
						<span className="font-semibold bg-gradient-to-r from-teal-500 to-emerald-500 bg-clip-text text-transparent">
							Super Admin
						</span>
						<span className="text-xs text-muted-foreground ml-2">
							{accessCheck.email}
						</span>
					</div>

					{/* Tabs - Scrollable on mobile */}
					<nav className="flex overflow-x-auto -mb-px scrollbar-none">
						{tabs.map((tab) => {
							const isActive = location.pathname === tab.to;
							return (
								<Link
									key={tab.to}
									to={tab.to}
									className={`flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap transition-colors ${
										isActive
											? "border-primary text-foreground"
											: "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
									}`}
								>
									<tab.icon className="w-4 h-4" />
									<span className="text-sm font-medium">{tab.label}</span>
								</Link>
							);
						})}
					</nav>
				</div>
			</div>

			{/* Content */}
			<main className="container mx-auto px-4 py-6">{children}</main>
		</div>
	);
}
