export type OfflineAction =
  | 'deck'
  | 'card'
  | 'suspension'
  | 'reset'
  | 'settings'
  | 'profile'
  | 'library'
  | 'preview'
  | 'subscription'
  | 'duplicate'
  | 'error_report'
  | 'admin'
  | 'account_delete';
const LOCAL_FIRST_ACTIONS: readonly OfflineAction[] = ['deck', 'card', 'suspension', 'reset', 'settings', 'profile'];
export function isAllowedOffline(action: OfflineAction): boolean {
  return LOCAL_FIRST_ACTIONS.includes(action);
}
export function offlineActionMessage(action: OfflineAction): string | null {
  return isAllowedOffline(action) ? null : 'Isso precisa de conexão. Suas alterações de estudo continuam salvas neste dispositivo.';
}
