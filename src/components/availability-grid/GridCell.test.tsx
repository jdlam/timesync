import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GridCell } from "./GridCell";

describe("GridCell", () => {
	const defaultProps = {
		timestamp: "2024-01-15T10:00:00.000Z",
		displayTime: "10:00 AM",
		isSelected: false,
		mode: "select" as const,
		onInteraction: vi.fn(),
	};

	afterEach(() => {
		cleanup();
	});

	describe("mobile touch interactions", () => {
		it("should call onInteraction with 'start' action on touchend", () => {
			const onInteraction = vi.fn();
			render(<GridCell {...defaultProps} onInteraction={onInteraction} />);

			const button = screen.getByRole("button");
			fireEvent.touchEnd(button);

			expect(onInteraction).toHaveBeenCalledWith(
				defaultProps.timestamp,
				"start",
			);
			expect(onInteraction).toHaveBeenCalledTimes(1);
		});

		it("should not call onInteraction on touchend in view mode", () => {
			const onInteraction = vi.fn();
			render(
				<GridCell
					{...defaultProps}
					mode="view"
					onInteraction={onInteraction}
					heatmapData={{
						count: 2,
						percentage: 50,
						respondents: ["Alice", "Bob"],
					}}
					heatmapColor="#00ff00"
				/>,
			);

			const cell = screen.getByTitle("2 available (50%)");
			fireEvent.touchEnd(cell);

			expect(onInteraction).not.toHaveBeenCalled();
		});

		it("should prevent double-toggle when touchend fires before mousedown", () => {
			const onInteraction = vi.fn();
			render(<GridCell {...defaultProps} onInteraction={onInteraction} />);

			const button = screen.getByRole("button");

			// Simulate touch interaction (touchend fires first on mobile)
			fireEvent.touchEnd(button);
			expect(onInteraction).toHaveBeenCalledTimes(1);

			// Simulate the subsequent mousedown that can fire on some devices
			fireEvent.mouseDown(button);
			// Should NOT call onInteraction again - double toggle prevented
			expect(onInteraction).toHaveBeenCalledTimes(1);
		});

		it("should prevent click handler from firing after touchend", () => {
			const onInteraction = vi.fn();
			render(<GridCell {...defaultProps} onInteraction={onInteraction} />);

			const button = screen.getByRole("button");

			// Simulate touch interaction
			fireEvent.touchEnd(button);
			expect(onInteraction).toHaveBeenCalledTimes(1);

			// Simulate the click event that fires after touch on some devices
			fireEvent.click(button);
			// Should NOT call onInteraction again
			expect(onInteraction).toHaveBeenCalledTimes(1);
		});

		it("should reset interactionHandled flag after click is skipped", () => {
			const onInteraction = vi.fn();
			render(<GridCell {...defaultProps} onInteraction={onInteraction} />);

			const button = screen.getByRole("button");

			// First touch cycle
			fireEvent.touchEnd(button);
			fireEvent.click(button); // skipped, resets flag
			expect(onInteraction).toHaveBeenCalledTimes(1);

			// Second touch cycle should work
			fireEvent.touchEnd(button);
			expect(onInteraction).toHaveBeenCalledTimes(2);
		});

		it("should handle rapid touch interactions correctly", () => {
			const onInteraction = vi.fn();
			render(<GridCell {...defaultProps} onInteraction={onInteraction} />);

			const button = screen.getByRole("button");

			// Simulate rapid taps
			fireEvent.touchEnd(button);
			fireEvent.click(button); // skipped

			fireEvent.touchEnd(button);
			fireEvent.click(button); // skipped

			fireEvent.touchEnd(button);
			fireEvent.click(button); // skipped

			// Should have been called 3 times (once per touchend)
			expect(onInteraction).toHaveBeenCalledTimes(3);
		});
	});

	describe("mouse interactions", () => {
		it("should call onInteraction with 'start' action on mousedown", () => {
			const onInteraction = vi.fn();
			render(<GridCell {...defaultProps} onInteraction={onInteraction} />);

			const button = screen.getByRole("button");
			fireEvent.mouseDown(button);

			expect(onInteraction).toHaveBeenCalledWith(
				defaultProps.timestamp,
				"start",
			);
		});

		it("should call onInteraction with 'enter' action on mouseenter while dragging", () => {
			const onInteraction = vi.fn();
			render(
				<GridCell {...defaultProps} onInteraction={onInteraction} isDragging />,
			);

			const button = screen.getByRole("button");
			fireEvent.mouseEnter(button);

			expect(onInteraction).toHaveBeenCalledWith(
				defaultProps.timestamp,
				"enter",
			);
		});

		it("should not call onInteraction on mouseenter when not dragging", () => {
			const onInteraction = vi.fn();
			render(
				<GridCell
					{...defaultProps}
					onInteraction={onInteraction}
					isDragging={false}
				/>,
			);

			const button = screen.getByRole("button");
			fireEvent.mouseEnter(button);

			expect(onInteraction).not.toHaveBeenCalled();
		});

		it("should not call onInteraction on mousedown in view mode", () => {
			const onInteraction = vi.fn();
			render(
				<GridCell
					{...defaultProps}
					mode="view"
					onInteraction={onInteraction}
					heatmapData={{
						count: 2,
						percentage: 50,
						respondents: ["Alice", "Bob"],
					}}
					heatmapColor="#00ff00"
				/>,
			);

			const cell = screen.getByTitle("2 available (50%)");
			fireEvent.mouseDown(cell);

			expect(onInteraction).not.toHaveBeenCalled();
		});
	});

	describe("shift+click interactions", () => {
		it("should call onInteraction with shiftKey=true on shift+click", () => {
			const onInteraction = vi.fn();
			render(<GridCell {...defaultProps} onInteraction={onInteraction} />);

			const button = screen.getByRole("button");
			fireEvent.click(button, { shiftKey: true });

			expect(onInteraction).toHaveBeenCalledWith(
				defaultProps.timestamp,
				"click",
				true,
			);
		});

		it("should stop propagation on shift+click to prevent drag mode", () => {
			const onInteraction = vi.fn();
			render(<GridCell {...defaultProps} onInteraction={onInteraction} />);

			const button = screen.getByRole("button");
			const clickEvent = new MouseEvent("click", {
				bubbles: true,
				shiftKey: true,
			});
			const stopPropagationSpy = vi.spyOn(clickEvent, "stopPropagation");

			button.dispatchEvent(clickEvent);

			expect(stopPropagationSpy).toHaveBeenCalled();
		});

		it("should stop propagation on shift+mousedown to prevent container drag", () => {
			const onInteraction = vi.fn();
			render(<GridCell {...defaultProps} onInteraction={onInteraction} />);

			const button = screen.getByRole("button");
			const mouseDownEvent = new MouseEvent("mousedown", {
				bubbles: true,
				shiftKey: true,
			});
			const stopPropagationSpy = vi.spyOn(mouseDownEvent, "stopPropagation");

			button.dispatchEvent(mouseDownEvent);

			expect(stopPropagationSpy).toHaveBeenCalled();
		});
	});

	describe("accessibility", () => {
		it("should have correct aria-label for unselected cell", () => {
			render(<GridCell {...defaultProps} isSelected={false} />);

			const button = screen.getByRole("button");
			expect(button.getAttribute("aria-label")).toBe("10:00 AM - Not selected");
		});

		it("should have correct aria-label for selected cell", () => {
			render(<GridCell {...defaultProps} isSelected={true} />);

			const button = screen.getByRole("button");
			expect(button.getAttribute("aria-label")).toBe("10:00 AM - Selected");
		});

		it("should have aria-pressed attribute reflecting selection state", () => {
			const { rerender } = render(
				<GridCell {...defaultProps} isSelected={false} />,
			);

			const button = screen.getByRole("button");
			expect(button.getAttribute("aria-pressed")).toBe("false");

			rerender(<GridCell {...defaultProps} isSelected={true} />);
			expect(button.getAttribute("aria-pressed")).toBe("true");
		});
	});

	describe("visual states", () => {
		it("should apply selected styles when isSelected is true", () => {
			render(<GridCell {...defaultProps} isSelected={true} />);

			const button = screen.getByRole("button");
			expect(button.className).toContain("bg-cyan-600");
		});

		it("should apply unselected styles when isSelected is false", () => {
			render(<GridCell {...defaultProps} isSelected={false} />);

			const button = screen.getByRole("button");
			expect(button.className).toContain("bg-muted");
		});

		it("should show day offset styling when hasDayOffset is true", () => {
			render(
				<GridCell {...defaultProps} isSelected={false} hasDayOffset={true} />,
			);

			const button = screen.getByRole("button");
			expect(button.className).toContain("border-amber-500/50");
		});

		it("should not show day offset styling when selected", () => {
			render(
				<GridCell {...defaultProps} isSelected={true} hasDayOffset={true} />,
			);

			const button = screen.getByRole("button");
			expect(button.className).not.toContain("border-amber-500/50");
		});
	});

	describe("view mode rendering", () => {
		it("should render heatmap display in view mode", () => {
			render(
				<GridCell
					{...defaultProps}
					mode="view"
					heatmapData={{
						count: 3,
						percentage: 75,
						respondents: ["Alice", "Bob", "Charlie"],
					}}
					heatmapColor="rgb(0, 128, 0)"
				/>,
			);

			expect(screen.getByText("3")).toBeTruthy();
			expect(screen.getByTitle("3 available (75%)")).toBeTruthy();
		});

		it("should not show count when heatmap count is 0", () => {
			render(
				<GridCell
					{...defaultProps}
					mode="view"
					heatmapData={{ count: 0, percentage: 0, respondents: [] }}
					heatmapColor="rgb(128, 128, 128)"
				/>,
			);

			expect(screen.queryByText("0")).toBeNull();
			expect(screen.getByTitle("0 available (0%)")).toBeTruthy();
		});
	});
});
