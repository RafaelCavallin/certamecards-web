import type { ErrorReportReason, ErrorReportStatus } from '../../../core/api/error-report.model';

export const REASON_LABELS: Readonly<Record<ErrorReportReason, string>> = {
  outdated_content: 'Conteúdo desatualizado',
  wrong_answer: 'Resposta errada',
  typo: 'Erro de digitação',
  other: 'Outro',
};
export const REPORT_STATUS_LABELS: Readonly<Record<ErrorReportStatus, string>> = {
  open: 'Abertos',
  resolved: 'Resolvidos',
  rejected: 'Improcedentes',
};
export const REPORT_STATUSES: readonly ErrorReportStatus[] = ['open', 'resolved', 'rejected'];
