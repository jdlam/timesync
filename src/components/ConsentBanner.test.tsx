import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConsentBanner } from "./ConsentBanner";

describe("ConsentBanner", () => {
	afterEach(() => cleanup());

	it("renders all three consent options", () => {
		render(<ConsentBanner onChoice={vi.fn()} />);
		expect(screen.getByRole("button", { name: "Accept all" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "Only necessary" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "Reject all" })).toBeTruthy();
	});

	it("emphasizes Accept all as the primary action", () => {
		render(<ConsentBanner onChoice={vi.fn()} />);
		expect(
			screen.getByRole("button", { name: "Accept all" }).className,
		).toContain("bg-primary");
	});

	it("de-emphasizes Reject all but keeps it a single visible click", () => {
		render(<ConsentBanner onChoice={vi.fn()} />);
		const rejectButton = screen.getByRole("button", { name: "Reject all" });
		expect(rejectButton.className).not.toContain("bg-primary");
		rejectButton.click();
		// A single click is all it takes - no confirmation step in between.
	});

	it("calls onChoice with 'all' when Accept all is clicked", () => {
		const onChoice = vi.fn();
		render(<ConsentBanner onChoice={onChoice} />);
		screen.getByRole("button", { name: "Accept all" }).click();
		expect(onChoice).toHaveBeenCalledWith("all");
	});

	it("calls onChoice with 'necessary' when Only necessary is clicked", () => {
		const onChoice = vi.fn();
		render(<ConsentBanner onChoice={onChoice} />);
		screen.getByRole("button", { name: "Only necessary" }).click();
		expect(onChoice).toHaveBeenCalledWith("necessary");
	});

	it("calls onChoice with 'none' when Reject all is clicked", () => {
		const onChoice = vi.fn();
		render(<ConsentBanner onChoice={onChoice} />);
		screen.getByRole("button", { name: "Reject all" }).click();
		expect(onChoice).toHaveBeenCalledWith("none");
	});

	it("meets the 44px touch target floor on every option", () => {
		render(<ConsentBanner onChoice={vi.fn()} />);
		for (const name of ["Accept all", "Only necessary", "Reject all"]) {
			expect(screen.getByRole("button", { name }).className).toContain(
				"min-h-[44px]",
			);
		}
	});
});
