/**
 * Logger conditionnel pour le frontend
 * Ne log que en développement
 * En production, les logs sont supprimés pour améliorer les performances
 */

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;
const isDebugEnabled = import.meta.env.VITE_ENABLE_DEBUG === 'true';

const shouldLog = () => isDevelopment && isDebugEnabled;

/**
 * Masque les données sensibles dans les logs
 */
function maskSensitiveData(data: any): any {
  if (typeof data === 'string') {
    // Masquer les emails (garder seulement les 3 premiers caractères)
    if (data.includes('@')) {
      const [localPart, domain] = data.split('@');
      if (localPart.length > 3) {
        return `${localPart.substring(0, 3)}***@${domain}`;
      }
      return `***@${domain}`;
    }
    // Masquer les tokens (garder seulement les 10 premiers caractères)
    if (data.length > 20 && /^[A-Za-z0-9-_]+$/.test(data)) {
      return `${data.substring(0, 10)}***`;
    }
  }
  if (typeof data === 'object' && data !== null) {
    const masked: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (key.toLowerCase().includes('password') || key.toLowerCase().includes('token') || key.toLowerCase().includes('secret')) {
        masked[key] = '***';
      } else {
        masked[key] = maskSensitiveData(value);
      }
    }
    return masked;
  }
  return data;
}

/**
 * Logger pour le développement uniquement
 */
export const devLogger = {
  log: (...args: any[]) => {
    if (shouldLog()) {
      console.log(...args);
    }
  },
  warn: (...args: any[]) => {
    if (shouldLog()) {
      console.warn(...args);
    }
  },
  debug: (...args: any[]) => {
    if (shouldLog()) {
      console.debug(...args);
    }
  },
  info: (...args: any[]) => {
    if (shouldLog()) {
      console.info(...args);
    }
  },
};

/**
 * Logger pour les erreurs (toujours actif, mais masque les données sensibles)
 */
export const errorLogger = {
  error: (message: string, error?: any, context?: any) => {
    const maskedContext = context ? maskSensitiveData(context) : undefined;
    const errorMessage = error?.message || 'Unknown error';
    
    if (isProduction) {
      // En production, logger uniquement les messages sans données sensibles
      console.error(`[ERROR] ${message}: ${errorMessage}`);
      if (maskedContext) {
        console.error('[CONTEXT]', maskedContext);
      }
    } else {
      // En développement, logger tout
      console.error(`[ERROR] ${message}`, error, context);
    }
  },
};

/**
 * Logger pour les événements de sécurité (toujours actif, masqué)
 */
export const securityLogger = {
  log: (event: string, details?: any) => {
    if (!shouldLog()) return;
    console.log(`[SECURITY] ${event}`, details ? maskSensitiveData(details) : '');
  },
  warn: (event: string, details?: any) => {
    if (!shouldLog()) return;
    console.warn(`[SECURITY] ${event}`, details ? maskSensitiveData(details) : '');
  },
};

/**
 * Logger général (masque les données sensibles en production)
 */
export const logger = {
  log: (...args: any[]) => {
    if (!shouldLog()) return;
    console.log(...args);
  },
  info: (message: string, data?: any) => {
    if (!shouldLog()) return;
    console.info(`[INFO] ${message}`, data || '');
  },
  warn: (...args: any[]) => {
    const maskedArgs = isProduction ? args.map(arg => maskSensitiveData(arg)) : args;
    console.warn(...maskedArgs);
  },
  error: errorLogger.error,
};



