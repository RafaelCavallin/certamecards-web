import type { AdminAuditLog } from '../../../core/api/audit-log.model';

const EMPTY_VALUE = 'vazio';
function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return EMPTY_VALUE;
  }
  return typeof value === 'string' ? value : JSON.stringify(value);
}
export function summarizeChanges(changes: AdminAuditLog['changes']): readonly string[] {
  return Object.entries(changes).map(
    ([field, change]) => `${field}: ${formatValue(change.before)} → ${formatValue(change.after)}`,
  );
}
