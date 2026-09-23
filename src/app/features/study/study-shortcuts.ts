import type { Rating } from '../../core/scheduler/scheduler.model';

export interface StudyShortcutHandlers {
  readonly revealed: boolean;
  readonly reveal: () => void;
  readonly rate: (rating: Rating) => void;
  readonly undo: () => void;
  readonly end: () => void;
}
const RATING_BY_KEY: Readonly<Record<string, Rating>> = { '1': 1, '2': 2, '3': 3, '4': 4 };
const TYPING_TARGET_SELECTOR = 'dialog, input, textarea, select';
const INTERACTIVE_TARGET_SELECTOR = 'button, a[href]';
function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(TYPING_TARGET_SELECTOR) !== null;
}
function activatesFocusedControl(event: KeyboardEvent): boolean {
  const activationKey = event.key === ' ' || event.key === 'Enter';
  return activationKey && event.target instanceof Element && event.target.closest(INTERACTIVE_TARGET_SELECTOR) !== null;
}
export function dispatchStudyShortcut(event: KeyboardEvent, handlers: StudyShortcutHandlers): void {
  if (event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) {
    return;
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    handlers.end();
    return;
  }
  if (event.key === 'z' || event.key === 'Z') {
    event.preventDefault();
    handlers.undo();
    return;
  }
  if (activatesFocusedControl(event)) {
    return;
  }
  dispatchRevealAndRating(event, handlers);
}
function dispatchRevealAndRating(event: KeyboardEvent, handlers: StudyShortcutHandlers): void {
  if (!handlers.revealed && (event.key === ' ' || event.key === 'Enter')) {
    event.preventDefault();
    handlers.reveal();
    return;
  }
  if (handlers.revealed && event.key === ' ') {
    event.preventDefault();
    handlers.rate(3);
    return;
  }
  const rating = RATING_BY_KEY[event.key];
  if (handlers.revealed && rating !== undefined) {
    event.preventDefault();
    handlers.rate(rating);
  }
}
