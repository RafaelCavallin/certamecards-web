import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthApi } from '../../../core/api/auth-api';
import { AUTH_PATHS } from '../../../core/auth/auth-constants';
import { AuthStore } from '../../../core/auth/auth-store';
import { postLoginRedirectPath } from '../../../core/auth/post-login-redirect';

@Component({
  selector: 'app-google-complete-page',
  templateUrl: './google-complete-page.html',
})
export class GoogleCompletePage {
  private readonly authApi = inject(AuthApi);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  constructor() {
    void this.complete();
  }

  private async complete(): Promise<void> {
    try {
      const response = await this.authApi.refresh();
      this.authStore.setSession(response);
      await this.router.navigateByUrl(postLoginRedirectPath(response.user.termsAccepted));
    } catch {
      await this.router.navigate([AUTH_PATHS.login], { queryParams: { erro: 'google' } });
    }
  }
}
