export const PRODUCT_EVENT_NAMES = [
  'signup_completed',
  'deck_created',
  'card_created',
  'session_started',
  'session_ended',
  'review_undone',
  'pwa_installed',
  'sync_flushed',
  'client_error',
] as const;
export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];
export interface ProductEvent {
  readonly id: string;
  readonly name: ProductEventName;
  readonly props: Record<string, unknown>;
  readonly occurredAt: string;
}
