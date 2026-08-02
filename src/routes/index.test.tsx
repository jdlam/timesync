import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Capture the component passed to createFileRoute
let CapturedComponent: React.ComponentType;

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (opts: { component: React.ComponentType }) => {
		CapturedComponent = opts.component;
		return {};
	},
	Link: ({
		children,
		onClick,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		to: string;
	}) => (
		// biome-ignore lint/a11y/useValidAnchor: test double mirrors Link's real anchor output
		<a href="#" onClick={onClick}>
			{children}
		</a>
	),
}));

const trackEvent = vi.fn();
vi.mock("@/lib/analytics-events", () => ({
	trackEvent: (...args: unknown[]) => trackEvent(...args),
}));

// Import after mocks to capture the component
await import("./index");

describe("LandingPage", () => {
	afterEach(() => {
		cleanup();
		trackEvent.mockClear();
	});

	it("fires landing_cta_clicked with ctaLocation 'hero' for the hero CTA", () => {
		render(<CapturedComponent />);

		fireEvent.click(screen.getByRole("link", { name: "Create Event" }));

		expect(trackEvent).toHaveBeenCalledWith("landing_cta_clicked", {
			ctaLocation: "hero",
		});
	});

	it("fires landing_cta_clicked with ctaLocation 'how_it_works' for the mid-page CTA", () => {
		render(<CapturedComponent />);

		fireEvent.click(
			screen.getByRole("link", { name: "Create Your First Event" }),
		);

		expect(trackEvent).toHaveBeenCalledWith("landing_cta_clicked", {
			ctaLocation: "how_it_works",
		});
	});

	it("fires landing_cta_clicked with ctaLocation 'final_cta' for the footer CTA", () => {
		render(<CapturedComponent />);

		fireEvent.click(
			screen.getByRole("link", { name: "Get Started - It's Free" }),
		);

		expect(trackEvent).toHaveBeenCalledWith("landing_cta_clicked", {
			ctaLocation: "final_cta",
		});
	});
});
