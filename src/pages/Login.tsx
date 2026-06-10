import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { APP_LOGO_URL } from '../config/branding';
import { environment } from '../config/environment';
import enhancedApiService from '../services/enhancedApiService';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Utiliser le chemin relatif - enhancedApiService ajoute déjà baseURL
      const loginEndpoint = '/auth/login';
      console.log('🔗 Tentative de connexion à:', `${environment.apiBaseUrl}${loginEndpoint}`);
      console.log('🔍 Configuration API:', {
        apiBaseUrl: environment.apiBaseUrl,
        envVar: import.meta.env.VITE_API_BASE_URL,
        default: 'http://localhost:3000'
      });
      
      // Utilisation du nouveau service API (skipAuth car c'est le login)
      const data = await enhancedApiService.post<{
        access_token: string;
        refresh_token?: string;
        session_id?: string;
        user: any;
      }>(loginEndpoint, { email: username, password       }, {
        skipAuth: true,
        skipToast: true,
      });
        
        // Vérifier si un autre compte est déjà connecté sur ce navigateur
        const existingUser = localStorage.getItem('user');
        const existingToken = localStorage.getItem('token');
        const existingUserId = existingUser ? JSON.parse(existingUser)?.id : null;
        const newUserId = data.user?.id;
        
        // Si un autre compte est connecté, le déconnecter AVANT de stocker les nouvelles données
        if (existingUserId && existingUserId !== newUserId && existingToken) {
          console.log('⚠️ Détection d\'un autre compte connecté. Déconnexion de l\'ancien compte...');
          console.log('   Ancien compte:', existingUserId);
          console.log('   Nouveau compte:', newUserId);
          
          // IMPORTANT: Déclencher forceLogout AVANT de changer les données
          // Cela permet de déconnecter l'ancien compte dans les autres onglets
          const forceLogoutData = {
            userId: existingUserId,
            timestamp: Date.now(),
            newUserId: newUserId // Inclure le nouvel ID pour référence
          };
          
          // Stocker forceLogout pour notifier les autres onglets
          window.localStorage.setItem('forceLogout', JSON.stringify(forceLogoutData));
          
        }
        
        // Stocker le nouvel identifiant de session
        const sessionId = `session_${newUserId}_${Date.now()}`;
        
        // IMPORTANT: Stocker les nouvelles données APRÈS avoir déclenché forceLogout
        // Cela évite que le nouvel onglet se déconnecte lui-même
        // Stocker dans l'ordre : currentUserId d'abord, puis token, puis user
        localStorage.setItem('currentUserId', newUserId);
        localStorage.setItem('token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
        }
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('sessionId', data.session_id || sessionId);
        
        // Nettoyer forceLogout après un délai pour éviter les conflits
        // Mais seulement si on a déclenché un forceLogout
        if (existingUserId && existingUserId !== newUserId) {
          setTimeout(() => {
            localStorage.removeItem('forceLogout');
          }, 2000); // 2 secondes pour laisser le temps aux autres onglets de traiter
        }
        
        console.log('✅ Connexion réussie, données stockées:');
        console.log('🔍 Token:', !!data.access_token);
        console.log('🔍 User data:', data.user);
        console.log('🔍 User role:', data.user.role);
        console.log('🔍 Session ID:', sessionId);
        
        // Rediriger selon le rôle
        switch (data.user.role) {
          case 'ADMIN':
            console.log('🔄 Redirection vers /admin');
            navigate('/admin');
            break;
          case 'CONTROLLER':
            console.log('🔄 Redirection vers /controleur');
            navigate('/controleur');
            break;
          case 'ANALYST':
            console.log('🔄 Redirection vers /analyst-home');
            navigate('/analyst-home');
            break;
          case 'PROJECT_MANAGER':
            console.log('🔄 Redirection vers /project-manager');
            navigate('/project-manager');
            break;
          default:
            console.log('🔄 Redirection vers / (rôle inconnu)');
            navigate('/');
        }
    } catch (err: any) {
      console.error('❌ Erreur connexion:', err);
      const errorMessage = err?.message || 'Erreur de connexion au serveur';
      if (
        errorMessage.includes('fetch') ||
        errorMessage.includes('network') ||
        errorMessage.includes('Failed to fetch')
      ) {
        setError('Connexion au serveur impossible. Vérifiez votre réseau et réessayez.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl p-6 sm:p-8">
        {/* Logo et titre */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex justify-center mb-4">
            <Link to="/" className="cursor-pointer hover:opacity-80 transition-opacity">
              <img src={APP_LOGO_URL} alt="Logo Fikiri Collect" className="h-16 w-auto sm:h-20 object-contain" />
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">FikiriCollect</h1>
          <p className="text-sm sm:text-base text-gray-600">Plateforme de collecte de données</p>
        </div>

        {/* Formulaire de connexion */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
              Adresse email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="votre@email.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 pr-10 border border-gray-300 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Votre mot de passe"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Message d'erreur */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
              <div className="flex">
                <svg className="h-5 w-5 sm:h-6 sm:w-6 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm sm:text-base font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Bouton de connexion */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 sm:py-3 px-4 rounded-lg text-sm sm:text-base transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connexion en cours...
              </div>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>

        {/* Lien mot de passe oublié */}
        <div className="mt-4 text-center">
          <a href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-500 transition-colors">
            Mot de passe oublié ?
          </a>
        </div>

        {/* Lien de création de compte */}
        <div className="mt-4 sm:mt-6 text-center">
          <p className="text-sm sm:text-base text-gray-600">
            Pas encore de compte ?{' '}
            <a href="/create-account" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
              Créer un compte
            </a>
          </p>
        </div>

        {/* Informations supplémentaires */}
        <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-200">
          <div className="text-center">
            <p className="text-xs sm:text-sm text-gray-500">
              Plateforme sécurisée de collecte et d'analyse de données
            </p>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              © PNUD 2025. Tous droits réservés.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
