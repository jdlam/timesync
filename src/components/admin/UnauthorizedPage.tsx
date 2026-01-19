import { Link } from "@tanstack/react-router";
import { Home, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UnauthorizedPageProps {
	email?: string;
}

const isDevelopment = import.meta.env.DEV;

export function UnauthorizedPage({ email }: UnauthorizedPageProps) {
	return (
		<div className="min-h-screen flex items-center justify-center px-4">
			<div className="text-center max-w-md">
				<div className="mb-6">
					<ShieldAlert className="w-16 h-16 mx-auto text-destructive" />
				</div>
				<h1 className="text-3xl font-bold mb-4">Access Denied</h1>
				<p className="text-muted-foreground mb-6">
					You don't have permission to access this page.
				</p>

				{/* Only show email in development for debugging */}
				{isDevelopment && email && (
					<p className="text-sm text-muted-foreground mb-6 p-3 bg-muted rounded-lg">
						<span className="font-medium">Debug info:</span> Signed in as{" "}
						{email}
					</p>
				)}

				<Link to="/">
					<Button variant="outline">
						<Home className="w-4 h-4 mr-2" />
						Return Home
					</Button>
				</Link>
			</div>
		</div>
	);
}
