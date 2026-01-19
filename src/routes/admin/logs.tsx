import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AuditLogList } from "@/components/admin/AuditLogList";
import { Button } from "@/components/ui/button";
import { api } from "../../../convex/_generated/api";

export const Route = createFileRoute("/admin/logs")({
	component: AdminLogs,
});

function AdminLogs() {
	const [cursor, setCursor] = useState<string | undefined>(undefined);

	const logsData = useQuery(api.admin.getAuditLogs, {
		limit: 50,
		cursor,
	});

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
						Showing {logsData.logs.length} of {logsData.totalCount} logs
					</p>
				)}

				{/* Audit Logs */}
				{logsData ? (
					<>
						<AuditLogList logs={logsData.logs} />

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
