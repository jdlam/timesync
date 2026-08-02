import { Button } from "@/components/ui/button";
import type { ConsentChoice } from "@/lib/consent";

interface ConsentBannerProps {
	onChoice: (choice: ConsentChoice) => void;
}

/**
 * EU/UK-only analytics consent banner (INSTRUMENTATION_PLAN.local.md §4
 * Slice 9 / §5). Not a cookie wall - the page behind it stays fully usable.
 * "Accept all" is the emphasized primary action; "Reject all" is
 * de-emphasized but still a single, unobstructed click.
 */
export function ConsentBanner({ onChoice }: ConsentBannerProps) {
	return (
		<section
			aria-label="Analytics consent"
			className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background p-4 shadow-lg md:p-6"
		>
			<div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<p className="text-sm text-muted-foreground">
					We use analytics to understand how people use TimeSync. Choose what
					you're comfortable with.
				</p>
				<div className="flex flex-wrap gap-2">
					<Button
						variant="ghost"
						className="min-h-[44px]"
						onClick={() => onChoice("none")}
					>
						Reject all
					</Button>
					<Button
						variant="outline"
						className="min-h-[44px]"
						onClick={() => onChoice("necessary")}
					>
						Only necessary
					</Button>
					<Button className="min-h-[44px]" onClick={() => onChoice("all")}>
						Accept all
					</Button>
				</div>
			</div>
		</section>
	);
}
