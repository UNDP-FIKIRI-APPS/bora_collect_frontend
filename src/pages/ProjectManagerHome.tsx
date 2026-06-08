import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_LOGO_URL } from '../config/branding';
import FormBuilder from '../components/FormBuilder';
import PNUDFooter from '../components/PNUDFooter';
import NotificationPanel from '../components/NotificationPanel';
import { environment } from '../config/environment';

// Lazy loading pour toutes les pages PM
const DashboardPM = lazy(() => import('./pm/DashboardPM'));
const PMAnalystManagement = lazy(() => import('./pm/PMAnalystManagement'));
const PMSurveyManagement = lazy(() => import('./pm/PMSurveyManagement'));
const PMApprovalRequests = lazy(() => import('./pm/PMApprovalRequests'));
const PMFormBuilder = lazy(() => import('./pm/PMFormBuilder'));
const PMApplicationReview = lazy(() => import('./pm/PMApplicationReview'));
const PMDemands = lazy(() => import('./pm/PMDemands'));
const PMSettings = lazy(() => import('./pm/PMSettings'));
const PMValidatedForms = lazy(() => import('./pm/PMValidatedForms'));

// Composant de chargement pour les pages lazy
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p className="mt-2 text-gray-600">Chargement...</p>
    </div>
  </div>
);

const ProjectManagerHome = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingCounts, setPendingCounts] = useState({ total: 0, pendingApplications: 0, pendingRecords: 0 });
  const navigate = useNavigate();
  const [view, setView] = useState('dashboard'); // 'dashboard', 'users', 'campaigns', 'demands', 'forms', 'validated-forms', 'settings'

  // Fonction pour charger les compteurs de demandes en attente pour PM
  const fetchPendingCounts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('⚠️ Aucun token trouvé, redirection vers login');
        navigate('/login');
        return;
      }

      const res = await fetch(`${environment.apiBaseUrl}/surveys/pm-pending-counts`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (res.status === 401) {
        console.log('⚠️ Token expiré ou invalide, déconnexion');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      
      if (!res.ok) {
        console.error('❌ Erreur lors du chargement des compteurs:', res.status, res.statusText);
        return;
      }
      
      const data = await res.json();
      console.log('🔔 PM Home - Compteurs mis à jour:', data);
      setPendingCounts(data);
    } catch (err: any) {
      console.error('❌ Erreur lors du chargement des compteurs:', err.message);
    }
  };

  // Fonction pour rafraîchir manuellement les compteurs
  const refreshPendingCounts = () => {
    console.log('🔄 PM Home - Rafraîchissement manuel des compteurs');
    fetchPendingCounts();
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        // Charger les données utilisateur depuis le serveur pour avoir les données fraîches
        const response = await fetch(`${environment.apiBaseUrl}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          console.log('🔍 PM Home - Données utilisateur reçues:', userData);
          setUser(userData.user);
          localStorage.setItem('user', JSON.stringify(userData.user));
          
          // Vérifier que l'utilisateur est bien un PROJECT_MANAGER
          if (userData.user.role !== 'PROJECT_MANAGER') {
            console.log('❌ PM Home - Rôle incorrect:', userData.user.role);
            navigate('/login');
            return;
          }
          
          console.log('✅ PM Home - Utilisateur PM chargé:', userData.user.name);
        } else {
          console.log('⚠️ PM Home - API /auth/me échouée, fallback localStorage');
          // Fallback sur localStorage si l'API échoue
          const u = localStorage.getItem('user');
          if (u) {
            const parsedUser = JSON.parse(u);
            setUser(parsedUser);
            
            // Vérifier que l'utilisateur est bien un PROJECT_MANAGER
            if (parsedUser.role !== 'PROJECT_MANAGER') {
              console.log('❌ PM Home - Rôle incorrect dans localStorage:', parsedUser.role);
              navigate('/login');
              return;
            }
            
            console.log('✅ PM Home - Utilisateur PM chargé depuis localStorage:', parsedUser.name);
          } else {
            console.log('❌ PM Home - Aucune donnée utilisateur trouvée');
            navigate('/login');
            return;
          }
        }
      } catch (error) {
        console.error('❌ PM Home - Erreur lors du chargement des données utilisateur:', error);
        // Fallback sur localStorage en cas d'erreur
        const u = localStorage.getItem('user');
        if (u) {
          const parsedUser = JSON.parse(u);
          setUser(parsedUser);
          
          // Vérifier que l'utilisateur est bien un PROJECT_MANAGER
          if (parsedUser.role !== 'PROJECT_MANAGER') {
            console.log('❌ PM Home - Rôle incorrect dans localStorage (catch):', parsedUser.role);
            navigate('/login');
            return;
          }
          
          console.log('✅ PM Home - Utilisateur PM chargé depuis localStorage (catch):', parsedUser.name);
        } else {
          console.log('❌ PM Home - Aucune donnée utilisateur trouvée (catch)');
          navigate('/login');
          return;
        }
      }
    };

    loadUserData();
    fetchPendingCounts();

    // Refresh automatique supprimé - les compteurs seront mis à jour uniquement via les événements

    // Écouter les événements de nouvelle demande
    const handleNewApplication = () => {
      console.log('🔔 PM Home - Nouvelle demande détectée, rafraîchissement des compteurs');
      fetchPendingCounts();
    };

    const handleNewRecord = () => {
      console.log('🔔 PM Home - Nouveau record détecté, rafraîchissement des compteurs');
      fetchPendingCounts();
    };

    window.addEventListener('newApplicationSubmitted', handleNewApplication);
    window.addEventListener('applicationStatusChanged', handleNewApplication);
    window.addEventListener('newRecordSubmitted', handleNewRecord);

    return () => {
      window.removeEventListener('newApplicationSubmitted', handleNewApplication);
      window.removeEventListener('applicationStatusChanged', handleNewApplication);
      window.removeEventListener('newRecordSubmitted', handleNewRecord);
    };
  }, [navigate]);

  useEffect(() => {
    const handler = () => {
      const u = localStorage.getItem('user');
      if (u) setUser(JSON.parse(u));
    };
    window.addEventListener('userProfileUpdated', handler);
    return () => window.removeEventListener('userProfileUpdated', handler);
  }, []);

  // Fermer le menu mobile lors du changement de vue
  const handleViewChange = (newView: string) => {
    setView(newView);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <style dangerouslySetInnerHTML={{
        __html: `
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `
      }} />
      {/* Navigation responsive */}
      <nav className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white shadow-lg border-b border-blue-700">
        <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-20">
            {/* Logo et titre */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <div className="relative">
                <img src={APP_LOGO_URL} alt="Logo Fikiri Collect" className="h-8 sm:h-10 w-auto object-contain bg-white rounded-lg shadow-md p-1" />
                <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm sm:text-base text-white">Project Manager</span>
                <span className="text-xs text-blue-200 hidden sm:block">FikiriCollect</span>
              </div>
            </div>
            
            {/* Bouton menu mobile */}
            <button 
              className="md:hidden p-2 rounded-lg hover:bg-blue-700/50 transition-all duration-200 hover:scale-105 active:scale-95"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Menu"
            >
              <svg className="w-6 h-6 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {/* Menu desktop */}
            <div className="hidden md:flex items-center gap-0.5 lg:gap-1">
              <button 
                onClick={() => handleViewChange('dashboard')} 
                className={`px-1.5 lg:px-2 py-2 rounded-lg font-semibold text-xs lg:text-sm transition-all duration-200 whitespace-nowrap ${
                  view === 'dashboard' 
                    ? 'bg-white text-blue-900 shadow-lg transform scale-105' 
                    : 'text-white hover:bg-blue-700/50 hover:scale-105'
                }`}
              >
                <div className="flex items-center gap-0.5 lg:gap-1">
                  <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                  </svg>
                  <span className="hidden lg:inline">Dashboard</span>
                  <span className="lg:hidden">Dash</span>
                </div>
              </button>
              <button 
                onClick={() => handleViewChange('users')} 
                className={`px-1.5 lg:px-2 py-2 rounded-lg font-semibold text-xs lg:text-sm transition-all duration-200 whitespace-nowrap ${
                  view === 'users' 
                    ? 'bg-white text-blue-900 shadow-lg transform scale-105' 
                    : 'text-white hover:bg-blue-700/50 hover:scale-105'
                }`}
              >
                <div className="flex items-center gap-0.5 lg:gap-1">
                  <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                  <span className="hidden lg:inline">Enquêteurs</span>
                  <span className="lg:hidden">Enquêteurs</span>
                </div>
              </button>
              <button 
                onClick={() => handleViewChange('campaigns')} 
                className={`px-1.5 lg:px-2 py-2 rounded-lg font-semibold text-xs lg:text-sm transition-all duration-200 whitespace-nowrap ${
                  view === 'campaigns' 
                    ? 'bg-white text-blue-900 shadow-lg transform scale-105' 
                    : 'text-white hover:bg-blue-700/50 hover:scale-105'
                }`}
              >
                <div className="flex items-center gap-0.5 lg:gap-1">
                  <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                  </svg>
                  <span className="hidden lg:inline">Gestion Campagnes</span>
                  <span className="lg:hidden">Campagnes</span>
                </div>
              </button>
              <button 
                onClick={() => handleViewChange('demands')} 
                className={`px-1.5 lg:px-2 py-2 rounded-lg font-semibold text-xs lg:text-sm transition-all duration-200 whitespace-nowrap ${
                  view === 'demands' 
                    ? 'bg-white text-blue-900 shadow-lg transform scale-105' 
                    : 'text-white hover:bg-blue-700/50 hover:scale-105'
                }`}
              >
                <div className="flex items-center gap-0.5 lg:gap-1">
                  <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  <span className="hidden lg:inline">Demandes</span>
                  <span className="lg:hidden">Demandes</span>
                </div>
              </button>
              <button 
                onClick={() => handleViewChange('forms')} 
                className={`px-1.5 lg:px-2 py-2 rounded-lg font-semibold text-xs lg:text-sm transition-all duration-200 whitespace-nowrap ${
                  view === 'forms' 
                    ? 'bg-white text-blue-900 shadow-lg transform scale-105' 
                    : 'text-white hover:bg-blue-700/50 hover:scale-105'
                }`}
              >
                <div className="flex items-center gap-0.5 lg:gap-1">
                  <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                  </svg>
                  <span className="hidden lg:inline">Formulaires</span>
                  <span className="lg:hidden">Forms</span>
                </div>
              </button>
              <button 
                onClick={() => handleViewChange('validated-forms')} 
                className={`px-1.5 lg:px-2 py-2 rounded-lg font-semibold text-xs lg:text-sm transition-all duration-200 whitespace-nowrap ${
                  view === 'validated-forms' 
                    ? 'bg-white text-blue-900 shadow-lg transform scale-105' 
                    : 'text-white hover:bg-blue-700/50 hover:scale-105'
                }`}
              >
                <div className="flex items-center gap-0.5 lg:gap-1">
                  <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9,12L11,14L15,10M19,8V19A2,2 0 0,1 17,21H5A2,2 0 0,1 3,19V5A2,2 0 0,1 5,3H16M17,3L19,5L17,7"/>
                  </svg>
                  <span className="hidden lg:inline">Formulaires Validés</span>
                  <span className="lg:hidden">Validés</span>
                </div>
              </button>
              
              {/* Panel de notifications */}
              <NotificationPanel 
                userRole={user?.role || 'PROJECT_MANAGER'}
                onNotificationClick={(link) => {
                  if (link) {
                    if (link.includes('application-review')) {
                      handleViewChange('demands');
                    } else if (link.includes('validated-forms')) {
                      handleViewChange('validated-forms');
                    }
                  }
                }}
              />
              
              <button 
                onClick={() => handleViewChange('settings')} 
                className={`px-1.5 lg:px-2 py-2 rounded-lg font-semibold text-xs lg:text-sm transition-all duration-200 whitespace-nowrap ${
                  view === 'settings' 
                    ? 'bg-white text-blue-900 shadow-lg transform scale-105' 
                    : 'text-white hover:bg-blue-700/50 hover:scale-105'
                }`}
              >
                <div className="flex items-center gap-0.5 lg:gap-1">
                  <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
                  </svg>
                  <span className="hidden lg:inline">Paramètres</span>
                  <span className="lg:hidden">Param</span>
                </div>
              </button>
              
              {/* Profil utilisateur et déconnexion */}
              <div className="flex items-center gap-1 ml-1 pl-1 border-l border-blue-700 min-w-0">
                {user && (
                  <div className="relative">
                    {user?.profilePhoto ? (
                      <img 
                        src={`${environment.apiBaseUrl}${user.profilePhoto}`} 
                        alt="Photo de profil" 
                        className="w-6 h-6 rounded-full object-cover shadow-md hover:shadow-lg transition-shadow duration-200"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-white text-blue-900 flex items-center justify-center font-bold text-xs shadow-md hover:shadow-lg transition-shadow duration-200">
                        {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full border border-white"></div>
                  </div>
                )}
                <button 
                  onClick={() => { localStorage.clear(); navigate('/login'); }} 
                  className="bg-white text-blue-900 px-1.5 py-1 rounded-lg font-semibold text-xs hover:bg-gray-100 hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 whitespace-nowrap"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Menu mobile */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-blue-800/50 backdrop-blur-sm border-t border-blue-700">
            <div className="px-4 py-4 space-y-2">
              <button 
                onClick={() => handleViewChange('dashboard')} 
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  view === 'dashboard' 
                    ? 'bg-white text-blue-900 shadow-lg' 
                    : 'text-white hover:bg-blue-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                  </svg>
                  Dashboard
                </div>
              </button>
              <button 
                onClick={() => handleViewChange('users')} 
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  view === 'users' 
                    ? 'bg-white text-blue-900 shadow-lg' 
                    : 'text-white hover:bg-blue-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                  Gestion Utilisateurs
                </div>
              </button>
              <button 
                onClick={() => handleViewChange('campaigns')} 
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  view === 'campaigns' 
                    ? 'bg-white text-blue-900 shadow-lg' 
                    : 'text-white hover:bg-blue-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                  </svg>
                  Gestion Campagnes
                </div>
              </button>
              <button 
                onClick={() => handleViewChange('demands')} 
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  view === 'demands' 
                    ? 'bg-white text-blue-900 shadow-lg' 
                    : 'text-white hover:bg-blue-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  Demandes
                </div>
              </button>
              <button 
                onClick={() => handleViewChange('forms')} 
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  view === 'forms' 
                    ? 'bg-white text-blue-900 shadow-lg' 
                    : 'text-white hover:bg-blue-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                  </svg>
                  Formulaires
                </div>
              </button>
              <button 
                onClick={() => handleViewChange('settings')} 
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  view === 'settings' 
                    ? 'bg-white text-blue-900 shadow-lg' 
                    : 'text-white hover:bg-blue-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
                  </svg>
                  Paramètres
                </div>
              </button>

              {/* Profil et déconnexion mobile */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-blue-700">
                {user && (
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {user?.profilePhoto ? (
                        <img 
                          src={`${environment.apiBaseUrl}${user.profilePhoto}`} 
                          alt="Photo de profil" 
                          className="w-8 h-8 rounded-full object-cover shadow-md"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-white text-blue-900 flex items-center justify-center font-bold shadow-md">
                          {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-white">{user?.name || 'Project Manager'}</span>
                      <span className="text-xs text-blue-200">{user?.email}</span>
                    </div>
                  </div>
                )}
                <button 
                  onClick={() => { localStorage.clear(); navigate('/login'); }} 
                  className="bg-white text-blue-900 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-100 hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
      
      {/* Contenu principal */}
      <main className="p-4 sm:p-8">
        {view === 'dashboard' && (
          <Suspense fallback={<PageLoadingFallback />}>
            <DashboardPM />
          </Suspense>
        )}
        {view === 'users' && (
          <Suspense fallback={<PageLoadingFallback />}>
            <PMAnalystManagement />
          </Suspense>
        )}
        {view === 'campaigns' && (
          <Suspense fallback={<PageLoadingFallback />}>
            <PMSurveyManagement />
          </Suspense>
        )}
        {view === 'demands' && (
          <Suspense fallback={<PageLoadingFallback />}>
            <PMDemands 
              onNavigateToApprovalRequests={() => setView('pending-approvals')}
              onNavigateToApplicationReview={() => setView('create-user')}
            />
          </Suspense>
        )}
        {view === 'pending-approvals' && (
          <Suspense fallback={<PageLoadingFallback />}>
            <PMApprovalRequests onBack={() => setView('demands')} />
          </Suspense>
        )}
        {view === 'create-user' && (
          <Suspense fallback={<PageLoadingFallback />}>
            <PMApplicationReview onBack={() => setView('demands')} />
          </Suspense>
        )}
        {view === 'forms' && (
          <Suspense fallback={<PageLoadingFallback />}>
            <PMFormBuilder />
          </Suspense>
        )}
        {view === 'validated-forms' && (
          <Suspense fallback={<PageLoadingFallback />}>
            <PMValidatedForms />
          </Suspense>
        )}
        {view === 'settings' && (
          <Suspense fallback={<PageLoadingFallback />}>
            <PMSettings />
          </Suspense>
        )}
      </main>
      
      <PNUDFooter />
    </div>
  );
};

export default ProjectManagerHome;