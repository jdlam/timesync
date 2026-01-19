import { useMutation } from "convex/react";
import { format } from "date-fns";
import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface Response {
	_id: Id<"responses">;
	respondentName: string;
	selectedSlots: string[];
	eventTitle: string;
	eventIsActive: boolean;
	createdAt: number;
}

interface ResponsesTableProps {
	responses: Response[];
}

export function ResponsesTable({ responses }: ResponsesTableProps) {
	const [deleteResponseId, setDeleteResponseId] =
		useState<Id<"responses"> | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const deleteResponse = useMutation(api.admin.deleteResponse);

	const handleDeleteResponse = async () => {
		if (!deleteResponseId) return;

		setIsLoading(true);
		try {
			await deleteResponse({ responseId: deleteResponseId });
			toast.success("Response deleted successfully");
		} catch (_error) {
			toast.error("Failed to delete response");
		} finally {
			setDeleteResponseId(null);
			setIsLoading(false);
		}
	};

	if (responses.length === 0) {
		return (
			<div className="text-center py-12 text-muted-foreground">
				No responses found
			</div>
		);
	}

	return (
		<>
			{/* Mobile Card View */}
			<div className="space-y-3 sm:hidden">
				{responses.map((response) => (
					<div
						key={response._id}
						className="bg-card border border-border rounded-lg p-4"
					>
						<div className="flex items-start justify-between gap-2 mb-2">
							<div className="min-w-0 flex-1">
								<h3 className="font-medium truncate">
									{response.respondentName}
								</h3>
								<p className="text-xs text-muted-foreground truncate">
									{response.eventTitle}
								</p>
							</div>
							<span
								className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
									response.eventIsActive
										? "bg-green-500/10 text-green-500"
										: "bg-orange-500/10 text-orange-500"
								}`}
							>
								{response.eventIsActive ? "Active" : "Inactive"}
							</span>
						</div>

						<div className="flex items-center justify-between mt-3">
							<div className="text-sm text-muted-foreground">
								<span>{response.selectedSlots.length} slots</span>
								<span className="mx-2">|</span>
								<span>
									{format(new Date(response.createdAt), "MMM d, yyyy")}
								</span>
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setDeleteResponseId(response._id)}
								className="text-destructive hover:text-destructive"
							>
								<Trash2 className="w-4 h-4" />
							</Button>
						</div>
					</div>
				))}
			</div>

			{/* Desktop Table View */}
			<div className="hidden sm:block overflow-x-auto">
				<table className="w-full">
					<thead>
						<tr className="border-b border-border">
							<th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
								Name
							</th>
							<th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
								Event
							</th>
							<th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
								Slots
							</th>
							<th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
								Created
							</th>
							<th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
								Actions
							</th>
						</tr>
					</thead>
					<tbody>
						{responses.map((response) => (
							<tr
								key={response._id}
								className="border-b border-border hover:bg-muted/50"
							>
								<td className="py-3 px-4">
									<p className="font-medium">{response.respondentName}</p>
								</td>
								<td className="py-3 px-4">
									<div className="flex items-center gap-2">
										<span className="truncate max-w-[200px]">
											{response.eventTitle}
										</span>
										<span
											className={`text-xs px-2 py-0.5 rounded-full ${
												response.eventIsActive
													? "bg-green-500/10 text-green-500"
													: "bg-orange-500/10 text-orange-500"
											}`}
										>
											{response.eventIsActive ? "Active" : "Inactive"}
										</span>
									</div>
								</td>
								<td className="py-3 px-4 text-sm">
									{response.selectedSlots.length}
								</td>
								<td className="py-3 px-4 text-sm text-muted-foreground">
									{format(new Date(response.createdAt), "MMM d, yyyy")}
								</td>
								<td className="py-3 px-4 text-right">
									<Button
										variant="ghost"
										size="sm"
										className="text-destructive hover:text-destructive"
										onClick={() => setDeleteResponseId(response._id)}
									>
										<Trash2 className="w-4 h-4" />
									</Button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Delete Confirmation Dialog */}
			<AlertDialog
				open={deleteResponseId !== null}
				onOpenChange={(open) => !open && setDeleteResponseId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Response</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this response? This action cannot
							be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteResponse}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isLoading ? (
								<Loader2 className="w-4 h-4 animate-spin mr-2" />
							) : null}
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
