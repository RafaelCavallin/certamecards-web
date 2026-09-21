import type { Page } from '@playwright/test';

export async function waitForServiceWorker(page: Page): Promise<void> {
  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration !== undefined && registration.active !== null;
  });
  await page.waitForFunction(idleTaskQueueIsEmpty, undefined, { timeout: 30_000 });
  // O prefetch de "installMode: prefetch" nem sempre baixa 100% dos chunks lazy antes de o
  // driver reportar estado NORMAL (observado neste ambiente); forçar um fetch de cada recurso
  // do grupo "shell" garante que a sessão de estudo funcione mesmo offline sem nunca ter sido
  // visitada antes.
  await page.evaluate(warmShellCache);
  await page.reload();
}
async function idleTaskQueueIsEmpty(): Promise<boolean> {
  const state = await (await fetch('/ngsw/state')).text();
  const taskQueue = /Task queue:\n([\s\S]*?)\n\nDebug log/.exec(state)?.[1]?.trim() ?? '';
  return taskQueue.length === 0;
}
async function warmShellCache(): Promise<void> {
  const manifest = (await (await fetch('/ngsw.json')).json()) as {
    assetGroups: readonly { name: string; urls: readonly string[] }[];
  };
  const shellUrls = manifest.assetGroups.find((group) => group.name === 'shell')?.urls ?? [];
  await Promise.all(shellUrls.map((url) => fetch(url, { cache: 'reload' })));
}
