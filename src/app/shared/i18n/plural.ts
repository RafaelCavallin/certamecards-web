export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural}`;
}
export function cardsLabel(count: number): string {
  return pluralize(count, 'cartão', 'cartões');
}
export function reviewsLabel(count: number): string {
  return pluralize(count, 'revisão', 'revisões');
}
export function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) {
    return 'Bom dia';
  }
  if (hour >= 12 && hour < 18) {
    return 'Boa tarde';
  }
  return 'Boa noite';
}
export function examDateLabel(daysUntilExam: number): string {
  if (daysUntilExam === 0) {
    return 'a prova é hoje';
  }
  if (daysUntilExam === 1) {
    return 'prova amanhã';
  }
  return `prova em ${daysUntilExam} dias`;
}
export interface DashboardContextCounts {
  readonly deckCount: number;
  readonly dueCount: number;
  readonly newCount: number;
  readonly examDaysUntil: number | null;
}
export function dashboardContextLine(counts: DashboardContextCounts): string {
  if (counts.deckCount === 0) {
    return 'Nenhum deck ainda';
  }
  const dueSegment = counts.dueCount === 0 ? 'Nenhuma revisão pendente' : `${cardsLabel(counts.dueCount)} para revisar`;
  const newSegment = pluralize(counts.newCount, 'novo hoje', 'novos hoje');
  const segments = [dueSegment, newSegment];
  if (counts.examDaysUntil !== null) {
    segments.push(examDateLabel(counts.examDaysUntil));
  }
  return segments.join(' · ');
}
