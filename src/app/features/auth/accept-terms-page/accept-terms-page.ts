import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthApi } from '../../../core/api/auth-api';
import { AUTH_PATHS, TERMS_CURRENT_VERSION } from '../../../core/auth/auth-constants';
import { AuthStore } from '../../../core/auth/auth-store';

@Component({
  selector: 'app-accept-terms-page',
  templateUrl: './accept-terms-page.html',
})
export class AcceptTermsPage {
  private readonly authApi = inject(AuthApi);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected onAccept(): void {
    void this.acceptTerms();
  }

  private async acceptTerms(): Promise<void> {
    this.submitting.set(true);
    try {
      await this.authApi.acceptTerms({ version: TERMS_CURRENT_VERSION });
      this.applyAcceptedTerms();
      await this.router.navigateByUrl(AUTH_PATHS.home);
    } catch {
      this.errorMessage.set('Não foi possível registrar o aceite. Tente de novo.');
    } finally {
      this.submitting.set(false);
    }
  }

  private applyAcceptedTerms(): void {
    const currentUser = this.authStore.user();
    if (currentUser !== null) {
      this.authStore.updateUser({ ...currentUser, termsAccepted: true });
    }
  }
}
