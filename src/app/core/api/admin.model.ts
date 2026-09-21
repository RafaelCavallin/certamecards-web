export interface AdminSubject {
  readonly id: string;
  readonly name: string;
  readonly active: boolean;
  readonly changeSeq: number | null;
  readonly deckCount: number;
}
export interface CreateSubjectRequest {
  readonly name: string;
}
export interface UpdateSubjectRequest {
  readonly name?: string;
  readonly active?: boolean;
}
export interface AdminUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
}
export interface GrantAdminRequest {
  readonly email: string;
}
