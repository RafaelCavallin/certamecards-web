import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { expect, it, vi } from 'vitest';
import { ServiceWorkerUpdates } from './service-worker-updates';

interface RouterStub {
  readonly events: Subject<NavigationEnd>;
  url: string;
}
function setup(isEnabled: boolean): {
  service: ServiceWorkerUpdates;
  versionUpdates: Subject<{ type: string }>;
  router: RouterStub;
  activateUpdate: ReturnType<typeof vi.fn>;
} {
  const versionUpdates = new Subject<{ type: string }>();
  const router: RouterStub = { events: new Subject<NavigationEnd>(), url: '/' };
  const activateUpdate = vi.fn().mockResolvedValue(true);
  const swUpdate = { isEnabled, versionUpdates, activateUpdate };
  TestBed.configureTestingModule({
    providers: [
      { provide: SwUpdate, useValue: swUpdate },
      { provide: Router, useValue: router },
    ],
  });
  return { service: TestBed.inject(ServiceWorkerUpdates), versionUpdates, router, activateUpdate };
}

it('TU — não escuta atualizações quando o service worker está desligado', () => {
  const { service, versionUpdates, activateUpdate } = setup(false);
  service.listen();
  versionUpdates.next({ type: 'VERSION_READY' });
  expect(activateUpdate).not.toHaveBeenCalled();
});

it('TU — aplica a atualização imediatamente quando fora da sessão de estudo', async () => {
  const { service, versionUpdates, activateUpdate } = setup(true);
  service.listen(vi.fn());
  versionUpdates.next({ type: 'VERSION_READY' });
  await Promise.resolve();
  await Promise.resolve();
  expect(activateUpdate).toHaveBeenCalledOnce();
});

it('TU — adia a atualização enquanto a rota é a de estudo e aplica ao sair dela', async () => {
  const { service, versionUpdates, router, activateUpdate } = setup(true);
  router.url = '/estudar';
  service.listen(vi.fn());
  versionUpdates.next({ type: 'VERSION_READY' });
  await Promise.resolve();
  expect(activateUpdate).not.toHaveBeenCalled();
  router.events.next(new NavigationEnd(1, '/', '/'));
  await Promise.resolve();
  await Promise.resolve();
  expect(activateUpdate).toHaveBeenCalledOnce();
});
