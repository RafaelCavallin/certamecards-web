import { cardsLabel } from '../../shared/i18n/plural';

export interface SummaryTextsInput {
  readonly reviewed: number;
  readonly blockDone: boolean;
  readonly cardsLeftNow: number;
  readonly uniqueCards: number;
}
export interface SummaryTexts {
  readonly title: string;
  readonly message: string;
}
function summaryTitle(input: SummaryTextsInput): string {
  if (input.reviewed === 0) {
    return 'Sessão encerrada';
  }
  if (input.blockDone) {
    return 'Bloco de foco concluído';
  }
  if (input.cardsLeftNow > 0) {
    return 'Pausa merecida';
  }
  return 'Tudo revisado por hoje';
}
function summaryMessage(input: SummaryTextsInput): string {
  if (input.reviewed === 0) {
    return 'Nenhuma avaliação nesta sessão.';
  }
  if (input.cardsLeftNow > 0) {
    return `${cardsLabel(input.uniqueCards)} diferentes nesta sessão. Ainda há ${input.cardsLeftNow} para agora.`;
  }
  return 'Volte amanhã para as próximas revisões.';
}
export function summaryTexts(input: SummaryTextsInput): SummaryTexts {
  return { title: summaryTitle(input), message: summaryMessage(input) };
}
