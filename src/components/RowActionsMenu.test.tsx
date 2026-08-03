import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
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
			touch={props.touch}
		/>,
	);
	return actions;
}

// Radix requires a pointerdown before the click to treat it as a real
// activation; the pointer-capture shims above make that combination open the
// popover in jsdom.
function openMenu() {
	const trigger = screen.getByRole("button", {
		name: "Actions for Design Review",
	});
	fireEvent.pointerDown(trigger);
	fireEvent.click(trigger);
	return trigger;
}

describe("RowActionsMenu", () => {
	afterEach(() => cleanup());

	it("gives the trigger an accessible name", () => {
		renderMenu({});
		expect(
			screen.getByRole("button", { name: "Actions for Design Review" }),
		).toBeTruthy();
	});

	// Row actions mutate or delete records, so on touch they are a selection
	// surface under style guide 4.1 and must clear the 44px floor.
	it("sizes the trigger to 44px on touch only", () => {
		renderMenu({ touch: true });
		expect(
			screen.getByRole("button", { name: "Actions for Design Review" })
				.className,
		).toContain("min-h-[44px]");

		cleanup();
		renderMenu({ touch: false });
		expect(
			screen.getByRole("button", { name: "Actions for Design Review" })
				.className,
		).not.toContain("min-h-[44px]");
	});

	// The menu is closed until the trigger is clicked — this is what regressed
	// when two instances shared one controlled `open` state (#78/#79): both
	// popovers opened, each stole focus from the other, and the dismiss layer
	// closed both instantly. An uncontrolled menu can't do that.
	it("is closed until the trigger is clicked, then shows every action by name", () => {
		renderMenu({});
		expect(screen.queryByText("View Details")).toBeNull();

		openMenu();

		for (const label of ["View Details", "Deactivate", "Delete"]) {
			expect(screen.getByText(label)).toBeTruthy();
		}
	});

	it("sizes rows to 44px on touch only, once open", () => {
		renderMenu({ touch: true });
		openMenu();
		for (const label of ["View Details", "Deactivate", "Delete"]) {
			expect(screen.getByText(label).closest("button")?.className).toContain(
				"min-h-[44px]",
			);
		}

		cleanup();
		renderMenu({ touch: false });
		openMenu();
		expect(
			screen.getByText("View Details").closest("button")?.className,
		).not.toContain("min-h-[44px]");
	});

	it("marks destructive actions so delete never reads as routine", () => {
		renderMenu({});
		openMenu();
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
		openMenu();
		const toggle = screen.getByText("Deactivate").closest("button");
		expect(toggle?.hasAttribute("disabled")).toBe(true);
		expect(toggle?.querySelector("svg")?.getAttribute("class")).toContain(
			"animate-spin",
		);
	});

	it("closes before running the action so the menu cannot outlive the row", async () => {
		const onSelect = vi.fn();
		render(
			<RowActionsMenu
				label="Actions"
				actions={[{ label: "Delete", icon: Trash2, onSelect }]}
			/>,
		);

		const trigger = screen.getByRole("button", { name: "Actions" });
		fireEvent.pointerDown(trigger);
		fireEvent.click(trigger);

		const deleteButton = screen.getByText("Delete").closest("button");
		if (deleteButton) fireEvent.click(deleteButton);

		expect(onSelect).toHaveBeenCalled();
		await waitFor(() => expect(screen.queryByText("Delete")).toBeNull());
	});
});
