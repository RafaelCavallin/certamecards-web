export interface AuditChange {
  readonly before: unknown;
  readonly after: unknown;
}
export interface AdminAuditLog {
  readonly id: string;
  readonly actorId: string;
  readonly actorName: string;
  readonly action: string;
  readonly targetType: string;
  readonly targetId: string | null;
  readonly targetLabel: string | null;
  readonly changes: Readonly<Record<string, AuditChange>>;
  readonly createdAt: string;
}
export interface AuditLogPage {
  readonly items: readonly AdminAuditLog[];
  readonly nextBefore: string | null;
}
export interface AuditLogFilter {
  readonly actorId: string | null;
  readonly action: string | null;
  readonly from: string | null;
  readonly to: string | null;
  readonly before: string | null;
}
