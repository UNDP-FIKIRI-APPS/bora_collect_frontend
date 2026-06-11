import React, { useEffect, useState, Suspense, lazy } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { APP_LOGO_URL } from '../config/branding';
import ControllerDailyObjectives from '../components/ControllerDailyObjectives';
import PNUDFooter from '../components/PNUDFooter';
import { environment } from '../config/environment';
import { performLogout } from '../utils/authStorage';
import enhancedApiService from '../services/enhancedApiService';

const ControllerDashboardCharts = lazy(() => import('../components/ControllerDashboardCharts'));
const ObjectiveAlerts = lazy(() => import('../components/ObjectiveAlerts'));
const ObjectiveProjection = lazy(() => import('../components/ObjectiveProjection'));

// Lazy loading pour toutes les pages Controller
const ControllerCampaignForms = lazy(() => import('./ControllerCampaignForms'));
const RecordsList = lazy(() => import('./RecordsList'));
const ControllerAvailableSurveys = lazy(() => import('./ControllerAvailableSurveys'));
const Settings = lazy(() => import('./Settings'));

// Composant de chargement pour les pages lazy
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p className="mt-2 text-gray-600">Chargement...</p>
    </div>
  </div>
);

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

const EMPTY_DASHBOARD_STATS = {
  totalSurveys: 0,
  totalCampaigns: 0,
  totalFormsSubmitted: 0,
  totalCompletedCampaigns: 0,
  totalOngoingCampaigns: 0,
  expectedTotal: 0,
  totalDailyTarget: 0,
  totalEnumeratorTarget: 0,
  personalTargets: [] as any[],
  todaySubmitted: 0,
  averagePerDay: 0,
  workedDays: 0,
  plannedDays: 0,
  remainingToReach: 0,
  recordsByMonth: [] as Array<{ month: string; count: number }>,
};

export function DashboardController({ setView }: { setView: (view: string) => void }) {
  const [user, setUser] = useState<any>(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [dashboardStats, setDashboardStats] = useState<any>(EMPTY_DASHBOARD_STATS);
  const [statsLoading, setStatsLoading] = useState(true);
  const [flippedCards, setFlippedCards] = useState<{ [key: string]: boolean }>({});
  const [dailyObjectives, setDailyObjectives] = useState<any[]>([]);
  const [objectivesLoading, setObjectivesLoading] = useState(false);

  // Fonction pour formater les nombres (ajoute des séparateurs de milliers)
  const formatNumber = (num: number): string => {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  // Fonction pour déterminer la taille de police en fonction du nombre de chiffres
  const getFontSizeClass = (num: number): string => {
    const numStr = num.toString();
    const length = numStr.length;
    if (length <= 3) return 'text-2xl';
    if (length <= 5) return 'text-xl';
    if (length <= 7) return 'text-lg';
    return 'text-base';
  };

  // Fonction pour gérer le retournement des cartes
  const toggleCardFlip = (cardId: string) => {
    setFlippedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  // Fonction pour récupérer les statistiques du tableau de bord
  const mapDashboardStats = (stats: any) => ({
    totalSurveys: stats.totalSurveys || 0,
    totalCampaigns: stats.totalCampaigns || 0,
    totalFormsSubmitted: stats.totalFormsSubmitted || 0,
    totalCompletedCampaigns: stats.totalCompletedCampaigns || 0,
    totalOngoingCampaigns: stats.totalOngoingCampaigns || 0,
    expectedTotal: stats.expectedTotal || 0,
    totalDailyTarget: stats.totalDailyTarget || 0,
    totalEnumeratorTarget:
      typeof stats.totalEnumeratorTarget === 'number'
        ? stats.totalEnumeratorTarget
        : stats.expectedTotal || 0,
    personalTargets: Array.isArray(stats.personalTargets) ? stats.personalTargets : [],
    todaySubmitted: stats.todaySubmitted || 0,
    averagePerDay: stats.averagePerDay || 0,
    workedDays: stats.workedDays || 0,
    plannedDays: stats.plannedDays || 0,
    remainingToReach:
      typeof stats.remainingToReach === 'number'
        ? stats.remainingToReach
        : Math.max((stats.expectedTotal || 0) - (stats.totalFormsSubmitted || 0), 0),
    recordsByMonth: Array.isArray(stats.recordsByMonth) ? stats.recordsByMonth : [],
  });

  const fetchDashboardStats = async () => {
    setStatsLoading(true);
    try {
      const stats = await enhancedApiService.get<any>('/users/enumerator-stats', {
        skipCache: true,
      });
      setDashboardStats(mapDashboardStats(stats));
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des statistiques:', error);
      setDashboardStats(EMPTY_DASHBOARD_STATS);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fonction pour récupérer les objectifs quotidiens
  const fetchDailyObjectives = async () => {
    setObjectivesLoading(true);
    try {
      const data = await enhancedApiService.get<any[]>('/surveys/enumerator-daily-objectives', {
        skipCache: true,
      });
      setDailyObjectives(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des objectifs:', error);
      setDailyObjectives([]);
    } finally {
      setObjectivesLoading(false);
    }
  };

  useEffect(() => {
    const loadDashboard = async () => {
      await Promise.all([
        fetchDashboardStats(),
        fetchDailyObjectives(),
        enhancedApiService
          .get<{ user: any }>('/auth/me', { skipCache: true })
          .then((userData) => {
            if (userData?.user) {
              setUser(userData.user);
              localStorage.setItem('user', JSON.stringify(userData.user));
            }
          })
          .catch(() => undefined),
      ]);
    };

    loadDashboard();

    const onNewRecord = () => {
      void fetchDashboardStats();
      void fetchDailyObjectives();
    };
    window.addEventListener('newRecordSubmitted', onNewRecord);
    return () => window.removeEventListener('newRecordSubmitted', onNewRecord);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  // Supprimer la vérification !user dans DashboardController car elle est déjà faite dans ControllerHome

  const personalTotal =
    dashboardStats.totalEnumeratorTarget ?? dashboardStats.expectedTotal ?? 0;
  const personalDailyTarget = dashboardStats.totalDailyTarget ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Styles CSS pour les animations */}
      <style dangerouslySetInnerHTML={{ __html: flipCardStyles }} />
      
      {/** Nom d'affichage sans le mot "Contrôleur" */}
      {(() => { /* inline IIFE to keep scope local */ })()}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/**/}
      {/* En-tête avec informations utilisateur */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            {/** Calcul du nom d'affichage */}
            {/**/}
            {/**/}
            {/**/}
            {/**/}
            {/**/}
            {/**/}
            {/**/}
            {/**/}
            {/**/}
            {/**/}
            {/**/}
            {/**/}
            {/**/}
            {/**/}
            {/**/}
            {/**/}
            {/**/}
            {/**/}
            {/**/}
            {/**/}
            {/**/}
            {/**/}
            {/**/}
            {/**/}
            {/**/}
            {/**/}
            {/**/}
            {/**/}
            {/**/}
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
              {(() => {
                let displayName = user?.name;
                
                // Vérifier si le nom est vide, null ou undefined
                if (!displayName || displayName.trim() === '') {
                  displayName = 'Enquêteur';
                }
                
                return `Bienvenue, ${displayName} !`;
              })()}
            </h2>
            <p className="text-gray-600 text-sm sm:text-base">
              Interface enquêteur
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
              {(() => {
                const displayName = user?.name || 'Enquêteur';
                return displayName?.[0]?.toUpperCase() || 'E';
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques personnelles avec cartes animées */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-5xl mx-auto">
        {/* Carte Total de sondages */}
        <div 
          className="relative w-full h-28 sm:h-32 cursor-pointer perspective-1000 hover:scale-105 transition-transform duration-300"
          onClick={() => toggleCardFlip('totalSurveys')}
        >
          <div className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
            flippedCards.totalSurveys ? 'rotate-y-180' : ''
          }`}>
            {/* Recto */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow duration-300">
              <div className="text-center text-white">
                <div className="mb-2 hover:scale-110 transition-transform duration-200 relative">
                  <div className="absolute inset-0 bg-white opacity-20 rounded-full blur-sm"></div>
                  <svg className="w-6 h-6 mx-auto relative z-10 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                  </svg>
                </div>
                <div className="text-xs font-semibold">Total de sondages</div>
                <div className="text-xs opacity-80 mt-1">Cliquez pour voir</div>
              </div>
            </div>
            {/* Verso */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg flex items-center justify-center rotate-y-180 overflow-hidden">
              <div className="text-center text-white w-full px-2">
                <div className={`${getFontSizeClass(dashboardStats?.totalSurveys || 0)} font-bold mb-1 overflow-hidden text-ellipsis whitespace-nowrap`}>
                  {statsLoading ? (
                    <div className="animate-pulse bg-white/20 rounded w-12 h-8 mx-auto"></div>
                  ) : (
                    <span className="inline-block max-w-full overflow-hidden text-ellipsis">
                      {formatNumber(dashboardStats?.totalSurveys || 0)}
                    </span>
                  )}
                </div>
                <div className="text-xs">Sondages réalisés</div>
              </div>
            </div>
          </div>
        </div>

        {/* Carte Mes campagnes */}
        <div 
          className="relative w-full h-28 sm:h-32 cursor-pointer perspective-1000 hover:scale-105 transition-transform duration-300"
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
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <div className="text-xs font-semibold">Mes campagnes</div>
                <div className="text-xs opacity-80 mt-1">Cliquez pour voir</div>
              </div>
            </div>
            {/* Verso */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg flex items-center justify-center rotate-y-180 overflow-hidden">
              <div className="text-center text-white w-full px-2">
                <div className={`${getFontSizeClass(dashboardStats?.totalCampaigns || 0)} font-bold mb-1 overflow-hidden text-ellipsis whitespace-nowrap`}>
                  {statsLoading ? (
                    <div className="animate-pulse bg-white/20 rounded w-12 h-8 mx-auto"></div>
                  ) : (
                    <span className="inline-block max-w-full overflow-hidden text-ellipsis">
                      {formatNumber(dashboardStats?.totalCampaigns || 0)}
                    </span>
                  )}
                </div>
                <div className="text-xs space-y-0.5">
                  <div className="overflow-hidden text-ellipsis whitespace-nowrap">En cours: {statsLoading ? (
                    <span className="animate-pulse bg-white/20 rounded w-8 h-4 inline-block"></span>
                  ) : (
                    <span>{formatNumber(dashboardStats?.totalOngoingCampaigns || 0)}</span>
                  )}</div>
                  <div className="overflow-hidden text-ellipsis whitespace-nowrap">Terminées: {statsLoading ? (
                    <span className="animate-pulse bg-white/20 rounded w-8 h-4 inline-block"></span>
                  ) : (
                    <span>{formatNumber(dashboardStats?.totalCompletedCampaigns || 0)}</span>
                  )}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Carte Formulaires soumis */}
        <div 
          className="relative w-full h-32 sm:h-40 cursor-pointer perspective-1000 hover:scale-105 transition-transform duration-300"
          onClick={() => toggleCardFlip('totalFormsSubmitted')}
        >
          <div className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
            flippedCards.totalFormsSubmitted ? 'rotate-y-180' : ''
          }`}>
            {/* Recto */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow duration-300">
              <div className="text-center text-white">
                <div className="mb-2 hover:scale-110 transition-transform duration-200 relative">
                  <div className="absolute inset-0 bg-white opacity-20 rounded-full blur-sm"></div>
                  <svg className="w-6 h-6 mx-auto relative z-10 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                    <path d="M8 12h8v2H8v-2zm0 4h8v2H8v-2z" fill="rgba(255,255,255,0.3)"/>
                  </svg>
                </div>
                <div className="text-xs font-semibold">Formulaires soumis</div>
                <div className="text-xs opacity-80 mt-1">Cliquez pour voir</div>
              </div>
            </div>
            {/* Verso */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg flex items-center justify-center rotate-y-180 overflow-hidden">
              <div className="text-center text-white w-full px-2">
                <div className={`${getFontSizeClass(dashboardStats?.totalFormsSubmitted || 0)} font-bold mb-1 overflow-hidden text-ellipsis whitespace-nowrap`}>
                  {statsLoading ? (
                    <div className="animate-pulse bg-white/20 rounded w-12 h-8 mx-auto"></div>
                  ) : (
                    <span className="inline-block max-w-full overflow-hidden text-ellipsis">
                      {formatNumber(dashboardStats?.totalFormsSubmitted || 0)}
                    </span>
                  )}
                </div>
                <div className="text-xs">Formulaires complétés</div>
                {!statsLoading && (
                  <div className="mt-1 text-xs text-purple-100 space-y-0.5">
                    <div className="overflow-hidden text-ellipsis whitespace-nowrap">Aujourd'hui : <strong>{formatNumber(dashboardStats?.todaySubmitted || 0)}</strong> / {formatNumber(dashboardStats?.totalDailyTarget || 0)}</div>
                    <div className="overflow-hidden text-ellipsis whitespace-nowrap">Moyenne : <strong>{dashboardStats?.averagePerDay ? Number(dashboardStats.averagePerDay).toFixed(1) : '0.0'}</strong> / jour</div>
                    <div className="overflow-hidden text-ellipsis whitespace-nowrap">Jours actifs : <strong>{formatNumber(dashboardStats?.workedDays || 0)}</strong>{dashboardStats?.plannedDays ? ` / ${formatNumber(dashboardStats.plannedDays)}` : ''}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Carte Objectif personnel */}
        <div 
          className="relative w-full h-32 sm:h-40 cursor-pointer perspective-1000 hover:scale-105 transition-transform duration-300"
          onClick={() => toggleCardFlip('personalTarget')}
        >
          <div className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
            flippedCards.personalTarget ? 'rotate-y-180' : ''
          }`}>
            {/* Recto */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow duration-300">
              <div className="text-center text-white">
                <div className="mb-2 hover:scale-110 transition-transform duration-200 relative">
                  <div className="absolute inset-0 bg-white opacity-20 rounded-full blur-sm"></div>
                  <svg className="w-6 h-6 mx-auto relative z-10 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 2H3v18h18V9h-8z" opacity="0.4"/>
                    <path d="M13 2v6h6" />
                  </svg>
                </div>
                <div className="text-xs font-semibold">Objectif personnel total</div>
                <div className="text-xs opacity-80 mt-1">Cliquez pour voir</div>
              </div>
            </div>
            {/* Verso */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg flex items-center justify-center rotate-y-180 overflow-hidden">
              <div className="text-center text-white w-full px-2 space-y-1">
                <div className={`${getFontSizeClass(personalTotal)} font-bold mb-1 overflow-hidden text-ellipsis whitespace-nowrap`}>
                  {statsLoading ? (
                    <div className="animate-pulse bg-white/20 rounded w-12 h-8 mx-auto"></div>
                  ) : (
                    <span className="inline-block max-w-full overflow-hidden text-ellipsis">
                      {formatNumber(personalTotal)}
                    </span>
                  )}
                </div>
                <div className="text-xs">Objectif total (toutes campagnes)</div>
                {!statsLoading && (
                  <div className="text-xs text-indigo-100 space-y-0.5">
                    <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                      Réalisé : <strong>{formatNumber(dashboardStats?.totalFormsSubmitted || 0)}</strong> /{' '}
                      {formatNumber(personalTotal)}
                    </div>
                    <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                      Reste à faire : <strong>{formatNumber(dashboardStats?.remainingToReach || 0)}</strong>
                    </div>
                    {personalDailyTarget ? (
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                        Objectif quotidien combiné : {formatNumber(personalDailyTarget)} formulaires
                      </div>
                    ) : null}
                    {dashboardStats?.plannedDays ? (
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap">Durée prévue : {formatNumber(dashboardStats.plannedDays)} jours</div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {!statsLoading && dashboardStats?.personalTargets?.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
            Objectifs par campagne
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Campagne
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Objectif quotidien
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Jours planifiés
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Objectif total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboardStats.personalTargets.map((target: any) => (
                  <tr key={target.surveyId}>
                    <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                      {target.surveyTitle}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {target.dailyTarget || 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {target.campaignDays || 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                      {target.totalTarget || 0}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          target.status === 'PUBLISHED'
                            ? 'bg-blue-100 text-blue-700'
                            : target.status === 'TERMINATED'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {target.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Graphiques — chargés à la demande (Chart.js) */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Statistiques personnelles</h3>
        <Suspense fallback={<PageLoadingFallback />}>
          <ControllerDashboardCharts personalStats={dashboardStats} />
        </Suspense>
      </div>

      {/* Alertes et Objectifs Quotidiens */}
      {!objectivesLoading && dailyObjectives.length > 0 && dailyObjectives[0] && (
        <>
          {/* Alertes Intelligentes */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Alertes</h3>
            <Suspense fallback={<PageLoadingFallback />}>
              <ObjectiveAlerts
                totalSubmitted={dailyObjectives[0].currentProgress.totalSubmitted}
                totalTarget={dailyObjectives[0].totalTarget}
                dailySubmitted={dailyObjectives[0].todayProgress.submitted}
                dailyTarget={dailyObjectives[0].todayProgress.target}
                remainingDays={dailyObjectives[0].recommendations.remainingDays}
                userRole="CONTROLLER"
              />
            </Suspense>
          </div>

          {/* Projections */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Projections</h3>
            <Suspense fallback={<PageLoadingFallback />}>
              <ObjectiveProjection
                totalSubmitted={dailyObjectives[0].currentProgress.totalSubmitted}
                totalTarget={dailyObjectives[0].totalTarget}
                dailySubmitted={dailyObjectives[0].todayProgress.submitted}
                dailyTarget={dailyObjectives[0].todayProgress.target}
                remainingDays={dailyObjectives[0].recommendations.remainingDays}
                averageDailyRate={dailyObjectives[0].recommendations.avgPerDay}
              />
            </Suspense>
          </div>
        </>
      )}

      {/* Objectifs Quotidiens */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Suivi de mes Objectifs Quotidiens</h3>
        <ControllerDailyObjectives objectives={dailyObjectives} loading={objectivesLoading} />
      </div>

      {/* Actions rapides */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Actions rapides</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <button
            onClick={() => setView('formulaire')}
            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg text-center transition-all duration-300 hover:scale-105 hover:shadow-lg"
          >
            <div className="mb-2 flex justify-center">
              <svg className="w-8 h-8 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                <path d="M8 12h8v2H8v-2zm0 4h8v2H8v-2z" fill="rgba(255,255,255,0.3)"/>
              </svg>
            </div>
            <div className="font-semibold">Nouveau sondage</div>
            <div className="text-sm opacity-90">Créer un formulaire</div>
          </button>
          <button
            onClick={() => setView('enquetes')}
            className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg text-center transition-all duration-300 hover:scale-105 hover:shadow-lg"
          >
            <div className="mb-2 flex justify-center">
              <svg className="w-8 h-8 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
              </svg>
            </div>
            <div className="font-semibold">Mes sondages</div>
            <div className="text-sm opacity-90">Voir mes données</div>
          </button>
          <button
            onClick={() => setView('surveys')}
            className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg text-center transition-all duration-300 hover:scale-105 hover:shadow-lg"
          >
            <div className="mb-2 flex justify-center">
              <svg className="w-8 h-8 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
            </div>
            <div className="font-semibold">Opportunités disponibles</div>
            <div className="text-sm opacity-90">Postuler à des campagnes disponibles</div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ControllerHome() {
  const [user, setUser] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [view, setView] = useState('dashboard'); // 'dashboard', 'formulaire', 'enquetes', 'surveys', 'parametres'

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
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

  if (!user) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Chargement de l'utilisateur...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation responsive */}
      <nav className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white shadow-lg border-b border-blue-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo et titre */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative">
                <img src={APP_LOGO_URL} alt="Logo Fikiri Collect" className="h-10 sm:h-12 w-auto object-contain bg-white rounded-lg shadow-md p-1" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base sm:text-lg text-white">Enquêteur</span>
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
            <div className="hidden md:flex items-center gap-1">
              <button 
                onClick={() => handleViewChange('dashboard')} 
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  view === 'dashboard' 
                    ? 'bg-white text-blue-900 shadow-lg transform scale-105' 
                    : 'text-white hover:bg-blue-700/50 hover:scale-105'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                  </svg>
                  Dashboard
                </div>
              </button>
              <button 
                onClick={() => handleViewChange('formulaire')} 
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  view === 'formulaire' 
                    ? 'bg-white text-blue-900 shadow-lg transform scale-105' 
                    : 'text-white hover:bg-blue-700/50 hover:scale-105'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                  </svg>
                  Nouveau sondage
                </div>
              </button>
              <button 
                onClick={() => handleViewChange('enquetes')} 
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  view === 'enquetes' 
                    ? 'bg-white text-blue-900 shadow-lg transform scale-105' 
                    : 'text-white hover:bg-blue-700/50 hover:scale-105'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                  </svg>
                  Mes sondages
                </div>
              </button>
              <button 
                onClick={() => handleViewChange('surveys')} 
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  view === 'surveys' 
                    ? 'bg-white text-blue-900 shadow-lg transform scale-105' 
                    : 'text-white hover:bg-blue-700/50 hover:scale-105'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                  </svg>
                  Opportunités disponibles
                </div>
              </button>
              <button 
                onClick={() => handleViewChange('parametres')} 
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  view === 'parametres' 
                    ? 'bg-white text-blue-900 shadow-lg transform scale-105' 
                    : 'text-white hover:bg-blue-700/50 hover:scale-105'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
                  </svg>
                  Paramètres
                </div>
              </button>
              
              {/* Profil utilisateur et déconnexion */}
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-blue-700">
                {user && (
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-white text-blue-900 flex items-center justify-center font-bold shadow-md hover:shadow-lg transition-shadow duration-200">
                      {user?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
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
                onClick={() => handleViewChange('formulaire')} 
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  view === 'formulaire' 
                    ? 'bg-white text-blue-900 shadow-lg' 
                    : 'text-white hover:bg-blue-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                  </svg>
                  Nouveau sondage
                </div>
              </button>
              <button 
                onClick={() => handleViewChange('enquetes')} 
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  view === 'enquetes' 
                    ? 'bg-white text-blue-900 shadow-lg' 
                    : 'text-white hover:bg-blue-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                  </svg>
                  Mes sondages
                </div>
              </button>
              <button 
                onClick={() => handleViewChange('surveys')} 
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  view === 'surveys' 
                    ? 'bg-white text-blue-900 shadow-lg' 
                    : 'text-white hover:bg-blue-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                  </svg>
                  Opportunités disponibles
                </div>
              </button>
              <button 
                onClick={() => handleViewChange('parametres')} 
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  view === 'parametres' 
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
                      <span className="text-sm font-semibold text-white">{user?.name || 'Enquêteur'}</span>
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
      <main className="p-4 sm:p-8">
        {view === 'dashboard' && <DashboardController setView={setView} />}
        {view === 'formulaire' && (
          <Suspense fallback={<PageLoadingFallback />}>
            <ControllerCampaignForms />
          </Suspense>
        )}
        {view === 'enquetes' && (
          <Suspense fallback={<PageLoadingFallback />}>
            <RecordsList />
          </Suspense>
        )}
        {view === 'surveys' && (
          <Suspense fallback={<PageLoadingFallback />}>
            <ControllerAvailableSurveys />
          </Suspense>
        )}
        {view === 'parametres' && (
          <Suspense fallback={<PageLoadingFallback />}>
            <Settings />
          </Suspense>
        )}
      </main>
      
      <PNUDFooter />
    </div>
  );
} 
