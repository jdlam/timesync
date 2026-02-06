import { SignInButton, useUser } from "@clerk/clerk-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Loader2, LogIn, Shield } from "lucide-react";
import { useEffect } from "react";
import { UnauthorizedPage } from "@/components/admin/UnauthorizedPage";
import { Button } from "@/components/ui/button";
import { api } from "../../../convex/_generated/api";

export const Route = createFileRoute("/admin/")({
	component: AdminIndex,
});

function AdminIndex() {
	const { isLoaded, isSignedIn } = useUser();
	const navigate = useNavigate();
	const accessCheck = useQuery(api.admin.checkAccess);

	useEffect(() => {
		if (accessCheck?.isSuperAdmin) {
			navigate({ to: "/admin/dashboard" });
		}
	}, [accessCheck, navigate]);

	if (!isLoaded) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!isSignedIn) {
		return (
			<div className="min-h-screen flex items-center justify-center px-4">
				<div className="text-center max-w-md">
					<div className="mb-6">
						<Shield className="w-16 h-16 mx-auto text-teal-400" />
					</div>
					<h1 className="text-3xl font-bold mb-4">Admin Access Required</h1>
					<p className="text-muted-foreground mb-8">
						Sign in to access the super admin dashboard. Only authorized
						administrators can access this area.
					</p>
					<SignInButton mode="modal">
						<Button size="lg">
							<LogIn className="mr-2" size={20} />
							Sign In
						</Button>
					</SignInButton>
				</div>
			</div>
		);
	}

	// User is signed in but checking access
	if (accessCheck === undefined) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	// User is signed in but not a super admin
	if (!accessCheck.isSuperAdmin) {
		return <UnauthorizedPage email={accessCheck.email} />;
	}

	// Will redirect to dashboard via useEffect
	return (
		<div className="min-h-screen flex items-center justify-center">
			<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
		</div>
	);
}
