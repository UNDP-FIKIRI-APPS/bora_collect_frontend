// Configuration de l'environnement pour le frontend
export interface EnvironmentConfig {
  apiBaseUrl: string;
  apiTimeout: number;
  appName: string;
  appVersion: string;
  enableHttps: boolean;
  enableDebug: boolean;
}

// Fonction pour détecter automatiquement l'environnement et l'URL de l'API
const getApiBaseUrl = (): string => {
  let hostname = '';
  if (typeof window !== 'undefined' && window.location) {
    hostname = window.location.hostname;
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '') {
    return 'http://localhost:3000';
  }

  if (hostname.includes('fikiri.co') || hostname.includes('collect.fikiri.co')) {
    return 'https://api.collect.fikiri.co';
  }

  const envApiUrl = import.meta.env.VITE_API_BASE_URL;
  if (envApiUrl && envApiUrl.trim() !== '') {
    if (envApiUrl.includes('localhost:8001') && (hostname === 'localhost' || hostname === '127.0.0.1')) {
      return 'http://localhost:3000';
    }
    return envApiUrl;
  }

  const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';
  if (isProduction) {
    return 'https://api.collect.fikiri.co';
  }

  return 'http://localhost:3000';
};

// Configuration globale de l'environnement
export const environment: EnvironmentConfig = {
  apiBaseUrl: getApiBaseUrl(),
  apiTimeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000'),
  appName: import.meta.env.VITE_APP_NAME || 'FikiriCollect',
  appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
  enableHttps: import.meta.env.VITE_ENABLE_HTTPS === 'true',
  enableDebug: import.meta.env.VITE_ENABLE_DEBUG === 'true',
};

// Configuration par défaut pour le développement
export const defaultConfig: EnvironmentConfig = {
  apiBaseUrl: getApiBaseUrl(),
  apiTimeout: 30000,
  appName: 'FikiriCollect',
  appVersion: '1.0.0',
  enableHttps: false,
  enableDebug: false,
};

// Fonction utilitaire pour obtenir la configuration
export const getConfig = (): EnvironmentConfig => {
  try {
    return environment;
  } catch (error) {
    console.error('Error loading environment configuration:', error);
    return defaultConfig;
  }
};

// Configuration exportée par défaut
export default getConfig();
