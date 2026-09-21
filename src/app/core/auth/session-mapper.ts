import type { AuthUser } from '../api/auth.model';
import type { StoredSession } from '../db/local-db.model';

export function toAuthUser(session: StoredSession): AuthUser {
  return {
    id: session.userId,
    email: session.email,
    displayName: session.displayName,
    role: session.role,
    termsAccepted: session.termsAccepted,
  };
}
export function toStoredSession(user: AuthUser): StoredSession {
  return {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    termsAccepted: user.termsAccepted,
  };
}
