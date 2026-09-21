import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';

export const STUDY_ROUTE_PREFIX = '/estudar';
@Injectable({ providedIn: 'root' })
export class ServiceWorkerUpdates {
  private readonly swUpdate = inject(SwUpdate);
  private readonly router = inject(Router);
  private updateReady = false;
  private reload = (): void => document.location.reload();

  listen(reload?: () => void): void {
    if (reload !== undefined) {
      this.reload = reload;
    }
    if (!this.swUpdate.isEnabled) {
      return;
    }
    this.swUpdate.versionUpdates
      .pipe(filter((event) => event.type === 'VERSION_READY'))
      .subscribe(() => this.onUpdateReady());
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.applyIfOutsideSession(event.urlAfterRedirects));
  }

  private onUpdateReady(): void {
    this.updateReady = true;
    this.applyIfOutsideSession(this.router.url);
  }

  private applyIfOutsideSession(url: string): void {
    if (!this.updateReady || url.startsWith(STUDY_ROUTE_PREFIX)) {
      return;
    }
    this.updateReady = false;
    void this.swUpdate.activateUpdate().then(() => this.reload());
  }
}
