import { format } from "date-fns";
import { Calendar, MessageSquare, Power, Trash2, User } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";

interface AuditLog {
	_id: Id<"auditLogs">;
	userId: string;
	userEmail: string;
	action: string;
	targetType: string;
	targetId: string;
	metadata?: Record<string, unknown>;
	createdAt: number;
}

interface AuditLogListProps {
	logs: AuditLog[];
}

function getActionIcon(action: string) {
	switch (action) {
		case "delete_event":
			return <Trash2 className="w-4 h-4 text-destructive" />;
		case "delete_response":
			return <Trash2 className="w-4 h-4 text-orange-500" />;
		case "toggle_event_status":
			return <Power className="w-4 h-4 text-blue-500" />;
		default:
			return <Calendar className="w-4 h-4 text-muted-foreground" />;
	}
}

function getActionDescription(log: AuditLog) {
	const metadata = log.metadata as Record<string, unknown> | undefined;

	switch (log.action) {
		case "delete_event":
			return (
				<>
					Deleted event{" "}
					<span className="font-medium">
						"{(metadata?.eventTitle as string) || "Unknown"}"
					</span>
					{metadata?.responsesDeleted
						? ` (${metadata.responsesDeleted} responses deleted)`
						: ""}
				</>
			);
		case "delete_response":
			return (
				<>
					Deleted response from{" "}
					<span className="font-medium">
						{(metadata?.respondentName as string) || "Unknown"}
					</span>{" "}
					on event{" "}
					<span className="font-medium">
						"{(metadata?.eventTitle as string) || "Unknown"}"
					</span>
				</>
			);
		case "toggle_event_status":
			return (
				<>
					{(metadata?.newStatus as boolean) ? "Activated" : "Deactivated"} event{" "}
					<span className="font-medium">
						"{(metadata?.eventTitle as string) || "Unknown"}"
					</span>
				</>
			);
		default:
			return log.action;
	}
}

function getTargetIcon(targetType: string) {
	switch (targetType) {
		case "event":
			return <Calendar className="w-3 h-3" />;
		case "response":
			return <MessageSquare className="w-3 h-3" />;
		default:
			return null;
	}
}

export function AuditLogList({ logs }: AuditLogListProps) {
	if (logs.length === 0) {
		return (
			<div className="text-center py-12 text-muted-foreground">
				No audit logs yet
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{logs.map((log) => (
				<div
					key={log._id}
					className="bg-card border border-border rounded-lg p-4"
				>
					<div className="flex items-start gap-3">
						<div className="flex-shrink-0 mt-1">
							{getActionIcon(log.action)}
						</div>

						<div className="flex-1 min-w-0">
							<p className="text-sm">{getActionDescription(log)}</p>

							<div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
								<span className="flex items-center gap-1">
									<User className="w-3 h-3" />
									{log.userEmail}
								</span>
								<span className="flex items-center gap-1">
									{getTargetIcon(log.targetType)}
									{log.targetType}
								</span>
								<span>
									{format(new Date(log.createdAt), "MMM d, yyyy 'at' h:mm a")}
								</span>
							</div>
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
