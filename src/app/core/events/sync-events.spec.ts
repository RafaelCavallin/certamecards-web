import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { EventsService } from './events-service';
import { SyncEvents } from './sync-events';

it('TU — telemetria de sync só envia propriedades enumeradas', () => {
  const record = vi.fn();
  TestBed.configureTestingModule({ providers: [{ provide: EventsService, useValue: { record } }] });
  TestBed.inject(SyncEvents).actionRequired('card_update', 'validation_failed');
  expect(record).toHaveBeenCalledWith('sync_action_required', { kind: 'card_update', code: 'validation_failed' });
});
