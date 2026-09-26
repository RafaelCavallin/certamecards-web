const MESSAGES: Readonly<Record<string, string>> = {
  validation_failed: 'Os dados desta alteração foram recusados. Copie o texto, descarte a alteração e refaça-a corrigida.',
  auth_required: 'Sua sessão foi revogada. Entre novamente para continuar.',
  quota: 'O dispositivo ficou sem espaço. Libere espaço e tente novamente.',
  user_card_limit: 'O limite de cartões da conta foi atingido. Exclua cartões que não usa e tente novamente, ou copie o texto antes de descartar.',
  deck_card_limit: 'O limite de cartões deste deck foi atingido. Exclua cartões do deck e tente novamente, ou copie o texto antes de descartar.',
  entity_deleted: 'Esse item não existe mais. A alteração foi mantida para sua revisão.',
  not_found: 'Esse item não está mais disponível.',
  forbidden: 'Você não tem mais autorização para concluir esta alteração.',
};
const DEFAULT_MESSAGE = 'Esta alteração precisa da sua atenção antes de ser enviada.';
export function syncActionMessage(code: string): string {
  return MESSAGES[code] ?? DEFAULT_MESSAGE;
}
