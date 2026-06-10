import { environment } from '../config/environment';
import enhancedApiService from '../services/enhancedApiService';

export function clearAuthStorage(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  localStorage.removeItem('sessionId');
  localStorage.removeItem('currentUserId');
  localStorage.removeItem('forceLogout');
  enhancedApiService.invalidateCache();
}

export async function performLogout(navigate?: (path: string) => void): Promise<void> {
  const token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refresh_token');
  try {
    if (token) {
      await fetch(`${environment.apiBaseUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    }
  } catch {
    // Nettoyage local même si l'API échoue
  }
  clearAuthStorage();
  if (navigate) {
    navigate('/login');
  } else if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}
