import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";

vi.mock("convex/react", () => ({
	useMutation: () => vi.fn(),
}));

const { ResponsesTable } = await import("./ResponsesTable");

function makeResponse(overrides: Record<string, unknown> = {}) {
	return {
		_id: "r1" as Id<"responses">,
		respondentName: "Alex Chen",
		selectedSlots: ["2026-01-20T10:00"],
		eventTitle: "Design Review",
		eventIsActive: true,
		createdAt: Date.parse("2026-01-15T00:00:00Z"),
		...overrides,
	};
}

function renderTable() {
	render(<ResponsesTable responses={[makeResponse()]} />);
}

describe("admin ResponsesTable", () => {
	afterEach(() => cleanup());

	// This row has exactly one action, so it gets a labelled button rather than
	// an overflow menu — a menu would add a tap to reach a single item.
	it("names the delete action instead of hiding it behind a menu", () => {
		renderTable();

		expect(screen.queryByRole("button", { name: /^actions for/i })).toBeNull();
		expect(
			screen.getAllByRole("button", {
				name: /delete response from alex chen/i,
			}).length,
		).toBeGreaterThan(0);
	});

	// Deleting a response is destructive and was previously a bare 32px icon
	// with no accessible name at all.
	it("gives the mobile delete button a 44px target", () => {
		renderTable();

		const buttons = screen.getAllByRole("button", {
			name: /delete response from alex chen/i,
		});
		const mobile = buttons.find((b) => b.className.includes("min-h-[44px]"));

		expect(mobile).toBeTruthy();
		expect(mobile?.className).toContain("min-w-[44px]");
	});
});
