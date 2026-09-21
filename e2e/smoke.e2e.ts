import { test, expect } from './fixtures/test';

test('smoke — o app abre em https://certamecards.localhost', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('CertameCards');
});
