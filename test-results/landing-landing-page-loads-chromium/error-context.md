# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landing.spec.ts >> landing page loads
- Location: e2e\landing.spec.ts:3:1

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.goto: Test timeout of 60000ms exceeded.
Call log:
  - navigating to "http://localhost:5173/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('landing page loads', async ({ page }) => {
> 4  |   await page.goto('/');
     |              ^ Error: page.goto: Test timeout of 60000ms exceeded.
  5  |   await expect(page).toHaveTitle(/Fikiri|Collect/i);
  6  | });
  7  | 
  8  | test('login page is reachable', async ({ page }) => {
  9  |   await page.goto('/login');
  10 |   await expect(page.getByRole('button', { name: /connexion|connecter|se connecter/i })).toBeVisible();
  11 | });
  12 | 
```