import enhancedApiService from '../services/enhancedApiService';

/** Mode cookies httpOnly (défaut si VITE_USE_HTTPONLY_COOKIES !== 'false') */
export function useHttpOnlyCookies(): boolean {
  return import.meta.env.VITE_USE_HTTPONLY_COOKIES !== 'false';
}

/** Session utilisateur valide (user en localStorage ; token requis seulement hors mode cookies) */
export function isAuthenticated(): boolean {
  const userRaw = localStorage.getItem('user');
  if (!userRaw) return false;
  try {
    const user = JSON.parse(userRaw);
    if (!user?.id) return false;
  } catch {
    return false;
  }
  if (useHttpOnlyCookies()) return true;
  return !!localStorage.getItem('token');
}

/** Token JWT en localStorage (null en mode cookies — l'auth passe par les cookies) */
export function getStoredAccessToken(): string | null {
  if (useHttpOnlyCookies()) return null;
  return localStorage.getItem('token');
}

export function clearAuthStorage(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  localStorage.removeItem('sessionId');
  localStorage.removeItem('currentUserId');
  localStorage.removeItem('forceLogout');
  localStorage.removeItem('offlineSubmissions');
  localStorage.removeItem('local_records');
  localStorage.removeItem('sync_status');
  enhancedApiService.invalidateCache();
}

export async function performLogout(navigate?: (path: string) => void): Promise<void> {
  try {
    await enhancedApiService.logout();
    return;
  } catch {
    // fallback nettoyage local
  }
  clearAuthStorage();
  if (navigate) {
    navigate('/login');
  } else if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}
