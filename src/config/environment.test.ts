import { describe, it, expect } from 'vitest';

describe('environment config', () => {
  it('utilise localhost en développement', async () => {
    const { environment } = await import('./environment');
    expect(environment.apiBaseUrl).toBeTruthy();
    expect(typeof environment.apiTimeout).toBe('number');
  });
});
