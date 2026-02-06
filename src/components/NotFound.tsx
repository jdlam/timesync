import { Link } from "@tanstack/react-router";
import { AlertCircle, Home } from "lucide-react";
import { Button } from "./ui/button";

interface NotFoundProps {
	title?: string;
	message?: string;
}

export function NotFound({
	title = "404 - Not Found",
	message = "The page you're looking for doesn't exist.",
}: NotFoundProps) {
	return (
		<div className="min-h-screen bg-background flex items-center justify-center px-4">
			<div className="max-w-md w-full text-center">
				<AlertCircle className="w-16 h-16 text-teal-400 mx-auto mb-4" />
				<h1 className="text-4xl font-bold text-foreground mb-2">{title}</h1>
				<p className="text-lg text-muted-foreground mb-8">{message}</p>
				<Link to="/">
					<Button>
						<Home className="w-4 h-4" />
						Go Home
					</Button>
				</Link>
			</div>
		</div>
	);
}
