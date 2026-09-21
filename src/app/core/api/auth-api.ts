import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  AcceptTermsRequest,
  AuthResponse,
  AuthUser,
  DeleteAccountRequest,
  GoogleLinkRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  UpdateDisplayNameRequest,
} from './auth.model';

const AUTH_BASE = `${environment.apiBaseUrl}/auth`;
const ME_BASE = `${environment.apiBaseUrl}/me`;
const CLIENT_HEADER_NAME = 'X-Certame-Client';
const CLIENT_HEADER_VALUE = 'web';
const COOKIE_REQUEST_OPTIONS = { withCredentials: true, headers: { [CLIENT_HEADER_NAME]: CLIENT_HEADER_VALUE } };
@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);

  register(request: RegisterRequest): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${AUTH_BASE}/register`, request));
  }

  confirmEmail(token: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${AUTH_BASE}/confirm-email`, { token }));
  }

  resendConfirmation(email: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${AUTH_BASE}/resend-confirmation`, { email }));
  }

  login(request: LoginRequest): Promise<AuthResponse> {
    return firstValueFrom(this.http.post<AuthResponse>(`${AUTH_BASE}/login`, request));
  }

  refresh(): Promise<AuthResponse> {
    return firstValueFrom(
      this.http.post<AuthResponse>(`${AUTH_BASE}/refresh`, {}, COOKIE_REQUEST_OPTIONS),
    );
  }

  logout(): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${AUTH_BASE}/logout`, {}, COOKIE_REQUEST_OPTIONS));
  }

  forgotPassword(email: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${AUTH_BASE}/password/forgot`, { email }));
  }

  resetPassword(request: ResetPasswordRequest): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${AUTH_BASE}/password/reset`, request));
  }

  linkGoogle(request: GoogleLinkRequest): Promise<AuthResponse> {
    return firstValueFrom(this.http.post<AuthResponse>(`${AUTH_BASE}/google/link`, request));
  }

  me(): Promise<AuthUser> {
    return firstValueFrom(this.http.get<AuthUser>(ME_BASE));
  }

  updateDisplayName(request: UpdateDisplayNameRequest): Promise<AuthUser> {
    return firstValueFrom(this.http.patch<AuthUser>(ME_BASE, request));
  }

  acceptTerms(request: AcceptTermsRequest): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${ME_BASE}/terms`, request));
  }

  deleteAccount(request: DeleteAccountRequest): Promise<void> {
    return firstValueFrom(this.http.delete<void>(ME_BASE, { body: request }));
  }
}
