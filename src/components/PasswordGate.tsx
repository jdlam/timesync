import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PasswordGateProps {
	eventTitle: string;
	wrongPassword: boolean;
	onSubmit: (password: string) => void;
	isLoading: boolean;
}

export function PasswordGate({
	eventTitle,
	wrongPassword,
	onSubmit,
	isLoading,
}: PasswordGateProps) {
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (password.trim()) {
			onSubmit(password);
		}
	};

	return (
		<div className="min-h-screen bg-background flex items-center justify-center px-4">
			<div className="w-full max-w-md">
				<div className="bg-card border border-border rounded-xl p-8 shadow-lg">
					<div className="flex flex-col items-center mb-6">
						<div className="w-12 h-12 bg-teal-500/10 rounded-full flex items-center justify-center mb-4">
							<Lock className="w-6 h-6 text-teal-500" />
						</div>
						<h1 className="text-2xl font-bold text-foreground text-center">
							Password Required
						</h1>
						<p className="text-muted-foreground text-center mt-2">
							Enter the password to access{" "}
							<span className="font-medium text-foreground">{eventTitle}</span>
						</p>
					</div>

					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="relative">
							<Input
								type={showPassword ? "text" : "password"}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="Enter event password"
								className="bg-background border-border text-foreground pr-10"
								autoFocus
								disabled={isLoading}
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
								tabIndex={-1}
							>
								{showPassword ? (
									<EyeOff className="w-4 h-4" />
								) : (
									<Eye className="w-4 h-4" />
								)}
							</button>
						</div>

						{wrongPassword && (
							<div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
								<p className="text-red-400 text-sm">
									Incorrect password. Please try again.
								</p>
							</div>
						)}

						<Button
							type="submit"
							className="w-full"
							disabled={isLoading || !password.trim()}
						>
							{isLoading ? (
								<>
									<Loader2 className="animate-spin" />
									Verifying...
								</>
							) : (
								"Enter Event"
							)}
						</Button>
					</form>
				</div>
			</div>
		</div>
	);
}
