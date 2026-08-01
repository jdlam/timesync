import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";

vi.mock("convex/react", () => ({
	useMutation: () => vi.fn(),
}));

// Radix popovers call pointer-capture APIs that jsdom does not implement.
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.setPointerCapture ??= () => undefined;
Element.prototype.releasePointerCapture ??= () => undefined;
Element.prototype.scrollIntoView ??= () => undefined;

const { EventActionsMenu, MyEventsTable } = await import("./MyEventsTable");

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

function renderTable() {
	render(
		<MyEventsTable events={[makeEvent()]} onViewEvent={() => undefined} />,
	);
}

function renderMenu(touch: boolean) {
	render(
		<EventActionsMenu
			event={makeEvent()}
			open
			onOpenChange={() => undefined}
			isLoading={false}
			onView={() => undefined}
			onViewResults={() => undefined}
			onViewPublicPage={() => undefined}
			onToggleStatus={() => undefined}
			onDelete={() => undefined}
			touch={touch}
		/>,
	);
}

const ACTION_LABELS = [
	"View Details",
	"View Results",
	"View Public Page",
	"Deactivate",
	"Delete",
];

describe("EventActionsMenu", () => {
	afterEach(() => cleanup());

	// Mobile previously splayed all five actions as unlabelled 32px icon buttons
	// while desktop got a labelled menu. Both surfaces now share this component,
	// so a touch user reads action names instead of guessing at icons.
	it.each([
		["touch", true],
		["pointer", false],
	])("names every action on the %s surface", (_name, touch) => {
		renderMenu(touch as boolean);
		for (const label of ACTION_LABELS) {
			expect(screen.getByText(label)).toBeTruthy();
		}
	});

	// A mistap here toggles or deletes a live event, so per style guide 4.1 this
	// is a selection surface and its rows must meet the 44px floor on touch.
	it("sizes menu rows to the 44px floor on touch only", () => {
		renderMenu(true);
		for (const label of ACTION_LABELS) {
			expect(screen.getByText(label).closest("button")?.className).toContain(
				"min-h-[44px]",
			);
		}

		cleanup();
		renderMenu(false);
		for (const label of ACTION_LABELS) {
			expect(
				screen.getByText(label).closest("button")?.className,
			).not.toContain("min-h-[44px]");
		}
	});
});

describe("MyEventsTable mobile card", () => {
	afterEach(() => cleanup());

	// Both surfaces must render the shared menu rather than diverging again.
	it("renders one actions menu per surface", () => {
		renderTable();
		expect(
			screen.getAllByRole("button", { name: /actions for design review/i }),
		).toHaveLength(2);
	});

	// Two targets instead of five is what removes the 320px overflow; wrapping
	// alone only papered over it.
	it("reduces the action row to a primary action and one menu, both 44px", () => {
		renderTable();

		const viewButton = screen.getAllByRole("button", { name: /^view$/i })[0];
		const actionRow = viewButton.parentElement;

		expect(actionRow?.children.length).toBe(2);
		expect(actionRow?.className).toContain("flex-wrap");
		for (const child of Array.from(actionRow?.children ?? [])) {
			expect(child.className).toContain("min-h-[44px]");
		}
	});
});
