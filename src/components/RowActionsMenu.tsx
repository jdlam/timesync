import { Loader2, type LucideIcon, MoreVertical } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface RowAction {
	label: string;
	icon: LucideIcon;
	onSelect: () => void;
	/** Renders in destructive colour. Pair with a confirmation dialog. */
	destructive?: boolean;
	disabled?: boolean;
	/** Swaps the icon for a spinner and blocks selection. */
	loading?: boolean;
}

interface RowActionsMenuProps {
	/** Accessible name for the trigger, e.g. `Actions for ${event.title}`. */
	label: string;
	actions: RowAction[];
	/**
	 * Touch surfaces size the trigger and every row to the 44px floor. Row
	 * actions mutate or delete records, so on touch this is a selection surface
	 * in the sense of style guide 4.1, not an ordinary button.
	 */
	touch?: boolean;
}

/**
 * The overflow menu for a table row or card. Use one menu on both breakpoints
 * rather than a touch variant and a pointer variant — see style guide 4.2. A
 * row with a single action does not need this; give that action a labelled
 * button instead.
 */
export function RowActionsMenu({
	label,
	actions,
	touch = false,
}: RowActionsMenuProps) {
	const [open, setOpen] = useState(false);
	const itemClass = cn(
		"w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
		touch && "min-h-[44px]",
	);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant={touch ? "outline" : "ghost"}
					size="sm"
					className={cn(touch && "min-h-[44px] min-w-[44px] px-3")}
					aria-label={label}
				>
					<MoreVertical className="w-4 h-4" />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-48 p-1">
				{actions.map((action) => {
					const Icon = action.loading ? Loader2 : action.icon;
					return (
						<button
							key={action.label}
							type="button"
							className={cn(
								itemClass,
								action.destructive && "text-destructive",
							)}
							disabled={action.disabled || action.loading}
							onClick={() => {
								setOpen(false);
								action.onSelect();
							}}
						>
							<Icon
								className={cn("w-4 h-4", action.loading && "animate-spin")}
							/>
							{action.label}
						</button>
					);
				})}
			</PopoverContent>
		</Popover>
	);
}
