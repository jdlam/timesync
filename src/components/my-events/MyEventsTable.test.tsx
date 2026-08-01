import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";

vi.mock("convex/react", () => ({
	useMutation: () => vi.fn(),
}));

const { MyEventsTable } = await import("./MyEventsTable");

function makeEvent(overrides: Record<string, unknown> = {}) {
	return {
		_id: "e1" as Id<"events">,
		title: "Design Review",
		isActive: true,
		createdAt: Date.parse("2026-01-15T00:00:00Z"),
		responseCount: 3,
		adminToken: "tok",
		...overrides,
	};
}

describe("MyEventsTable mobile card actions", () => {
	afterEach(() => cleanup());

	// The mobile card packs five action buttons into one row. Button carries
	// shrink-0, so without wrapping the row is wider than its card at a 320px
	// viewport and the last button renders outside the card border. The row must
	// stay able to reflow onto a second line.
	it("lets the action row wrap so it cannot overflow a narrow card", () => {
		render(
			<MyEventsTable events={[makeEvent()]} onViewEvent={() => undefined} />,
		);

		const viewButton = screen.getAllByRole("button", { name: /view/i })[0];
		const actionRow = viewButton.parentElement;

		expect(actionRow).toBeTruthy();
		expect(actionRow?.className).toContain("flex-wrap");
	});

	// Wrapping only helps if the buttons are actually allowed to occupy a second
	// line as siblings — a nested container would reintroduce the overflow.
	it("keeps every action button in the same wrapping row", () => {
		render(
			<MyEventsTable events={[makeEvent()]} onViewEvent={() => undefined} />,
		);

		const viewButton = screen.getAllByRole("button", { name: /view/i })[0];
		const actionRow = viewButton.parentElement;

		expect(actionRow?.children.length).toBe(5);
		for (const child of Array.from(actionRow?.children ?? [])) {
			expect(child.tagName).toBe("BUTTON");
		}
	});
});
