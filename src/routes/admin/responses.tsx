import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResponsesTable } from "@/components/admin/ResponsesTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export const Route = createFileRoute("/admin/responses")({
	component: AdminResponses,
});

interface ResponseItem {
	_id: Id<"responses">;
	_creationTime: number;
	respondentName: string;
	selectedSlots: string[];
	eventId: Id<"events">;
	createdAt: number;
	eventTitle: string;
	eventIsActive: boolean;
}

function AdminResponses() {
	const [search, setSearch] = useState("");
	const [cursor, setCursor] = useState<string | undefined>(undefined);
	const [accumulatedResponses, setAccumulatedResponses] = useState<
		ResponseItem[]
	>([]);

	const responsesData = useQuery(api.admin.getAllResponses, {
		limit: 20,
		cursor,
		search: search || undefined,
	});

	// Accumulate responses when new data arrives
	useEffect(() => {
		if (responsesData?.responses) {
			if (cursor === undefined) {
				// First page or filter changed - replace all
				setAccumulatedResponses(responsesData.responses as ResponseItem[]);
			} else {
				// Subsequent pages - append new responses
				setAccumulatedResponses((prev) => {
					const existingIds = new Set(prev.map((r) => r._id));
					const newResponses = (
						responsesData.responses as ResponseItem[]
					).filter((r) => !existingIds.has(r._id));
					return [...prev, ...newResponses];
				});
			}
		}
	}, [responsesData?.responses, cursor]);

	// Memoize the display responses to avoid unnecessary re-renders
	const displayResponses = useMemo(
		() => accumulatedResponses,
		[accumulatedResponses],
	);

	const handleLoadMore = () => {
		if (responsesData?.nextCursor) {
			setCursor(responsesData.nextCursor);
		}
	};

	return (
		<AdminLayout>
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold">Responses</h1>
					<p className="text-muted-foreground mt-1">
						View and manage all availability responses
					</p>
				</div>

				{/* Search */}
				<div className="relative max-w-md">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<Input
						type="text"
						placeholder="Search by name..."
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setCursor(undefined);
							setAccumulatedResponses([]);
						}}
						className="pl-9"
					/>
				</div>

				{/* Results Count */}
				{responsesData && (
					<p className="text-sm text-muted-foreground">
						Showing {displayResponses.length} of {responsesData.totalCount}{" "}
						responses
					</p>
				)}

				{/* Responses Table */}
				{responsesData ? (
					<>
						<ResponsesTable responses={displayResponses} />

						{responsesData.nextCursor && (
							<div className="flex justify-center pt-4">
								<Button variant="outline" onClick={handleLoadMore}>
									Load More
								</Button>
							</div>
						)}
					</>
				) : (
					<div className="flex justify-center py-12">
						<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
					</div>
				)}
			</div>
		</AdminLayout>
	);
}
