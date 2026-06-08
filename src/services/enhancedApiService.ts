import { environment } from '../config/environment';
import { toast } from 'react-toastify';

// Types pour le cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  skipCache?: boolean;
  retry?: number;
  retryDelay?: number;
}

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

/**
 * Service API amélioré avec :
 * - Gestion d'erreurs centralisée
 * - Refresh token automatique
 * - Cache HTTP et mémoire
 * - Retry automatique
 * - Déduplication des requêtes
 * - Logging structuré
 */
class EnhancedApiService {
  private baseURL: string;
  private timeout: number;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private refreshTokenPromise: Promise<string> | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes par défaut
  private readonly DEDUP_WINDOW = 1000; // 1 seconde pour la déduplication
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 seconde

  constructor() {
    this.baseURL = environment.apiBaseUrl;
    this.timeout = environment.apiTimeout;
    
    // Nettoyer le cache toutes les 10 minutes
    setInterval(() => this.cleanCache(), 10 * 60 * 1000);
    
    // Nettoyer les requêtes en attente expirées
    setInterval(() => this.cleanPendingRequests(), 60 * 1000);
  }

  /**
   * Obtient le token depuis localStorage
   */
  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  /**
   * Sauvegarde les tokens de session
   */
  private setTokens(accessToken: string, refreshToken?: string, sessionId?: string): void {
    localStorage.setItem('token', accessToken);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
    if (sessionId) {
      localStorage.setItem('sessionId', sessionId);
    }
  }

  /**
   * Rafraîchit le token automatiquement via refresh_token
   */
  private async refreshToken(): Promise<string> {
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }

    this.refreshTokenPromise = (async () => {
      try {
        const storedRefreshToken = this.getRefreshToken();
        if (!storedRefreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await fetch(`${this.baseURL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: storedRefreshToken }),
        });

        if (!response.ok) {
          throw new Error('Token refresh failed');
        }

        const data = await response.json();
        const newToken = data.access_token || data.token;

        if (newToken) {
          this.setTokens(newToken, data.refresh_token, data.session_id);
          return newToken;
        }

        throw new Error('No token in refresh response');
      } catch (error) {
        this.handleAuthError();
        throw error;
      } finally {
        this.refreshTokenPromise = null;
      }
    })();

    return this.refreshTokenPromise;
  }

  /**
   * Déconnexion côté serveur puis nettoyage local
   */
  async logout(): Promise<void> {
    const token = this.getToken();
    const refreshToken = this.getRefreshToken();
    try {
      if (token) {
        await fetch(`${this.baseURL}/auth/logout`, {
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
    this.handleAuthError();
  }

  /**
   * Gère les erreurs d'authentification
   */
  private handleAuthError(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('sessionId');
    localStorage.removeItem('currentUserId');
    
    // Rediriger vers la page de login
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  /**
   * Génère une clé de cache à partir de l'URL et des options
   */
  private getCacheKey(url: string, options?: RequestOptions): string {
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  /**
   * Vérifie si une entrée de cache est valide
   */
  private isCacheValid(entry: CacheEntry<any>): boolean {
    return Date.now() < entry.expiresAt;
  }

  /**
   * Nettoie le cache expiré
   */
  private cleanCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Nettoie les requêtes en attente expirées
   */
  private cleanPendingRequests(): void {
    const now = Date.now();
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.DEDUP_WINDOW * 10) {
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * Parse la réponse JSON de manière sécurisée
   */
  private async parseResponse(response: Response): Promise<any> {
    const text = await response.text();
    
    if (!text || text.trim() === '') {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      console.error('❌ Erreur de parsing JSON:', error, 'Réponse:', text);
      throw new Error('Réponse invalide du serveur');
    }
  }

  /**
   * Gère les erreurs HTTP de manière centralisée
   */
  private async handleError(response: Response, url: string, retryCount: number = 0, skipAuth: boolean = false): Promise<never> {
    const status = response.status;
    
    // 401 Unauthorized - Essayer de rafraîchir le token (sauf pour les requêtes de login)
    if (status === 401 && retryCount === 0 && !skipAuth) {
      try {
        await this.refreshToken();
        // Ne pas relancer automatiquement, laisser l'appelant décider
        throw new Error('UNAUTHORIZED_RETRY');
      } catch (error) {
        // Si le refresh échoue, déconnecter l'utilisateur
        this.handleAuthError();
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }
    }
    
    // 401 pour les requêtes de login - ne pas rediriger, juste retourner l'erreur
    if (status === 401 && skipAuth) {
      const errorData = await this.parseResponse(response).catch(() => ({}));
      throw new Error(errorData.message || 'Identifiants incorrects');
    }

    // 403 Forbidden
    if (status === 403) {
      const errorData = await this.parseResponse(response).catch(() => ({}));
      throw new Error(errorData.message || 'Accès refusé. Vous n\'avez pas les permissions nécessaires.');
    }

    // 404 Not Found
    if (status === 404) {
      throw new Error('Ressource non trouvée');
    }

    // 429 Too Many Requests
    if (status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
      throw new Error(`Trop de requêtes. Réessayez dans ${delay / 1000} secondes.`);
    }

    // 500-599 Server Errors
    if (status >= 500) {
      const errorData = await this.parseResponse(response).catch(() => ({}));
      throw new Error(errorData.message || `Erreur serveur (${status}). Veuillez réessayer plus tard.`);
    }

    // Autres erreurs
    const errorData = await this.parseResponse(response).catch(() => ({}));
    throw new Error(errorData.message || `Erreur HTTP ${status}`);
  }

  /**
   * Effectue une requête avec retry automatique
   */
  private async requestWithRetry<T>(
    url: string,
    options: RequestOptions = {},
    retryCount: number = 0
  ): Promise<T> {
    const {
      skipAuth = false,
      skipCache = false,
      retry = this.MAX_RETRIES,
      retryDelay = this.RETRY_DELAY,
      ...fetchOptions
    } = options;

    // Vérifier le cache pour les requêtes GET
    if (!skipCache && fetchOptions.method === 'GET' || !fetchOptions.method) {
      const cacheKey = this.getCacheKey(url, options);
      const cached = this.cache.get(cacheKey);
      
      if (cached && this.isCacheValid(cached)) {
        return cached.data;
      }
    }

    // Déduplication des requêtes identiques
    const dedupKey = this.getCacheKey(url, options);
    const pending = this.pendingRequests.get(dedupKey);
    
    if (pending && Date.now() - pending.timestamp < this.DEDUP_WINDOW) {
      return pending.promise;
    }

    // Créer la requête
    const requestPromise = (async () => {
      try {
        // Ajouter le token d'authentification
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(fetchOptions.headers as Record<string, string> || {}),
        };

        if (!skipAuth) {
          const token = this.getToken();
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
        }

        // Créer l'AbortController pour le timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        // Effectuer la requête
        const response = await fetch(url, {
          ...fetchOptions,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Gérer les erreurs
        if (!response.ok) {
          // Si 401 et première tentative, essayer de rafraîchir le token
          // MAIS seulement si ce n'est pas une requête de login (skipAuth)
          if (response.status === 401 && retryCount === 0 && !skipAuth) {
            try {
              await this.refreshToken();
              // Relancer la requête avec le nouveau token
              return this.requestWithRetry<T>(url, options, retryCount + 1);
            } catch (error) {
              // Si le refresh échoue, gérer l'erreur normalement
              await this.handleError(response, url, retryCount, skipAuth);
            }
          } else {
            // Pour les autres erreurs ou si skipAuth, gérer normalement
            await this.handleError(response, url, retryCount, skipAuth);
          }
        }

        // Parser la réponse
        const data = await this.parseResponse(response);

        // Mettre en cache pour les requêtes GET
        if (!skipCache && (fetchOptions.method === 'GET' || !fetchOptions.method)) {
          const cacheKey = this.getCacheKey(url, options);
          const cacheControl = response.headers.get('Cache-Control');
          let ttl = this.CACHE_TTL;

          // Parser Cache-Control header
          if (cacheControl) {
            const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
            if (maxAgeMatch) {
              ttl = parseInt(maxAgeMatch[1]) * 1000;
            }
          }

          this.cache.set(cacheKey, {
            data,
            timestamp: Date.now(),
            expiresAt: Date.now() + ttl,
          });
        }

        return data;
      } catch (error: any) {
        // Retry automatique pour les erreurs réseau
        if (
          retryCount < retry &&
          (error.name === 'AbortError' || 
           error.name === 'TypeError' || 
           error.message?.includes('fetch') ||
           error.message === 'UNAUTHORIZED_RETRY')
        ) {
          // Attendre avant de retry
          await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));
          
          // Relancer la requête
          return this.requestWithRetry<T>(url, options, retryCount + 1);
        }

        // Logger l'erreur
        console.error(`❌ API Error [${fetchOptions.method || 'GET'} ${url}]:`, error);

        // Afficher un toast pour les erreurs critiques
        if (error.message && !error.message.includes('UNAUTHORIZED_RETRY')) {
          toast.error(error.message);
        }

        throw error;
      } finally {
        // Retirer de la liste des requêtes en attente
        this.pendingRequests.delete(dedupKey);
      }
    })();

    // Ajouter à la liste des requêtes en attente
    this.pendingRequests.set(dedupKey, {
      promise: requestPromise,
      timestamp: Date.now(),
    });

    return requestPromise;
  }

  /**
   * Méthode générique pour effectuer des requêtes
   */
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    // Détecter si l'endpoint est déjà une URL complète (commence par http:// ou https://)
    const isFullUrl = endpoint.startsWith('http://') || endpoint.startsWith('https://');
    const url = isFullUrl ? endpoint : `${this.baseURL}${endpoint}`;
    return this.requestWithRetry<T>(url, options);
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Upload file
   */
  async upload<T>(endpoint: string, formData: FormData, options: RequestOptions = {}): Promise<T> {
    // Détecter si l'endpoint est déjà une URL complète (commence par http:// ou https://)
    const isFullUrl = endpoint.startsWith('http://') || endpoint.startsWith('https://');
    const url = isFullUrl ? endpoint : `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {};
    if (!options.skipAuth) {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return this.requestWithRetry<T>(url, {
      ...options,
      method: 'POST',
      headers,
      body: formData,
      skipCache: true, // Ne pas cacher les uploads
    });
  }

  /**
   * Invalide le cache pour un endpoint spécifique
   */
  invalidateCache(endpoint?: string): void {
    if (endpoint) {
      // Détecter si l'endpoint est déjà une URL complète (commence par http:// ou https://)
      const isFullUrl = endpoint.startsWith('http://') || endpoint.startsWith('https://');
      const url = isFullUrl ? endpoint : `${this.baseURL}${endpoint}`;
      for (const [key] of this.cache.entries()) {
        if (key.includes(url)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Invalider tout le cache
      this.cache.clear();
    }
  }

  /**
   * Nettoie toutes les données (cache, requêtes en attente)
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }
}

// Instance singleton
export const enhancedApiService = new EnhancedApiService();
export default enhancedApiService;

