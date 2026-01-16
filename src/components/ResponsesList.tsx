import { format } from "date-fns";
import { MessageSquare, Trash2 } from "lucide-react";
import type { Response } from "@/db/schema";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface ResponsesListProps {
	responses: Response[];
	onDeleteResponse: (id: string) => void;
	isDeletingId?: string | null;
}

export function ResponsesList({
	responses,
	onDeleteResponse,
	isDeletingId,
}: ResponsesListProps) {
	if (responses.length === 0) {
		return (
			<div className="bg-card border border-border rounded-xl p-12 text-center">
				<MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
				<h3 className="text-xl font-semibold text-muted-foreground mb-2">
					No responses yet
				</h3>
				<p className="text-muted-foreground">
					Share the public link with participants to start collecting
					availability.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<h2 className="text-2xl font-bold text-foreground">
				All Responses ({responses.length})
			</h2>

			<div className="space-y-3">
				{responses.map((response) => (
					<Card
						key={response.id}
						className="bg-card border-border p-4 hover:border-cyan-500 transition-colors"
					>
						<div className="flex justify-between items-start gap-4">
							<div className="flex-1 min-w-0">
								<h3 className="font-semibold text-foreground text-lg truncate">
									{response.respondentName}
								</h3>

								{response.respondentComment && (
									<p className="text-muted-foreground mt-2 text-sm">
										{response.respondentComment}
									</p>
								)}

								<div className="mt-3 flex flex-wrap gap-4 text-sm">
									<div className="text-cyan-400">
										<span className="font-semibold">
											{response.selectedSlots.length}
										</span>{" "}
										time slot{response.selectedSlots.length !== 1 ? "s" : ""}{" "}
										selected
									</div>

									<div className="text-muted-foreground">
										Submitted{" "}
										{format(new Date(response.createdAt), "MMM d, yyyy h:mm a")}
									</div>

									{response.updatedAt.getTime() !==
										response.createdAt.getTime() && (
										<div className="text-muted-foreground">
											Updated{" "}
											{format(new Date(response.updatedAt), "MMM d, h:mm a")}
										</div>
									)}
								</div>
							</div>

							<Button
								variant="destructive"
								size="sm"
								onClick={() => onDeleteResponse(response.id)}
								disabled={isDeletingId === response.id}
								className="shrink-0"
							>
								{isDeletingId === response.id ? (
									"Deleting..."
								) : (
									<>
										<Trash2 className="w-4 h-4 mr-1" />
										Delete
									</>
								)}
							</Button>
						</div>
					</Card>
				))}
			</div>
		</div>
	);
}
