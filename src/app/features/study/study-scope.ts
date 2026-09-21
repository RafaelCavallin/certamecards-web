import type { ParamMap } from '@angular/router';
import type { SessionScope } from '../../core/study/study-session.model';

export function resolveScope(queryParamMap: ParamMap): SessionScope {
  const deckId = queryParamMap.get('deck');
  if (deckId !== null) {
    return { kind: 'deck', deckId };
  }
  const subjectId = queryParamMap.get('subject');
  if (subjectId !== null) {
    return { kind: 'subject', subjectId };
  }
  return { kind: 'all' };
}
