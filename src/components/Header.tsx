import {
	SignedIn,
	SignedOut,
	SignInButton,
	UserButton,
} from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
	Calendar,
	CalendarDays,
	Crown,
	Home,
	LogIn,
	Menu,
	Shield,
	Sparkles,
	X,
} from "lucide-react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { useSubscription } from "../hooks/useSubscription";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/button";

export default function Header() {
	const [isOpen, setIsOpen] = useState(false);
	const accessCheck = useQuery(api.admin.checkAccess);
	const isSuperAdmin = accessCheck?.isSuperAdmin ?? false;
	const { isPremium } = useSubscription();

	return (
		<>
			<header className="bg-background border-b border-border sticky top-0 z-50 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80">
				<div className="container mx-auto px-4">
					<div className="flex items-center justify-between h-16">
						{/* Logo */}
						<Link
							to="/"
							className="flex items-center gap-2 text-white font-bold text-xl"
						>
							<Calendar className="w-8 h-8 text-cyan-400" />
							<span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
								TimeSync
							</span>
						</Link>

						{/* Desktop Navigation */}
						<nav className="hidden md:flex items-center gap-4">
							<Link
								to="/"
								className="text-muted-foreground hover:text-foreground transition-colors"
							>
								Home
							</Link>
							<Link
								to="/pricing"
								search={{ success: false, canceled: false }}
								className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
							>
								<Sparkles size={16} />
								Pricing
							</Link>
							<SignedIn>
								<Link
									to="/my-events"
									className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
								>
									<CalendarDays size={16} />
									My Events
								</Link>
							</SignedIn>
							{isSuperAdmin && (
								<Link
									to="/admin"
									className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
								>
									<Shield size={16} />
									Admin
								</Link>
							)}
							<ThemeToggle />
							<SignedOut>
								<SignInButton mode="modal">
									<Button variant="outline" size="sm">
										<LogIn size={16} className="mr-2" />
										Sign In
									</Button>
								</SignInButton>
							</SignedOut>
							<SignedIn>
								{isPremium ? (
									<span className="flex items-center gap-1 text-sm text-cyan-400 font-medium">
										<Crown size={14} />
										Premium
									</span>
								) : (
									<Link
										to="/pricing"
										search={{ success: false, canceled: false }}
									>
										<Button
											variant="outline"
											size="sm"
											className="border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-white"
										>
											<Crown size={14} className="mr-1" />
											Upgrade
										</Button>
									</Link>
								)}
								<UserButton afterSignOutUrl="/" />
							</SignedIn>
							<Link to="/events/create">
								<Button>Create Event</Button>
							</Link>
						</nav>

						{/* Mobile Navigation */}
						<div className="md:hidden flex items-center gap-2">
							<ThemeToggle />
							<SignedIn>
								<UserButton afterSignOutUrl="/" />
							</SignedIn>
							<button
								onClick={() => setIsOpen(true)}
								className="p-2 hover:bg-accent rounded-lg transition-colors text-muted-foreground cursor-pointer"
								aria-label="Open menu"
							>
								<Menu size={24} />
							</button>
						</div>
					</div>
				</div>
			</header>

			{/* Mobile Sidebar */}
			<aside
				className={`fixed top-0 left-0 h-full w-80 bg-card text-card-foreground shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col md:hidden ${
					isOpen ? "translate-x-0" : "-translate-x-full"
				}`}
			>
				<div className="flex items-center justify-between p-4 border-b border-border">
					<div className="flex items-center gap-2">
						<Calendar className="w-6 h-6 text-cyan-400" />
						<h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
							TimeSync
						</h2>
					</div>
					<button
						onClick={() => setIsOpen(false)}
						className="p-2 hover:bg-accent rounded-lg transition-colors cursor-pointer"
						aria-label="Close menu"
					>
						<X size={24} />
					</button>
				</div>

				<nav className="flex-1 p-4 overflow-y-auto">
					<Link
						to="/"
						onClick={() => setIsOpen(false)}
						className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors mb-2 text-muted-foreground"
						activeProps={{
							className:
								"flex items-center gap-3 p-3 rounded-lg bg-primary hover:bg-primary/90 transition-colors mb-2 text-primary-foreground",
						}}
					>
						<Home size={20} />
						<span className="font-medium">Home</span>
					</Link>

					<Link
						to="/pricing"
						search={{ success: false, canceled: false }}
						onClick={() => setIsOpen(false)}
						className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors mb-2 text-muted-foreground"
						activeProps={{
							className:
								"flex items-center gap-3 p-3 rounded-lg bg-primary hover:bg-primary/90 transition-colors mb-2 text-primary-foreground",
						}}
					>
						<Sparkles size={20} />
						<span className="font-medium">Pricing</span>
					</Link>

					<Link
						to="/events/create"
						onClick={() => setIsOpen(false)}
						className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors mb-2 text-muted-foreground"
						activeProps={{
							className:
								"flex items-center gap-3 p-3 rounded-lg bg-primary hover:bg-primary/90 transition-colors mb-2 text-primary-foreground",
						}}
					>
						<Calendar size={20} />
						<span className="font-medium">Create Event</span>
					</Link>

					<SignedIn>
						<Link
							to="/my-events"
							onClick={() => setIsOpen(false)}
							className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors mb-2 text-muted-foreground"
							activeProps={{
								className:
									"flex items-center gap-3 p-3 rounded-lg bg-primary hover:bg-primary/90 transition-colors mb-2 text-primary-foreground",
							}}
						>
							<CalendarDays size={20} />
							<span className="font-medium">My Events</span>
						</Link>

						{isPremium ? (
							<div className="flex items-center gap-3 p-3 rounded-lg bg-cyan-500/10 mb-2 text-cyan-400">
								<Crown size={20} />
								<span className="font-medium">Premium Member</span>
							</div>
						) : (
							<Link
								to="/pricing"
								search={{ success: false, canceled: false }}
								onClick={() => setIsOpen(false)}
								className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 hover:border-cyan-500 transition-colors mb-2 text-cyan-400"
							>
								<Crown size={20} />
								<span className="font-medium">Upgrade to Premium</span>
							</Link>
						)}
					</SignedIn>

					{isSuperAdmin && (
						<Link
							to="/admin"
							onClick={() => setIsOpen(false)}
							className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors mb-2 text-muted-foreground"
							activeProps={{
								className:
									"flex items-center gap-3 p-3 rounded-lg bg-primary hover:bg-primary/90 transition-colors mb-2 text-primary-foreground",
							}}
						>
							<Shield size={20} />
							<span className="font-medium">Admin</span>
						</Link>
					)}

					<SignedOut>
						<SignInButton mode="modal">
							<button
								type="button"
								className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors mb-2 text-muted-foreground w-full"
							>
								<LogIn size={20} />
								<span className="font-medium">Sign In</span>
							</button>
						</SignInButton>
					</SignedOut>
				</nav>
			</aside>

			{/* Overlay */}
			{isOpen && (
				<div
					className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
					onClick={() => setIsOpen(false)}
				/>
			)}
		</>
	);
}
