import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { EventsService } from '../events/events-service';
import { InstallTracker } from './install-tracker';

it('TU — registra pwa_installed quando o navegador dispara appinstalled', () => {
  const record = vi.fn();
  TestBed.configureTestingModule({ providers: [{ provide: EventsService, useValue: { record } }] });
  const tracker = TestBed.inject(InstallTracker);
  tracker.listen();
  window.dispatchEvent(new Event('appinstalled'));
  expect(record).toHaveBeenCalledWith('pwa_installed', {});
});
