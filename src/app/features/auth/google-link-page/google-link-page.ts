import { Component, inject, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { extractApiError } from '../../../core/api/api-error.model';
import { AuthApi } from '../../../core/api/auth-api';
import { AuthStore } from '../../../core/auth/auth-store';
import { parseFragmentToken } from '../../../core/auth/fragment-token';
import { postLoginRedirectPath } from '../../../core/auth/post-login-redirect';

const LINK_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Senha incorreta.',
  token_expired: 'Esse link expirou. Faça login com o Google novamente.',
  token_used: 'Esse link já foi usado. Faça login com o Google novamente.',
};
const DEFAULT_LINK_ERROR_MESSAGE = 'Não foi possível vincular sua conta.';
function linkErrorMessage(apiError: { code: string } | null): string {
  if (apiError === null) {
    return DEFAULT_LINK_ERROR_MESSAGE;
  }
  return LINK_ERROR_MESSAGES[apiError.code] ?? DEFAULT_LINK_ERROR_MESSAGE;
}
@Component({
  selector: 'app-google-link-page',
  imports: [FormField],
  templateUrl: './google-link-page.html',
})
export class GoogleLinkPage {
  private readonly authApi = inject(AuthApi);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly linkToken = parseFragmentToken(inject(ActivatedRoute).snapshot.fragment, 'token');

  protected readonly model = signal({ password: '' });
  protected readonly linkForm = form(this.model, (schemaPath) => {
    required(schemaPath.password, { message: 'Informe a senha da sua conta.' });
  });

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected onSubmit(): void {
    void submit(this.linkForm, async () => {
      this.errorMessage.set(null);
      this.submitting.set(true);
      try {
        await this.attemptLink();
      } finally {
        this.submitting.set(false);
      }
    });
  }

  private async attemptLink(): Promise<void> {
    try {
      const response = await this.authApi.linkGoogle({ token: this.linkToken, password: this.model().password });
      await this.authStore.setSession(response);
      await this.router.navigateByUrl(postLoginRedirectPath(response.user.termsAccepted));
    } catch (error) {
      this.errorMessage.set(linkErrorMessage(extractApiError(error)));
    }
  }
}
