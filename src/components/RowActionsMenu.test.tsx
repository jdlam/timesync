import { cleanup, render, screen } from "@testing-library/react";
import { Eye, Power, Trash2 } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type RowAction, RowActionsMenu } from "./RowActionsMenu";

// Radix popovers call pointer-capture APIs that jsdom does not implement.
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.setPointerCapture ??= () => undefined;
Element.prototype.releasePointerCapture ??= () => undefined;
Element.prototype.scrollIntoView ??= () => undefined;

function makeActions(overrides: Partial<RowAction>[] = []): RowAction[] {
	const base: RowAction[] = [
		{ label: "View Details", icon: Eye, onSelect: vi.fn() },
		{ label: "Deactivate", icon: Power, onSelect: vi.fn() },
		{ label: "Delete", icon: Trash2, onSelect: vi.fn(), destructive: true },
	];
	return base.map((action, i) => ({ ...action, ...overrides[i] }));
}

function renderMenu(props: Partial<{ touch: boolean; actions: RowAction[] }>) {
	const actions = props.actions ?? makeActions();
	render(
		<RowActionsMenu
			label="Actions for Design Review"
			actions={actions}
			open
			onOpenChange={() => undefined}
			touch={props.touch}
		/>,
	);
	return actions;
}

describe("RowActionsMenu", () => {
	afterEach(() => cleanup());

	// The point of the menu is that actions carry names. Icon-only rows leave a
	// touch user guessing at glyphs, which is what this replaced.
	it("renders every action by name", () => {
		renderMenu({});
		for (const label of ["View Details", "Deactivate", "Delete"]) {
			expect(screen.getByText(label)).toBeTruthy();
		}
	});

	it("gives the trigger an accessible name", () => {
		renderMenu({});
		expect(
			screen.getByRole("button", { name: "Actions for Design Review" }),
		).toBeTruthy();
	});

	// Row actions mutate or delete records, so on touch they are a selection
	// surface under style guide 4.1 and must clear the 44px floor.
	it("sizes rows and trigger to 44px on touch only", () => {
		renderMenu({ touch: true });
		expect(
			screen.getByRole("button", { name: "Actions for Design Review" })
				.className,
		).toContain("min-h-[44px]");
		for (const label of ["View Details", "Deactivate", "Delete"]) {
			expect(screen.getByText(label).closest("button")?.className).toContain(
				"min-h-[44px]",
			);
		}

		cleanup();
		renderMenu({ touch: false });
		expect(
			screen.getByText("View Details").closest("button")?.className,
		).not.toContain("min-h-[44px]");
	});

	it("marks destructive actions so delete never reads as routine", () => {
		renderMenu({});
		expect(screen.getByText("Delete").closest("button")?.className).toContain(
			"text-destructive",
		);
		expect(
			screen.getByText("View Details").closest("button")?.className,
		).not.toContain("text-destructive");
	});

	// A pending mutation must not be re-fired by a second tap.
	it("disables a loading action and spins its icon", () => {
		renderMenu({ actions: makeActions([{}, { loading: true }]) });
		const toggle = screen.getByText("Deactivate").closest("button");
		expect(toggle?.hasAttribute("disabled")).toBe(true);
		expect(toggle?.querySelector("svg")?.getAttribute("class")).toContain(
			"animate-spin",
		);
	});

	it("closes before running the action so the menu cannot outlive the row", () => {
		const onOpenChange = vi.fn();
		const onSelect = vi.fn();
		render(
			<RowActionsMenu
				label="Actions"
				actions={[{ label: "Delete", icon: Trash2, onSelect }]}
				open
				onOpenChange={onOpenChange}
			/>,
		);

		screen.getByText("Delete").closest("button")?.click();
		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(onSelect).toHaveBeenCalled();
	});
});
