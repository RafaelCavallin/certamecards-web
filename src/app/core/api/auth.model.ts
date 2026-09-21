export type UserRole = 'candidate' | 'admin';
export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: UserRole;
  readonly termsAccepted: boolean;
}
export interface AuthResponse {
  readonly accessToken: string;
  readonly expiresIn: number;
  readonly user: AuthUser;
}
export interface RegisterRequest {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
  readonly acceptedTermsVersion: string;
  readonly timeZone: string;
}
export interface LoginRequest {
  readonly email: string;
  readonly password: string;
}
export interface ResetPasswordRequest {
  readonly token: string;
  readonly newPassword: string;
}
export interface GoogleLinkRequest {
  readonly token: string;
  readonly password: string;
}
export interface DeleteAccountRequest {
  readonly password: string | null;
  readonly reauthToken: string | null;
}
export interface AcceptTermsRequest {
  readonly version: string;
}
export interface UpdateDisplayNameRequest {
  readonly displayName: string;
}
