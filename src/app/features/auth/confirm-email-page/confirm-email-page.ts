import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { extractApiError } from '../../../core/api/api-error.model';
import { AuthApi } from '../../../core/api/auth-api';
import { RESEND_CONFIRMATION_COOLDOWN_MS } from '../../../core/auth/auth-constants';
import { parseFragmentToken } from '../../../core/auth/fragment-token';
import { EventsService } from '../../../core/events/events-service';

type ConfirmEmailStatus = 'pending' | 'confirming' | 'confirmed' | 'expired' | 'error';
@Component({
  selector: 'app-confirm-email-page',
  imports: [FormField, RouterLink],
  templateUrl: './confirm-email-page.html',
})
export class ConfirmEmailPage {
  private readonly authApi = inject(AuthApi);
  private readonly route = inject(ActivatedRoute);
  private readonly eventsService = inject(EventsService);

  protected readonly status = signal<ConfirmEmailStatus>('pending');
  protected readonly resendDisabled = signal(false);
  protected readonly resendModel = signal({ email: this.route.snapshot.queryParamMap.get('email') ?? '' });
  protected readonly resendForm = form(this.resendModel, (schemaPath) => {
    required(schemaPath.email, { message: 'Informe o e-mail.' });
    email(schemaPath.email, { message: 'Informe um e-mail válido.' });
  });

  constructor() {
    const token = parseFragmentToken(this.route.snapshot.fragment, 'token');
    if (token !== '') {
      void this.confirmToken(token);
    }
  }

  protected onResend(): void {
    void submit(this.resendForm, async () => {
      await this.attemptResend();
    });
  }

  private async confirmToken(token: string): Promise<void> {
    this.status.set('confirming');
    try {
      await this.authApi.confirmEmail(token);
      this.status.set('confirmed');
      void this.eventsService.record('signup_completed', {});
    } catch (error) {
      const apiError = extractApiError(error);
      const wasUsedOrExpired = apiError?.code === 'token_used' || apiError?.code === 'token_expired';
      this.status.set(wasUsedOrExpired ? 'expired' : 'error');
    }
  }

  private async attemptResend(): Promise<void> {
    this.resendDisabled.set(true);
    try {
      await this.authApi.resendConfirmation(this.resendModel().email);
    } finally {
      setTimeout(() => this.resendDisabled.set(false), RESEND_CONFIRMATION_COOLDOWN_MS);
    }
  }
}
