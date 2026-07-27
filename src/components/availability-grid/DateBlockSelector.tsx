import { Check } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatBlockLabel, getDateBlocks } from "@/lib/date-blocks";
import { formatDate, parseTimeInZone } from "@/lib/time-utils";
import { cn } from "@/lib/utils";
import type { PublicEvent } from "../../../convex/shared_types";

interface DateBlockSelectorProps {
	event: PublicEvent;
	initialSelections?: string[];
	onChange?: (selectedSlots: string[]) => void;
}

/**
 * Availability selector for grouped dates events. Responders pick whole blocks
 * (each weekend, each work-week, …) rather than individual days. A block is
 * derived from contiguous runs of the event's candidate days; selecting it
 * emits the canonical slot for every day in the block, so responses store the
 * same per-day shape as everything else.
 */
export function DateBlockSelector({
	event,
	initialSelections = [],
	onChange,
}: DateBlockSelectorProps) {
	const slotForDate = useMemo(
		() => (dateStr: string) =>
			parseTimeInZone(dateStr, "00:00", event.timeZone).toISOString(),
		[event.timeZone],
	);

	const blocks = useMemo(() => getDateBlocks(event.dates), [event.dates]);

	// A block is selected when all of its days are in the initial selection.
	const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => {
		const initialDays = new Set(
			initialSelections.map((slot) => formatDate(slot, event.timeZone)),
		);
		const keys = new Set<string>();
		for (const block of blocks) {
			if (block.every((d) => initialDays.has(d))) keys.add(block[0]);
		}
		return keys;
	});

	const emit = (keys: Set<string>) => {
		const slots = blocks
			.filter((b) => keys.has(b[0]))
			.flatMap((b) => b.map(slotForDate))
			.sort();
		onChange?.(slots);
	};

	const toggle = (key: string) => {
		const next = new Set(selectedKeys);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		setSelectedKeys(next);
		emit(next);
	};

	const selectAll = () => {
		const next = new Set(blocks.map((b) => b[0]));
		setSelectedKeys(next);
		emit(next);
	};

	const clearAll = () => {
		const next = new Set<string>();
		setSelectedKeys(next);
		emit(next);
	};

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={selectAll}
					disabled={selectedKeys.size === blocks.length}
				>
					Select all
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={clearAll}
					disabled={selectedKeys.size === 0}
				>
					Clear
				</Button>
			</div>

			<div className="grid gap-2 sm:grid-cols-2">
				{blocks.map((block) => {
					const isSelected = selectedKeys.has(block[0]);
					return (
						<button
							key={block[0]}
							type="button"
							onClick={() => toggle(block[0])}
							aria-pressed={isSelected}
							className={cn(
								"flex min-h-[44px] items-center justify-between gap-2 rounded-lg border p-3 text-left transition-colors",
								isSelected
									? "border-teal-500 bg-teal-500/10"
									: "border-border bg-background hover:bg-muted/50",
							)}
						>
							<span className="font-medium text-foreground">
								{formatBlockLabel(block)}
							</span>
							{isSelected && (
								<Check className="h-5 w-5 shrink-0 text-teal-500" />
							)}
						</button>
					);
				})}
			</div>

			<p className="text-sm text-muted-foreground">
				{selectedKeys.size} of {blocks.length} selected
			</p>
		</div>
	);
}
