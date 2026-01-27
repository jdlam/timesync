import { SignInButton, useUser } from "@clerk/clerk-react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { Check, Crown, X } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { TIER_LIMITS } from "@/lib/tier-config";

export const Route = createFileRoute("/pricing")({
	component: PricingPage,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			success: search.success === "true",
			canceled: search.canceled === "true",
		};
	},
});

function PricingPage() {
	const { isSignedIn } = useUser();
	const { isPremium, isLoading, upgrade, manageSubscription, syncUser } =
		useSubscription();
	const { success, canceled } = useSearch({ from: "/pricing" });

	// Sync user on page load (creates user record if needed)
	useEffect(() => {
		if (isSignedIn) {
			syncUser();
		}
	}, [isSignedIn, syncUser]);

	// Show success/canceled messages
	useEffect(() => {
		if (success) {
			toast.success(
				"Welcome to TimeSync Premium! Your subscription is now active.",
			);
			// Clear URL params
			window.history.replaceState({}, "", "/pricing");
		} else if (canceled) {
			toast.info("Checkout was canceled. No charges were made.");
			// Clear URL params
			window.history.replaceState({}, "", "/pricing");
		}
	}, [success, canceled]);

	const handleUpgrade = async () => {
		try {
			await upgrade();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to start checkout";
			toast.error(message);
		}
	};

	const handleManageSubscription = async () => {
		try {
			await manageSubscription();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to open portal";
			toast.error(message);
		}
	};

	const features = [
		{
			name: "Maximum dates per event",
			free: `${TIER_LIMITS.free.maxDates} dates`,
			premium: `${TIER_LIMITS.premium.maxDates} dates`,
		},
		{
			name: "Maximum participants",
			free: `${TIER_LIMITS.free.maxParticipants} people`,
			premium: "Unlimited",
		},
		{
			name: "CSV export",
			free: false,
			premium: true,
		},
		{
			name: "Password protection",
			free: false,
			premium: true,
		},
		{
			name: "Custom branding",
			free: false,
			premium: true,
		},
		{
			name: "Priority support",
			free: false,
			premium: true,
		},
	];

	return (
		<div className="min-h-screen bg-gradient-to-b from-background via-muted to-background py-16 px-4">
			<div className="max-w-5xl mx-auto">
				{/* Header */}
				<div className="text-center mb-12">
					<h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
						Simple, Transparent Pricing
					</h1>
					<p className="text-xl text-muted-foreground max-w-2xl mx-auto">
						Start free, upgrade when you need more power
					</p>
				</div>

				{/* Pricing Cards */}
				<div className="grid md:grid-cols-2 gap-8 mb-16">
					{/* Free Tier */}
					<div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
						<div className="mb-6">
							<h2 className="text-2xl font-bold text-foreground mb-2">Free</h2>
							<p className="text-muted-foreground">
								Perfect for casual scheduling
							</p>
						</div>
						<div className="mb-6">
							<span className="text-4xl font-bold text-foreground">$0</span>
							<span className="text-muted-foreground">/month</span>
						</div>
						<ul className="space-y-4 mb-8">
							<li className="flex items-center gap-3">
								<Check className="w-5 h-5 text-green-500 flex-shrink-0" />
								<span className="text-foreground">
									Up to {TIER_LIMITS.free.maxDates} dates per event
								</span>
							</li>
							<li className="flex items-center gap-3">
								<Check className="w-5 h-5 text-green-500 flex-shrink-0" />
								<span className="text-foreground">
									Up to {TIER_LIMITS.free.maxParticipants} participants
								</span>
							</li>
							<li className="flex items-center gap-3">
								<Check className="w-5 h-5 text-green-500 flex-shrink-0" />
								<span className="text-foreground">Visual heatmap</span>
							</li>
							<li className="flex items-center gap-3">
								<Check className="w-5 h-5 text-green-500 flex-shrink-0" />
								<span className="text-foreground">No account required</span>
							</li>
							<li className="flex items-center gap-3 text-muted-foreground">
								<X className="w-5 h-5 flex-shrink-0" />
								<span>CSV export</span>
							</li>
							<li className="flex items-center gap-3 text-muted-foreground">
								<X className="w-5 h-5 flex-shrink-0" />
								<span>Password protection</span>
							</li>
						</ul>
						{!isPremium && (
							<Button variant="outline" className="w-full" disabled>
								Current Plan
							</Button>
						)}
					</div>

					{/* Premium Tier */}
					<div className="bg-card border-2 border-cyan-500 rounded-2xl p-8 shadow-lg shadow-cyan-500/10 relative">
						<div className="absolute -top-4 left-1/2 -translate-x-1/2">
							<span className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
								<Crown className="w-4 h-4" /> Most Popular
							</span>
						</div>
						<div className="mb-6">
							<h2 className="text-2xl font-bold text-foreground mb-2">
								Premium
							</h2>
							<p className="text-muted-foreground">For power users and teams</p>
						</div>
						<div className="mb-6">
							<span className="text-4xl font-bold text-foreground">$5</span>
							<span className="text-muted-foreground">/month</span>
						</div>
						<ul className="space-y-4 mb-8">
							<li className="flex items-center gap-3">
								<Check className="w-5 h-5 text-cyan-500 flex-shrink-0" />
								<span className="text-foreground">
									Up to {TIER_LIMITS.premium.maxDates} dates per event
								</span>
							</li>
							<li className="flex items-center gap-3">
								<Check className="w-5 h-5 text-cyan-500 flex-shrink-0" />
								<span className="text-foreground">Unlimited participants</span>
							</li>
							<li className="flex items-center gap-3">
								<Check className="w-5 h-5 text-cyan-500 flex-shrink-0" />
								<span className="text-foreground">CSV export</span>
							</li>
							<li className="flex items-center gap-3">
								<Check className="w-5 h-5 text-cyan-500 flex-shrink-0" />
								<span className="text-foreground">Password protection</span>
							</li>
							<li className="flex items-center gap-3">
								<Check className="w-5 h-5 text-cyan-500 flex-shrink-0" />
								<span className="text-foreground">Custom branding</span>
							</li>
							<li className="flex items-center gap-3">
								<Check className="w-5 h-5 text-cyan-500 flex-shrink-0" />
								<span className="text-foreground">Priority support</span>
							</li>
						</ul>
						{isLoading ? (
							<Button className="w-full" disabled>
								Loading...
							</Button>
						) : isPremium ? (
							<Button
								variant="outline"
								className="w-full"
								onClick={handleManageSubscription}
							>
								Manage Subscription
							</Button>
						) : isSignedIn ? (
							<Button
								className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
								onClick={handleUpgrade}
							>
								Upgrade to Premium
							</Button>
						) : (
							<SignInButton mode="modal">
								<Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
									Sign in to Upgrade
								</Button>
							</SignInButton>
						)}
					</div>
				</div>

				{/* Feature Comparison Table */}
				<div className="bg-card border border-border rounded-2xl overflow-hidden">
					<div className="p-6 border-b border-border">
						<h3 className="text-xl font-bold text-foreground">
							Feature Comparison
						</h3>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b border-border">
									<th className="text-left p-4 text-muted-foreground font-medium">
										Feature
									</th>
									<th className="text-center p-4 text-muted-foreground font-medium">
										Free
									</th>
									<th className="text-center p-4 text-muted-foreground font-medium">
										Premium
									</th>
								</tr>
							</thead>
							<tbody>
								{features.map((feature) => (
									<tr
										key={feature.name}
										className="border-b border-border last:border-0"
									>
										<td className="p-4 text-foreground">{feature.name}</td>
										<td className="p-4 text-center">
											{typeof feature.free === "boolean" ? (
												feature.free ? (
													<Check className="w-5 h-5 text-green-500 mx-auto" />
												) : (
													<X className="w-5 h-5 text-muted-foreground mx-auto" />
												)
											) : (
												<span className="text-foreground">{feature.free}</span>
											)}
										</td>
										<td className="p-4 text-center">
											{typeof feature.premium === "boolean" ? (
												feature.premium ? (
													<Check className="w-5 h-5 text-cyan-500 mx-auto" />
												) : (
													<X className="w-5 h-5 text-muted-foreground mx-auto" />
												)
											) : (
												<span className="text-foreground font-medium">
													{feature.premium}
												</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

				{/* FAQ Section */}
				<div className="mt-16">
					<h3 className="text-2xl font-bold text-foreground text-center mb-8">
						Frequently Asked Questions
					</h3>
					<div className="grid md:grid-cols-2 gap-6">
						<div className="bg-card border border-border rounded-xl p-6">
							<h4 className="font-semibold text-foreground mb-2">
								Can I cancel anytime?
							</h4>
							<p className="text-muted-foreground">
								Yes! You can cancel your subscription at any time. You'll
								continue to have Premium access until the end of your billing
								period.
							</p>
						</div>
						<div className="bg-card border border-border rounded-xl p-6">
							<h4 className="font-semibold text-foreground mb-2">
								What payment methods do you accept?
							</h4>
							<p className="text-muted-foreground">
								We accept all major credit cards through Stripe, including Visa,
								Mastercard, and American Express.
							</p>
						</div>
						<div className="bg-card border border-border rounded-xl p-6">
							<h4 className="font-semibold text-foreground mb-2">
								Do I need an account to use TimeSync?
							</h4>
							<p className="text-muted-foreground">
								No! You can create events and collect responses without an
								account. An account is only required for Premium features.
							</p>
						</div>
						<div className="bg-card border border-border rounded-xl p-6">
							<h4 className="font-semibold text-foreground mb-2">
								What happens to my events if I downgrade?
							</h4>
							<p className="text-muted-foreground">
								Your existing events will continue to work, but you won't be
								able to create new Premium events or access Premium-only
								features.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
