import type { DuplicateDeckRequest } from '../api/library.model';

export interface DuplicateChoice {
  readonly carryProgress: boolean;
  readonly cancelSubscription: boolean;
}
export interface DuplicateOption {
  readonly value: boolean;
  readonly label: string;
  readonly effect: string;
}
export const DEFAULT_DUPLICATE_CHOICE: DuplicateChoice = { carryProgress: true, cancelSubscription: true };
export const NO_UPDATES_NOTICE = 'A cópia é só sua e não recebe as atualizações do deck oficial.';
export const PROGRESS_OPTIONS: readonly DuplicateOption[] = [
  { value: true, label: 'Levar meu progresso', effect: 'Os cartões chegam com o agendamento e as suspensões que você já tem.' },
  { value: false, label: 'Começar do zero', effect: 'Todos os cartões da cópia entram como novos.' },
];
export const SUBSCRIPTION_OPTIONS: readonly DuplicateOption[] = [
  { value: true, label: 'Cancelar minha inscrição', effect: 'Evita estudar o mesmo conteúdo duas vezes. Seu progresso no oficial fica guardado por 90 dias.' },
  { value: false, label: 'Manter a inscrição', effect: 'Você continua recebendo o deck oficial, além da cópia.' },
];export const DUPLICATE_TEXTS = {
  progressOptions: PROGRESS_OPTIONS,
  subscriptionOptions: SUBSCRIPTION_OPTIONS,
  notice: NO_UPDATES_NOTICE,
} as const;
export function toDuplicateRequest(id: string, choice: DuplicateChoice): DuplicateDeckRequest {
  return { id, carryProgress: choice.carryProgress, cancelSubscription: choice.cancelSubscription };
}
