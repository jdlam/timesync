import { useUser } from "@clerk/clerk-react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useCallback } from "react";
import { api } from "../../convex/_generated/api";

export type SubscriptionTier = "free" | "premium";

export interface SubscriptionState {
	/** Whether the subscription data is loading */
	isLoading: boolean;
	/** Whether the user is authenticated */
	isAuthenticated: boolean;
	/** Current subscription tier */
	tier: SubscriptionTier;
	/** Whether user has premium access */
	isPremium: boolean;
	/** Whether user is a super admin (always has premium access) */
	isSuperAdmin: boolean;
	/** Stripe subscription ID if subscribed */
	subscriptionId: string | null;
	/** Subscription expiration timestamp */
	expiresAt: number | null;
}

export interface SubscriptionActions {
	/** Start checkout process to upgrade to premium */
	upgrade: () => Promise<void>;
	/** Open customer portal to manage subscription */
	manageSubscription: () => Promise<void>;
	/** Sync user record from Clerk (call after sign in) */
	syncUser: () => Promise<void>;
}

/**
 * Hook for managing user subscription state and actions
 */
export function useSubscription(): SubscriptionState & SubscriptionActions {
	const { isSignedIn, isLoaded } = useUser();
	const subscriptionData = useQuery(api.users.getCurrentUserSubscription);
	const getOrCreateUser = useMutation(api.users.getOrCreateUser);
	const createCheckoutSession = useAction(api.stripe.createCheckoutSession);
	const createPortalSession = useAction(api.stripe.createPortalSession);

	const isLoading = !isLoaded || (isSignedIn && subscriptionData === undefined);

	const syncUser = useCallback(async () => {
		if (isSignedIn) {
			await getOrCreateUser();
		}
	}, [isSignedIn, getOrCreateUser]);

	const upgrade = useCallback(async () => {
		if (!isSignedIn) {
			throw new Error("Please sign in to upgrade");
		}

		// Ensure user record exists
		await getOrCreateUser();

		const baseUrl = window.location.origin;
		const { url } = await createCheckoutSession({
			successUrl: `${baseUrl}/pricing?success=true`,
			cancelUrl: `${baseUrl}/pricing?canceled=true`,
		});

		// Redirect to Stripe Checkout
		window.location.href = url;
	}, [isSignedIn, getOrCreateUser, createCheckoutSession]);

	const manageSubscription = useCallback(async () => {
		if (!isSignedIn) {
			throw new Error("Please sign in first");
		}

		const baseUrl = window.location.origin;
		const { url } = await createPortalSession({
			returnUrl: `${baseUrl}/pricing`,
		});

		// Redirect to Stripe Customer Portal
		window.location.href = url;
	}, [isSignedIn, createPortalSession]);

	return {
		isLoading,
		isAuthenticated: isSignedIn ?? false,
		tier: subscriptionData?.tier ?? "free",
		isPremium: subscriptionData?.isPremium ?? false,
		isSuperAdmin: subscriptionData?.isSuperAdmin ?? false,
		subscriptionId: subscriptionData?.subscriptionId ?? null,
		expiresAt: subscriptionData?.expiresAt ?? null,
		upgrade,
		manageSubscription,
		syncUser,
	};
}
