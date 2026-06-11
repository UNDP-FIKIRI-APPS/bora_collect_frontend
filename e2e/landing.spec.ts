import { test, expect } from '@playwright/test';

test('landing page loads', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await expect(page).toHaveTitle(/Fikiri|Collect/i, { timeout: 30_000 });
});

test('login page is reachable', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('button', { name: /connexion|connecter|se connecter/i })).toBeVisible();
});
