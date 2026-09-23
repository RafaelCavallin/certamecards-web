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
  'library_opened',
  'library_searched',
  'deck_preview_opened',
  'deck_subscribed',
  'deck_unsubscribed',
  'deck_duplicated',
  'card_error_reported',
] as const;
export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];
export interface ProductEvent {
  readonly id: string;
  readonly name: ProductEventName;
  readonly props: Record<string, unknown>;
  readonly occurredAt: string;
}
