import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { extractApiError } from '../../../core/api/api-error.model';
import { AuthApi } from '../../../core/api/auth-api';
import { AUTH_PATHS } from '../../../core/auth/auth-constants';
import { AuthStore } from '../../../core/auth/auth-store';
import { postLoginRedirectPath } from '../../../core/auth/post-login-redirect';
import { formatRetryAfter, loginErrorMessage } from './login-errors';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login-page',
  imports: [FormField, RouterLink],
  templateUrl: './login-page.html',
})
export class LoginPage {
  private readonly authApi = inject(AuthApi);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly googleAuthorizationUrl = `${AUTH_PATHS.googleAuthorization}?intent=login`;
  protected readonly googleSignInEnabled = environment.googleSignInEnabled;
  protected readonly model = signal({ email: '', password: '' });
  protected readonly loginForm = form(this.model, (schemaPath) => {
    required(schemaPath.email, { message: 'Informe o e-mail.' });
    email(schemaPath.email, { message: 'Informe um e-mail válido.' });
    required(schemaPath.password, { message: 'Informe a senha.' });
  });

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected onSubmit(): void {
    void submit(this.loginForm, async () => {
      this.errorMessage.set(null);
      this.submitting.set(true);
      try {
        await this.attemptLogin();
      } finally {
        this.submitting.set(false);
      }
    });
  }

  private async attemptLogin(): Promise<void> {
    try {
      const response = await this.authApi.login(this.model());
      await this.authStore.setSession(response);
      await this.router.navigateByUrl(postLoginRedirectPath(response.user.termsAccepted));
    } catch (error) {
      this.handleLoginError(error);
    }
  }

  private handleLoginError(error: unknown): void {
    const apiError = extractApiError(error);
    if (apiError?.code === 'login_locked') {
      this.errorMessage.set(formatRetryAfter(apiError.retryAfterSeconds ?? 0));
      return;
    }
    this.errorMessage.set(loginErrorMessage(apiError));
  }
}
