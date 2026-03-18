import "server-only";

export type AuditAction = 
  | "USER_CREATE" 
  | "USER_DELETE" 
  | "USER_STATUS_UPDATE" 
  | "USER_ROLE_UPDATE" 
  | "SHEET_CONFIG_UPDATE" 
  | "ASSIGNMENT_CREATE"
  | "ASSIGNMENT_DELETE"
  | "SHEET_ROW_DELETE";

export function logAuditAction(
  actorId: string, 
  targetId: string, 
  action: AuditAction, 
  details?: Record<string, unknown>
) {
  // In a production app, insert this into `audit_logs` table.
  // Here, we emit a structured log for observability.
  const entry = {
    event: "AUDIT",
    timestamp: new Date().toISOString(),
    actorId,
    targetId,
    action,
    details,
  };
  console.info(JSON.stringify(entry));
}
