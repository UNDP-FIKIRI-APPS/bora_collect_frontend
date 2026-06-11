import { test, expect } from '@playwright/test';
import { isBackendAvailable } from './helpers';

const credentials = {
  admin: { email: 'admin@fikiri.co', password: 'admin123456', path: '/admin' },
  pm: { email: 'pm@example.com', password: 'pm123456', path: '/project-manager' },
  analyst: { email: 'analyste@test.com', password: 'analyst123', path: '/analyst-home' },
  controller: { email: 'controller@test.com', password: 'controller123', path: '/controleur' },
};

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Adresse email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: /connexion|connecter|se connecter/i }).click();
}

test.describe('Authentication', () => {
  test('shows error on invalid credentials', async ({ page, request }) => {
    test.skip(!(await isBackendAvailable(request)), 'Backend not running on localhost:3000');

    await login(page, 'invalid@example.com', 'wrongpassword');
    await expect(page.getByText(/incorrect|invalide|erreur/i)).toBeVisible({ timeout: 10_000 });
  });

  for (const [role, cred] of Object.entries(credentials)) {
    test(`${role} can login and reach dashboard`, async ({ page, request }) => {
      test.skip(!(await isBackendAvailable(request)), 'Backend not running on localhost:3000');

      await login(page, cred.email, cred.password);
      await page.waitForURL(new RegExp(cred.path.replace('/', '\\/')), { timeout: 15_000 });
      await expect(page).toHaveURL(new RegExp(cred.path));
    });
  }
});
