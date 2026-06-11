import type { APIRequestContext } from '@playwright/test';

export const API_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3000';

export async function isBackendAvailable(request: APIRequestContext): Promise<boolean> {
  try {
    const res = await request.get(`${API_URL}/health`, { timeout: 5000 });
    return res.ok();
  } catch {
    return false;
  }
}
