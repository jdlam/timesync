import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AuditLogList } from "@/components/admin/AuditLogList";
import { Button } from "@/components/ui/button";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export const Route = createFileRoute("/admin/logs")({
	component: AdminLogs,
});

interface AuditLogItem {
	_id: Id<"auditLogs">;
	_creationTime: number;
	adminEmail: string;
	action: string;
	subjectId: string;
	details?: string;
	createdAt: number;
}

function AdminLogs() {
	const [cursor, setCursor] = useState<string | undefined>(undefined);
	const [accumulatedLogs, setAccumulatedLogs] = useState<AuditLogItem[]>([]);

	const logsData = useQuery(api.admin.getAuditLogs, {
		limit: 50,
		cursor,
	});

	// Accumulate logs when new data arrives
	useEffect(() => {
		if (logsData?.logs) {
			if (cursor === undefined) {
				// First page - replace all
				setAccumulatedLogs(logsData.logs as AuditLogItem[]);
			} else {
				// Subsequent pages - append new logs
				setAccumulatedLogs((prev) => {
					const existingIds = new Set(prev.map((log) => log._id));
					const newLogs = (logsData.logs as AuditLogItem[]).filter(
						(log) => !existingIds.has(log._id),
					);
					return [...prev, ...newLogs];
				});
			}
		}
	}, [logsData?.logs, cursor]);

	// Memoize the display logs to avoid unnecessary re-renders
	const displayLogs = useMemo(() => accumulatedLogs, [accumulatedLogs]);

	const handleLoadMore = () => {
		if (logsData?.nextCursor) {
			setCursor(logsData.nextCursor);
		}
	};

	return (
		<AdminLayout>
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold">Audit Logs</h1>
					<p className="text-muted-foreground mt-1">
						Track all administrative actions
					</p>
				</div>

				{/* Results Count */}
				{logsData && (
					<p className="text-sm text-muted-foreground">
						Showing {displayLogs.length} of {logsData.totalCount} logs
					</p>
				)}

				{/* Audit Logs */}
				{logsData ? (
					<>
						<AuditLogList logs={displayLogs} />

						{logsData.nextCursor && (
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
