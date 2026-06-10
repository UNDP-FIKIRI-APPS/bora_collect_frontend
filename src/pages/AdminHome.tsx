import React, { useEffect, useState, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_LOGO_URL } from '../config/branding';
import AdminDashboardCharts from '../components/AdminDashboardCharts';
import CarteRDCSVG from '../components/CarteRDCSVG';
import PNUDFooter from '../components/PNUDFooter';
import NotificationPanel from '../components/NotificationPanel';
import { environment } from '../config/environment';
import enhancedApiService from '../services/enhancedApiService';
import { performLogout } from '../utils/authStorage';

// Lazy loading pour toutes les pages admin
const AdminUserManagement = lazy(() => import('./AdminUserManagement'));
const AdminCampaignManagement = lazy(() => import('./AdminCampaignManagement'));
const AdminPendingApprovals = lazy(() => import('./AdminPendingApprovals'));
const AdminPMRequests = lazy(() => import('./AdminPMRequests'));
const AdminCreateProjectManager = lazy(() => import('./AdminCreateProjectManager'));
const AdminCampaignData = lazy(() => import('./AdminCampaignData'));
const AdminSettings = lazy(() => import('./AdminSettings'));
const AdminSurveyPublication = lazy(() => import('./AdminSurveyPublication'));
const AdminCandidatures = lazy(() => import('./AdminCandidatures'));

// Composant de chargement pour les pages lazy
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p className="mt-2 text-gray-600">Chargement...</p>
    </div>
  </div>
);

export function DashboardAdmin() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [flippedCards, setFlippedCards] = useState<{ [key: string]: boolean }>({});
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingApprovals: 0,
    usersByRole: {
      admin: 0,
      controller: 0,
      supervisor: 0,
      analyst: 0,
      projectManager: 0,
    }
  });
  const [campaignStats, setCampaignStats] = useState({
    totalCampaigns: 0,
    activeCampaigns: 0,
    completedCampaigns: 0,
    pendingCampaigns: 0
  });

  // Styles CSS pour les animations 3D
  const flipCardStyles = `
    .perspective-1000 {
      perspective: 1000px;
    }
    .transform-style-preserve-3d {
      transform-style: preserve-3d;
    }
    .backface-hidden {
      backface-visibility: hidden;
    }
    .rotate-y-180 {
      transform: rotateY(180deg);
    }
  `;

  // Fonction pour gérer le retournement des cartes
  const toggleCardFlip = (cardId: string) => {
    setFlippedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const data = await enhancedApiService.get<any>('/users/dashboard-stats', { skipCache: true });
      setUserStats({
        totalUsers: data.total || 0,
        activeUsers: data.active || 0,
        pendingApprovals: data.pending || 0,
        usersByRole: {
          admin: data.usersByRole?.admin || 0,
          controller: data.usersByRole?.controller || 0,
          supervisor: 0,
          analyst: data.usersByRole?.analyst || 0,
          projectManager: data.usersByRole?.projectManager || 0,
        },
      });
    } catch (err: any) {
      console.error('Erreur:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
    fetchCampaignStats();
  }, []);

  // Charger les données utilisateur
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Utilisation du nouveau service API
        const userData = await enhancedApiService.get<{ user: any }>('/auth/me');
        console.log('🔍 AdminHome - Données utilisateur chargées:', userData.user);
        console.log('🔍 AdminHome - profilePhoto:', userData.user.profilePhoto);
        setUser(userData.user);
        localStorage.setItem('user', JSON.stringify(userData.user));
      } catch (error) {
        console.error('Erreur lors du chargement des données utilisateur:', error);
        // Fallback sur localStorage en cas d'erreur
        const u = localStorage.getItem('user');
        if (u) setUser(JSON.parse(u));
      }
    };

    loadUserData();
  }, []);

  // Récupérer les statistiques des campagnes
  const fetchCampaignStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Utilisation du nouveau service API
      const responseData = await enhancedApiService.get<any>('/surveys/admin', {
        skipCache: true,
      });
      
      // L'API peut retourner un objet avec { data: [...], pagination: {...} } ou directement un tableau
      const campaignsArray = Array.isArray(responseData) ? responseData : (responseData?.data || []);
      
      setCampaignStats({
        totalCampaigns: campaignsArray.length,
        activeCampaigns: campaignsArray.filter((c: any) => c.status === 'PUBLISHED').length,
        completedCampaigns: campaignsArray.filter((c: any) => c.status === 'TERMINATED').length,
        pendingCampaigns: campaignsArray.filter((c: any) => c.status === 'DRAFT').length
      });
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques de campagnes:', error);
    }
  };

  return (
    <>
      <style>{flipCardStyles}</style>
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center px-4">Tableau de bord Admin - FikiriCollect</h1>
      
      {/* Section d'accueil responsive */}
      <div className="max-w-4xl mx-auto bg-blue-50 rounded-xl shadow p-4 sm:p-6 mb-6 sm:mb-8 mx-4">
        <p className="text-base sm:text-lg text-gray-800 mb-4 text-center">Bienvenue, {user?.name || 'Administrateur'} !<br/>Ici, vous pouvez&nbsp;:</p>
        <ul className="list-disc ml-4 sm:ml-8 text-sm sm:text-base text-gray-700 mb-4 space-y-1">
          <li>Gérer les utilisateurs du système</li>
          <li>Consulter les statistiques globales</li>
          <li>Consulter les données du système grâce à la carte</li>
        </ul>
      </div>
      
      {/* Carte Interactive de la RDC */}
      <div className="px-4 mb-6 sm:mb-8">
        <CarteRDCSVG />
      </div>
      
      {/* Statistiques principales avec cartes animées */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8 px-4 max-w-4xl mx-auto">
        {/* Carte Total Utilisateurs */}
        <div 
          className="relative w-full h-24 cursor-pointer perspective-1000 hover:scale-105 transition-transform duration-300"
          onClick={() => toggleCardFlip('totalUsers')}
        >
          <div className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
            flippedCards.totalUsers ? 'rotate-y-180' : ''
          }`}>
            {/* Recto */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow duration-300">
              <div className="text-center text-white">
                <div className="mb-2 hover:scale-110 transition-transform duration-200 relative">
                  <div className="absolute inset-0 bg-white opacity-20 rounded-full blur-sm"></div>
                  <svg className="w-6 h-6 mx-auto relative z-10 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
                <div className="text-xs font-semibold">Total Utilisateurs</div>
                <div className="text-xs opacity-80 mt-1 animate-pulse">Cliquez pour voir</div>
              </div>
            </div>
            {/* Verso */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg flex items-center justify-center rotate-y-180">
              <div className="text-center text-white">
                <div className="text-2xl font-bold mb-1">
                  {loading ? (
                    <div className="animate-pulse bg-white/20 rounded w-12 h-8 mx-auto"></div>
                  ) : (
                    <span className="animate-bounce hover:animate-pulse transition-all duration-300 hover:scale-110 hover:text-yellow-200">
                      {userStats.totalUsers}
                    </span>
                  )}
                </div>
                <div className="text-xs">
                  <div>PM: {loading ? (
                    <span className="animate-pulse bg-white/20 rounded w-8 h-4 inline-block"></span>
                  ) : (
                    <span className="animate-bounce">{userStats.usersByRole.projectManager}</span>
                  )}</div>
                  <div>Enquêteurs: {loading ? (
                    <span className="animate-pulse bg-white/20 rounded w-8 h-4 inline-block"></span>
                  ) : (
                    <span className="animate-bounce">{userStats.usersByRole.controller}</span>
                  )}</div>
                  <div>Analystes: {loading ? (
                    <span className="animate-pulse bg-white/20 rounded w-8 h-4 inline-block"></span>
                  ) : (
                    <span className="animate-bounce">{userStats.usersByRole.analyst}</span>
                  )}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Carte Total Campagnes */}
        <div 
          className="relative w-full h-24 cursor-pointer perspective-1000 hover:scale-105 transition-transform duration-300"
          onClick={() => toggleCardFlip('totalCampaigns')}
        >
          <div className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
            flippedCards.totalCampaigns ? 'rotate-y-180' : ''
          }`}>
            {/* Recto */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow duration-300">
              <div className="text-center text-white">
                <div className="mb-2 hover:scale-110 transition-transform duration-200 relative">
                  <div className="absolute inset-0 bg-white opacity-20 rounded-full blur-sm"></div>
                  <svg className="w-6 h-6 mx-auto relative z-10 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                  </svg>
                </div>
                <div className="text-xs font-semibold">Total Campagnes</div>
                <div className="text-xs opacity-80 mt-1 animate-pulse">Cliquez pour voir</div>
              </div>
            </div>
            {/* Verso */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg flex items-center justify-center rotate-y-180">
              <div className="text-center text-white">
                <div className="text-2xl font-bold mb-1">
                  {loading ? (
                    <div className="animate-pulse bg-white/20 rounded w-12 h-8 mx-auto"></div>
                  ) : (
                    <span className="animate-bounce hover:animate-pulse transition-all duration-300 hover:scale-110 hover:text-yellow-200">
                      {campaignStats.totalCampaigns}
                    </span>
                  )}
                </div>
                <div className="text-xs">
                  <div>En cours: {loading ? (
                    <span className="animate-pulse bg-white/20 rounded w-8 h-4 inline-block"></span>
                  ) : (
                    <span className="animate-bounce">{campaignStats.activeCampaigns}</span>
                  )}</div>
                  <div>Terminées: {loading ? (
                    <span className="animate-pulse bg-white/20 rounded w-8 h-4 inline-block"></span>
                  ) : (
                    <span className="animate-bounce">{campaignStats.completedCampaigns}</span>
                  )}</div>
                  <div>En attente: {loading ? (
                    <span className="animate-pulse bg-white/20 rounded w-8 h-4 inline-block"></span>
                  ) : (
                    <span className="animate-bounce">{campaignStats.pendingCampaigns}</span>
                  )}</div>
                </div>
              </div>
            </div>
        </div>
        </div>
      </div>
      
      <AdminDashboardCharts />
    </>
  );
}

export default function AdminHome() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingCounts, setPendingCounts] = useState({ total: 0, pendingApplications: 0, pendingPMRequests: 0, pendingRecords: 0 });
  const navigate = useNavigate();
  const [view, setView] = useState('dashboard');

  // Fonction pour charger les compteurs de demandes en attente
  const fetchPendingCounts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Utilisation du nouveau service API
      const data = await enhancedApiService.get<any>('/surveys/admin/pending-counts', {
        skipCache: true,
      });
      
      console.log('🔔 Admin Home - Compteurs mis à jour:', data);
      setPendingCounts(data);
    } catch (err: any) {
      console.error('❌ Erreur lors du chargement des compteurs:', err.message);
    }
  };

  // Fonction pour rafraîchir manuellement les compteurs
  const refreshPendingCounts = () => {
    console.log('🔄 Admin Home - Rafraîchissement manuel des compteurs');
    fetchPendingCounts();
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Utilisation du nouveau service API
        const userData = await enhancedApiService.get<{ user: any }>('/auth/me');
        setUser(userData.user);
        localStorage.setItem('user', JSON.stringify(userData.user));
      } catch (error) {
        console.error('Erreur lors du chargement des données utilisateur:', error);
        // Fallback sur localStorage en cas d'erreur
        const u = localStorage.getItem('user');
        if (u) setUser(JSON.parse(u));
      }
    };

    loadUserData();
    fetchPendingCounts();

    // Refresh automatique supprimé - les compteurs seront mis à jour uniquement via les événements

    // Écouter les événements de nouvelle demande
    const handleNewApplication = () => {
      console.log('🔔 Admin Home - Nouvelle demande détectée, rafraîchissement des compteurs');
      fetchPendingCounts();
    };

    const handleNewRecord = () => {
      console.log('🔔 Admin Home - Nouveau record détecté, rafraîchissement des compteurs');
      fetchPendingCounts();
    };

    window.addEventListener('newApplicationSubmitted', handleNewApplication);
    window.addEventListener('applicationStatusChanged', handleNewApplication);
    window.addEventListener('newRecordSubmitted', handleNewRecord);

    // Écouter les événements de mise à jour du profil
    const handleProfileUpdate = (event: CustomEvent) => {
      const updatedUser = event.detail;
      console.log('🔍 AdminHome - Profil mis à jour:', updatedUser);
      console.log('🔍 AdminHome - Nouvelle profilePhoto:', updatedUser.profilePhoto);
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate as EventListener);
    
    return () => {
      window.removeEventListener('newApplicationSubmitted', handleNewApplication);
      window.removeEventListener('applicationStatusChanged', handleNewApplication);
      window.removeEventListener('newRecordSubmitted', handleNewRecord);
      window.removeEventListener('userProfileUpdated', handleProfileUpdate as EventListener);
    };
  }, []);

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
      {/* Navigation responsive */}
      <nav className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white shadow-lg border-b border-blue-700">
        <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center min-h-[4rem] lg:h-20 py-2 lg:py-0 gap-2">
          {/* Logo et titre */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0">
              <div className="relative">
                <img src={APP_LOGO_URL} alt="Logo Fikiri Collect" className="h-8 sm:h-10 w-auto object-contain bg-white rounded-lg shadow-md p-1" />
                <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm sm:text-base text-white">Admin</span>
                <span className="text-xs text-blue-200 hidden sm:block">FikiriCollect</span>
              </div>
        </div>
          
          {/* Bouton menu mobile */}
          <button 
              className="lg:hidden p-2 rounded-lg hover:bg-blue-700/50 transition-all duration-200 hover:scale-105 active:scale-95 touch-manipulation"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Menu"
            aria-expanded={isMobileMenuOpen}
          >
              <svg className="w-6 h-6 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* Menu desktop / tablette large */}
            <div className="hidden lg:flex items-center gap-0.5 xl:gap-1 flex-1 min-w-0 justify-end overflow-x-auto scrollbar-thin">
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
                  <span className="hidden lg:inline">Gestion Utilisateurs</span>
                  <span className="lg:hidden">Utilisateurs</span>
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
              onClick={() => handleViewChange('pending-approvals')} 
                className={`px-1.5 lg:px-2 py-2 rounded-lg font-semibold text-xs lg:text-sm transition-all duration-200 whitespace-nowrap ${
                  view === 'pending-approvals' 
                    ? 'bg-white text-blue-900 shadow-lg transform scale-105' 
                    : 'text-white hover:bg-blue-700/50 hover:scale-105'
                }`}
              >
                <div className="flex items-center gap-0.5 lg:gap-1">
                  <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <span className="hidden lg:inline">Demandes PM</span>
                  <span className="lg:hidden">Demandes</span>
                </div>
          </button>
          
          {/* Panel de notifications */}
          <NotificationPanel 
            userRole={user?.role || 'ADMIN'}
            onNotificationClick={(link) => {
              if (link) {
                // Extraire la vue de la route
                if (link.includes('pending-approvals')) {
                  handleViewChange('pending-approvals');
                }
              }
            }}
          />
          <button 
                onClick={() => handleViewChange('campaign-data')} 
                className={`px-1.5 lg:px-2 py-2 rounded-lg font-semibold text-xs lg:text-sm transition-all duration-200 whitespace-nowrap ${
                  view === 'campaign-data' 
                    ? 'bg-white text-blue-900 shadow-lg transform scale-105' 
                    : 'text-white hover:bg-blue-700/50 hover:scale-105'
                }`}
              >
                <div className="flex items-center gap-0.5 lg:gap-1">
                  <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                  </svg>
                  <span className="hidden lg:inline">Données Campagnes</span>
                  <span className="lg:hidden">Données</span>
                </div>
          </button>
          <button 
                onClick={() => handleViewChange('survey-publication')} 
                className={`px-1.5 lg:px-2 py-2 rounded-lg font-semibold text-xs lg:text-sm transition-all duration-200 whitespace-nowrap ${
                  view === 'survey-publication' 
                    ? 'bg-white text-blue-900 shadow-lg transform scale-105' 
                    : 'text-white hover:bg-blue-700/50 hover:scale-105'
                }`}
              >
                <span className="hidden lg:inline">Publication</span>
                <span className="lg:hidden">Pub.</span>
          </button>
          <button 
                onClick={() => handleViewChange('candidatures')} 
                className={`px-1.5 lg:px-2 py-2 rounded-lg font-semibold text-xs lg:text-sm transition-all duration-200 whitespace-nowrap ${
                  view === 'candidatures' 
                    ? 'bg-white text-blue-900 shadow-lg transform scale-105' 
                    : 'text-white hover:bg-blue-700/50 hover:scale-105'
                }`}
              >
                <span className="hidden lg:inline">Candidatures</span>
                <span className="lg:hidden">Cand.</span>
          </button>
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
                    {(() => {
                      console.log('🔍 AdminHome - Rendu avatar, user:', user);
                      console.log('🔍 AdminHome - profilePhoto pour avatar:', user.profilePhoto);
                      return user?.profilePhoto ? (
                        <img 
                          src={`${environment.apiBaseUrl}${user.profilePhoto}`} 
                          alt="Photo de profil" 
                          className="w-6 h-6 rounded-full object-cover shadow-md hover:shadow-lg transition-shadow duration-200"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white text-blue-900 flex items-center justify-center font-bold text-xs shadow-md hover:shadow-lg transition-shadow duration-200">
                          {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                      );
                    })()}
                    <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full border border-white"></div>
                </div>
              )}
              <button 
                onClick={() => { void performLogout(navigate); }} 
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
          <div className="lg:hidden bg-blue-800/50 backdrop-blur-sm border-t border-blue-700 max-h-[70vh] overflow-y-auto">
            <div className="px-4 py-4 space-y-2">
            <button 
              onClick={() => handleViewChange('dashboard')} 
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 touch-manipulation min-h-[44px] ${
                  view === 'dashboard' 
                    ? 'bg-white text-blue-900 shadow-lg' 
                    : 'text-white hover:bg-blue-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                  </svg>
              Dashboard
                </div>
            </button>
            <button 
                onClick={() => handleViewChange('users')} 
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 touch-manipulation min-h-[44px] ${
                  view === 'users' 
                    ? 'bg-white text-blue-900 shadow-lg' 
                    : 'text-white hover:bg-blue-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                  Gestion Utilisateurs
                </div>
            </button>
            <button 
                onClick={() => handleViewChange('campaigns')} 
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 touch-manipulation min-h-[44px] ${
                  view === 'campaigns' 
                    ? 'bg-white text-blue-900 shadow-lg' 
                    : 'text-white hover:bg-blue-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                  </svg>
                  Gestion Campagnes
                </div>
          </button>
            <button 
              onClick={() => handleViewChange('pending-approvals')} 
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 touch-manipulation min-h-[44px] ${
                  view === 'pending-approvals' 
                    ? 'bg-white text-blue-900 shadow-lg' 
                    : 'text-white hover:bg-blue-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Demandes PM
                </div>
            </button>
            <button 
                onClick={() => handleViewChange('campaign-data')} 
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 touch-manipulation min-h-[44px] ${
                  view === 'campaign-data' 
                    ? 'bg-white text-blue-900 shadow-lg' 
                    : 'text-white hover:bg-blue-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                  </svg>
                  Données Campagnes
                </div>
            </button>
            <button onClick={() => handleViewChange('survey-publication')} className={`w-full text-left px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 touch-manipulation min-h-[44px] ${view === 'survey-publication' ? 'bg-white text-blue-900 shadow-lg' : 'text-white hover:bg-blue-700/50'}`}>Publication</button>
            <button onClick={() => handleViewChange('candidatures')} className={`w-full text-left px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 touch-manipulation min-h-[44px] ${view === 'candidatures' ? 'bg-white text-blue-900 shadow-lg' : 'text-white hover:bg-blue-700/50'}`}>Candidatures</button>
            <button 
                onClick={() => handleViewChange('settings')} 
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 touch-manipulation min-h-[44px] ${
                  view === 'settings' 
                    ? 'bg-white text-blue-900 shadow-lg' 
                    : 'text-white hover:bg-blue-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
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
                          {user?.name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-white">{user?.name || 'Admin'}</span>
                      <span className="text-xs text-blue-200">{user?.email}</span>
                    </div>
            </div>
          )}
              <button 
                onClick={() => { void performLogout(navigate); }} 
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
      <main className="p-3 sm:p-6 lg:p-8 max-w-[100vw] overflow-x-hidden">
        {view === 'dashboard' && <DashboardAdmin />}
        {view === 'users' && (
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminUserManagement />
          </Suspense>
        )}
        {view === 'campaigns' && (
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminCampaignManagement />
          </Suspense>
        )}
        {view === 'pending-approvals' && (
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminPendingApprovals 
              onNavigateToRequests={() => {
                // Naviguer vers la vraie page des demandes PM
                setView('pm-requests');
              }}
              onNavigateToCreatePM={() => {
                // Naviguer vers la page de création de PM en utilisant le système de navigation interne
                setView('create-pm');
              }}
            />
          </Suspense>
        )}
        {view === 'pm-requests' && (
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminPMRequests 
              onBack={() => setView('pending-approvals')}
            />
          </Suspense>
        )}
        {view === 'create-pm' && (
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminCreateProjectManager 
              onBack={() => setView('pending-approvals')}
            />
          </Suspense>
        )}
        {view === 'campaign-data' && (
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminCampaignData />
          </Suspense>
        )}
        {view === 'survey-publication' && (
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminSurveyPublication />
          </Suspense>
        )}
        {view === 'candidatures' && (
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminCandidatures />
          </Suspense>
        )}
        {view === 'settings' && (
          <Suspense fallback={<PageLoadingFallback />}>
            <AdminSettings />
          </Suspense>
        )}
      </main>
      
      <PNUDFooter />
    </div>
  );
} 
