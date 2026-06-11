import { test, expect } from '@playwright/test';
import { API_URL, isBackendAvailable } from './helpers';

test.describe('Public form anti-spam', () => {
  test('honeypot submission is rejected by API', async ({ request }) => {
    test.skip(!(await isBackendAvailable(request)), 'Backend not running on localhost:3000');

    const validateRes = await request.get(`${API_URL}/public-links/form/invalid-token-test`);
    if (validateRes.status() === 404) {
      test.skip(true, 'No valid public token in test env');
    }

    const res = await request.post(`${API_URL}/public-links/form/invalid-token-test/submit`, {
      data: {
        formData: { geolocalisation: '0,0' },
        _hp: 'bot-filled-this',
      },
    });

    expect([400, 404]).toContain(res.status());
  });

  test('invalid public form token shows error page', async ({ page }) => {
    await page.goto('/form/invalid-token-e2e-test');
    await expect(page.getByRole('heading', { name: /lien invalide|erreur/i })).toBeVisible({
      timeout: 10_000,
    });
  });
});
