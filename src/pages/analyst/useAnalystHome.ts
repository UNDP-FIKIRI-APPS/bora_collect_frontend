import { useEffect, useState, useMemo, useCallback } from 'react';
import { useDebounce } from '../../utils/debounce';
import { useNavigate } from 'react-router-dom';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useAnalystDashboard } from './useAnalystDashboard';
import { performLogout } from '../../utils/authStorage';
import { toast } from 'react-toastify';
import { getChartColor, getChartColors, CompatibleColors } from '../../utils/colors';
import enhancedApiService from '../../services/enhancedApiService';
import { exportEnquetesToExcel, exportStatsToExcel, exportStatsSexeToExcel } from '../../utils/excelExport';
import {
  fetchUserById,
  validateRecord,
  exportAnalystRecords,
  fetchEnumeratorStats as loadEnumeratorStats,
  fetchEnumeratorSubmissions as loadEnumeratorSubmissions,
  detectDuplicates,
} from './analystApi';
import { devLogger } from '../../utils/logger';

export type AnalystView = 'dashboard' | 'enquetes' | 'statistiques' | 'parametres';

const communesKinshasa = [
  'Gombe', 'Kinshasa', 'Kintambo', 'Ngaliema', 'Mont-Ngafula',
  'Selembao', 'Bumbu', 'Makala', 'Ngiri-Ngiri', 'Kalamu',
  'Kasa-Vubu', 'Bandalungwa', 'Lingwala', 'Barumbu', 'Matete',
  'Lemba', 'Ngaba', 'Kisenso', 'Limete', 'Masina',
  'Nsele', 'Maluku', 'Kimbaseke', 'Ndjili'
];

export function useAnalystHome() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'dashboard'|'enquetes'|'statistiques'|'parametres'>('dashboard');
  const [selectedEnumeratorId, setSelectedEnumeratorId] = useState<string | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState('');
  const [validationStats, setValidationStats] = useState<any>(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [search, setSearch] = useState('');
  // Debounce pour optimiser les recherches (300ms de délai)
  const debouncedSearch = useDebounce(search, 300);
  const [reviewComment, setReviewComment] = useState('');
  const [showCommentField, setShowCommentField] = useState(false);
const [recordActionLocked, setRecordActionLocked] = useState(false);
const [recordActionMessage, setRecordActionMessage] = useState<string | null>(null);
  const [communeFilter, setCommuneFilter] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('');
  const [campaignData, setCampaignData] = useState<any>(null);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [enumeratorStats, setEnumeratorStats] = useState<any[]>([]);
  const [enumeratorStatsLoading, setEnumeratorStatsLoading] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [hasTriedReloadRecords, setHasTriedReloadRecords] = useState(false);
  const [enumeratorSubmissions, setEnumeratorSubmissions] = useState<any>(null);
  const [enumeratorSubmissionsLoading, setEnumeratorSubmissionsLoading] = useState(false);
  const [analystStats, setAnalystStats] = useState<any>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [isDeletingDuplicates, setIsDeletingDuplicates] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [exportNotification, setExportNotification] = useState<{
    isVisible: boolean;
    isSuccess: boolean;
    message: string;
  }>({
    isVisible: false,
    isSuccess: false,
    message: ''
  });
  const [successNotification, setSuccessNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'warning';
  }>({
    show: false,
    message: '',
    type: 'success'
  });
  const [pageSize] = useState(50);
  
  // États pour l'effet de retournement des cartes
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  
  const { fetchDashboard, invalidateDashboard } = useAnalystDashboard();

  // Fonction pour basculer l'état de retournement
  const toggleCardFlip = (cardId: string) => {
    setFlippedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Charger les données utilisateur depuis le serveur pour avoir les données fraîches
        const userData = await enhancedApiService.get<{ user: any }>('/auth/me');
        
        // Logs réduits pour améliorer les performances
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

    // Écouter les événements de mise à jour du profil
    const handleProfileUpdate = (event: CustomEvent) => {
      const updatedUser = event.detail;
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate as EventListener);
    
    return () => {
      window.removeEventListener('userProfileUpdated', handleProfileUpdate as EventListener);
    };
  }, []);

  // Récupérer les statistiques du tableau de bord - DÉSACTIVÉ (non utilisé)
  // useEffect(() => {
  //   setDashboardLoading(true);
  //   setDashboardError('');
  //   
  //   fetch('http://localhost:3000/records/stats/overview', { 
  //     headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
  //   })
  //   .then(r => r.json())
  //   .then(stats => {
  //     // setDashboardStats(stats); // This line was removed as per the edit hint
  //   })
  //   .catch(e => {
  //     setDashboardError('Erreur lors du chargement des statistiques');
  //   })
  //   .finally(() => setDashboardLoading(false));
  // }, []); // Chargement automatique au montage du composant

  // Fonction pour récupérer les données de campagne de l'analyste (optimisée - logs réduits)
  const fetchAnalystCampaignData = useCallback(async () => {
    setCampaignLoading(true);
    try {
      // Utilisation du nouveau service API avec gestion automatique des erreurs
      const data = await enhancedApiService.get<any>('/users/analyst-campaign-data', {
        skipCache: true, // Forcer le refresh pour les données critiques
      });
      
      setCampaignData(data);
      devLogger.log('✅ Campaign data chargée:', data);
    } catch (err: any) {
      console.error('❌ Erreur lors du chargement de campaign data:', err);
      setCampaignData(null);
    } finally {
      setCampaignLoading(false);
    }
  }, []);

  const fetchAnalystStats = async () => {
    setStatsLoading(true);
    try {
      // Utilisation du nouveau service API
      const data = await enhancedApiService.get<any>('/records/analyst-stats', {
        skipCache: true, // Forcer le refresh pour les stats
      });

      devLogger.log('📊 AnalystStats reçues:', {
        totalRecords: data.totalRecords,
        totalByApplication: data.totalByApplication,
        totalByPublicLink: data.totalByPublicLink,
        totalEnumerators: data.totalEnumerators
      });
      setAnalystStats(data);
    } catch (err: any) {
      console.error('❌ Erreur lors de la récupération des stats analyst:', err);
      setAnalystStats(null);
    } finally {
      setStatsLoading(false);
      devLogger.log('🔍 fetchAnalystStats: Terminé');
    }
  };

  // Charger toutes les données via l'endpoint composite (1 requête au lieu de 4+)
  const loadAllData = useCallback(async () => {
    setCampaignLoading(true);
    setStatsLoading(true);
    setValidationLoading(true);
    setRecordsLoading(true);
    try {
      const data = await fetchDashboard(1, pageSize);
      setCampaignData(data.campaignData);
      setAnalystStats(data.analystStats);
      setValidationStats(data.validationStats);

      const recordsArray = data.records?.data || [];
      const pagination = data.records?.pagination;
      const enrichedRecords = recordsArray.map((record: any) => ({
        ...record,
        authorName: record.author?.name || 'N/A',
      }));

      setRecords(enrichedRecords);
      if (pagination) {
        setTotalRecords(pagination.total || enrichedRecords.length);
        setTotalPages(pagination.totalPages || 1);
        setCurrentPage(pagination.page || 1);
      } else {
        setTotalRecords(enrichedRecords.length);
        setTotalPages(1);
        setCurrentPage(1);
      }
      setHasTriedReloadRecords(true);
    } catch (error) {
      console.error('❌ AnalystHome: Erreur lors du chargement du dashboard:', error);
    } finally {
      setCampaignLoading(false);
      setStatsLoading(false);
      setValidationLoading(false);
      setRecordsLoading(false);
    }
  }, [fetchDashboard, pageSize]);

  // Sélectionner automatiquement la campagne dès que les données sont disponibles
  useEffect(() => {
    // Ne sélectionner que si aucune campagne n'est déjà sélectionnée
    if (!selectedCampaignId && !campaignLoading) {
      // Priorité 1: Utiliser la campagne de campaignData si disponible
      if (campaignData?.campaign?.id) {
        const campaignId = campaignData.campaign.id;
        devLogger.log('🔍 Auto-sélection de la campagne depuis campaignData:', campaignId);
        setSelectedCampaignId(campaignId);
        // Charger les stats enquêteurs immédiatement
        fetchEnumeratorStats(campaignId);
        return;
      }
      
      // Priorité 2: Utiliser la campagne depuis analystStats
      if (analystStats?.campaign?.id) {
        const campaignId = analystStats.campaign.id;
        devLogger.log('🔍 Auto-sélection de la campagne depuis analystStats:', campaignId);
        setSelectedCampaignId(campaignId);
        // Charger les stats enquêteurs immédiatement
        fetchEnumeratorStats(campaignId);
        return;
      }
      
      // Priorité 3: Utiliser la première campagne trouvée dans les records
      if (records.length > 0) {
        const firstRecordWithSurvey = records.find((r: any) => r.surveyId || r.campaignId);
        const surveyId = firstRecordWithSurvey?.surveyId || firstRecordWithSurvey?.campaignId;
        if (surveyId) {
          devLogger.log('🔍 Auto-sélection de la campagne depuis records:', surveyId);
          setSelectedCampaignId(surveyId);
          // Charger les stats enquêteurs immédiatement
          fetchEnumeratorStats(surveyId);
          return;
        }
      }
    }
  }, [campaignData, analystStats, records, selectedCampaignId, campaignLoading]);

  // Charger les stats des enquêteurs quand on arrive sur la page enquetes avec une campagne sélectionnée
  useEffect(() => {
    if (view === 'enquetes' && selectedCampaignId && !selectedEnumeratorId) {
      // Recharger les stats si elles sont vides ou si la campagne a changé
      if (enumeratorStats.length === 0 && !enumeratorStatsLoading) {
        devLogger.log('🔍 Chargement des stats enquêteurs pour la campagne:', selectedCampaignId);
        fetchEnumeratorStats(selectedCampaignId);
      }
    }
  }, [view, selectedCampaignId, selectedEnumeratorId, enumeratorStats.length, enumeratorStatsLoading]);

  // Récupérer les enquêtes (chargement automatique dès la connexion)
  useEffect(() => {
    devLogger.log('🔍 AnalystHome: useEffect déclenché - chargement initial');
    devLogger.log('🔍 AnalystHome: Token dans localStorage:', !!localStorage.getItem('token'));
    devLogger.log('🔍 AnalystHome: User dans localStorage:', localStorage.getItem('user'));
    
    loadAllData();
  }, []); // Charger uniquement une fois au montage du composant

  // Recharger les données quand les filtres changent (avec debounce pour search)
  useEffect(() => {
    // Ne recharger que si on a déjà chargé des données une fois
    if (hasTriedReloadRecords || records.length > 0 || analystStats) {
      setCurrentPage(1);
      fetchRecords(1, false); // Ne pas append, remplacer les données
    }
  }, [debouncedSearch, communeFilter, provinceFilter]);

  // Fonction pour récupérer les informations d'un utilisateur
  const fetchUserInfo = async (userId: string): Promise<string> => {
    devLogger.log(`🔍 Tentative de récupération de l'utilisateur: ${userId}`);
    const displayName = await fetchUserById(userId);
    devLogger.log(`📝 Nom d'affichage: ${displayName}`);
    return displayName;
  };

  // Fonction pour récupérer les statistiques de validation
  const fetchValidationStats = async () => {
    devLogger.log('🔍 fetchValidationStats: Début');
    setValidationLoading(true);
    try {
      // Utilisation du nouveau service API
      const data = await enhancedApiService.get('/validation/analyst-stats', {
        skipCache: true, // Forcer le refresh pour les stats
      });

      devLogger.log('📊 Stats de validation reçues:', data);
      setValidationStats(data);
    } catch (err: any) {
      console.error('❌ Erreur lors de la récupération des stats de validation:', err);
      setValidationStats(null);
    } finally {
      setValidationLoading(false);
      devLogger.log('🔍 fetchValidationStats: Terminé');
    }
  };

  // Fermer la modal de détails
  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedRecord(null);
    setReviewComment('');
    setShowCommentField(false);
    setRecordActionLocked(false);
    setRecordActionMessage(null);
  };

  // Fonction pour valider un formulaire
  const handleValidate = async (recordId: string, status: 'VALIDATED' | 'NEEDS_REVIEW') => {
    try {
      if (status === 'NEEDS_REVIEW' && !reviewComment.trim()) {
        toast.warning('Veuillez fournir un commentaire pour marquer ce formulaire comme "À revoir"');
        return;
      }

      await validateRecord(
        recordId,
        status,
        status === 'NEEDS_REVIEW' ? reviewComment : null,
      );

      setSuccessNotification({
        show: true,
        message: status === 'VALIDATED'
          ? '✅ Formulaire validé avec succès !'
          : '⚠️ Formulaire marqué comme "À revoir". Le Project Manager sera notifié.',
        type: status === 'VALIDATED' ? 'success' : 'warning',
      });
      setRecordActionLocked(true);
      setRecordActionMessage(
        status === 'VALIDATED'
          ? 'Le formulaire a été validé avec succès.'
          : 'Le formulaire a été marqué "À revoir". Le Project Manager sera notifié pour une analyse approfondie.',
      );
      setSelectedRecord((prev: any) =>
        prev
          ? {
              ...prev,
              analystValidationStatus: status,
              status: status === 'VALIDATED' ? 'SENT' : 'TO_CORRECT',
              modificationRequested: false,
              modificationAccepted: status === 'VALIDATED' ? prev.modificationAccepted : null,
            }
          : prev,
      );
      invalidateDashboard();
      fetchRecords(currentPage);
      fetchValidationStats();
      setReviewComment('');
      setShowCommentField(false);
    } catch (error: any) {
      console.error('Erreur lors de la validation:', error);
      toast.error(error?.message || 'Erreur de connexion au serveur');
    }
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Les campagnes seront récupérées depuis les stats (analystStats.campaign)
  // Pas besoin d'un endpoint séparé car l'analyste n'a pas accès à /surveys/admin

  // Récupérer les enquêtes - AVEC PAGINATION ET FILTRES (optimisé pour 15 000+ enregistrements)
  // Support du chargement incrémental pour infinite scroll
  const fetchRecords = useCallback(async (page: number = 1, append: boolean = false) => {
    devLogger.log('🔍 fetchRecords: Début', { page, pageSize, search: debouncedSearch, communeFilter, provinceFilter });
    setRecordsLoading(true);
    setRecordsError('');
    try {
      // Construire les paramètres de requête avec filtres
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString()
      });
      
      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }
      if (communeFilter) {
        params.append('commune', communeFilter);
      }
      if (provinceFilter) {
        params.append('province', provinceFilter);
      }

      // Utilisation du nouveau service API avec cache intelligent et filtres
      const response = await enhancedApiService.get<any>(`/records/analyst?${params.toString()}`, {
        skipCache: true, // Forcer le refresh pour les données critiques
      });
      
      // Gérer la réponse paginée ou l'ancien format (rétrocompatibilité)
      const data = response.data || response;
      const pagination = response.pagination;
      
      // S'assurer que data est un tableau
      const recordsArray = Array.isArray(data) ? data : [];
      
      if (pagination) {
        setTotalRecords(pagination.total || recordsArray.length);
        setTotalPages(pagination.totalPages || Math.ceil((pagination.total || recordsArray.length) / pageSize));
        setCurrentPage(pagination.page || page);
      } else {
        // Si pas de pagination, utiliser la longueur du tableau
        setTotalRecords(recordsArray.length);
        setTotalPages(Math.ceil(recordsArray.length / pageSize));
        setCurrentPage(page);
      }
      
      devLogger.log('📊 Récupération des enquêtes:', recordsArray.length, 'enregistrements trouvés', pagination ? `(page ${pagination.page || page}/${pagination.totalPages || Math.ceil(recordsArray.length / pageSize)})` : '');
      
      // Les données incluent déjà l'author depuis le backend - Plus besoin de requêtes N+1
      const enrichedRecords = recordsArray.map((record: any) => ({
        ...record,
        authorName: record.author?.name || 'N/A'
      }));
      
      devLogger.log('✅ Enregistrements chargés (optimisé - pas de requêtes N+1)');
      
      // Si append est true, ajouter les nouveaux enregistrements aux existants
      if (append) {
        setRecords(prev => [...prev, ...enrichedRecords]);
      } else {
        setRecords(enrichedRecords);
      }
    } catch (err: any) {
      console.error('❌ Erreur lors de la récupération des enquêtes:', err);
      setRecordsError(err.message || 'Erreur inconnue');
      setRecords([]);
    } finally {
      setRecordsLoading(false);
      devLogger.log('🔍 fetchRecords: Terminé');
    }
  }, [debouncedSearch, communeFilter, provinceFilter, pageSize]);

  // Hook pour le chargement au scroll (infinite scroll) - après la déclaration de fetchRecords
  const hasMore = currentPage < totalPages;
  const { observerTarget } = useInfiniteScroll({
    hasMore,
    loading: recordsLoading,
    onLoadMore: () => {
      if (hasMore && !recordsLoading) {
        fetchRecords(currentPage + 1, true); // Append les nouvelles données
      }
    },
    threshold: 200
  });

  // Les filtres sont maintenant appliqués côté serveur, donc on utilise directement records
  // On garde seulement le filtre par enquêteur sélectionné (côté client car c'est une sélection UI)
  const filteredRecords = records.filter(record => {
    // Filtre par enquêteur sélectionné (côté client car c'est une sélection UI)
    const matchesEnumerator = !selectedEnumeratorId || record.authorId === selectedEnumeratorId;
    return matchesEnumerator;
  });

  // Fonction pour afficher les notifications d'export
  const showExportNotification = (isSuccess: boolean, message: string) => {
    setExportNotification({
      isVisible: true,
      isSuccess,
      message
    });
    
    // Masquer automatiquement après 5 secondes
    setTimeout(() => {
      setExportNotification(prev => ({ ...prev, isVisible: false }));
    }, 5000);
  };

  // Fonction pour fermer la notification
  const closeExportNotification = () => {
    setExportNotification(prev => ({ ...prev, isVisible: false }));
  };

  // Fonction pour récupérer les statistiques des enquêteurs par campagne
  // Fonction pour exporter tous les formulaires (optimisée - génération côté serveur)
  const exportAllEnumeratorsSubmissions = async (campaignId?: string) => {
    try {
      setExportNotification({
        isVisible: true,
        isSuccess: false,
        message: 'Génération du fichier Excel en cours... Cela peut prendre quelques instants pour 22 000+ formulaires.'
      });

      const finalCampaignId = campaignId || analystStats?.campaign?.id || campaignData?.campaign?.id;

      if (!finalCampaignId) {
        throw new Error('Aucune campagne trouvée. Veuillez sélectionner une campagne.');
      }

      const { blob, filename } = await exportAnalystRecords(finalCampaignId);

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;

      const fileName = filename || `enquetes_${new Date().toISOString().split('T')[0]}.xlsx`;

      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      setExportNotification({
        isVisible: true,
        isSuccess: true,
        message: '✅ Export Excel réussi ! Le fichier est en cours de téléchargement.'
      });
    } catch (error: any) {
      console.error('Erreur lors de l\'export de tous les formulaires:', error);
      setExportNotification({
        isVisible: true,
        isSuccess: false,
        message: `❌ Erreur: ${error.message || 'Impossible d\'exporter les formulaires'}`
      });
    }
  };

  const fetchEnumeratorStats = async (campaignId: string) => {
    setEnumeratorStatsLoading(true);
    try {
      const statsArray = await loadEnumeratorStats(campaignId);
      setEnumeratorStats(statsArray);
      devLogger.log('✅ Stats enquêteurs chargées:', statsArray.length);
    } catch (err: any) {
      console.error('Erreur lors de la récupération des stats des enquêteurs:', err);
      setEnumeratorStats([]);
    } finally {
      setEnumeratorStatsLoading(false);
    }
  };

  // Fonction pour récupérer les soumissions d'un enquêteur
  const fetchEnumeratorSubmissions = async (enumeratorId: string, campaignId: string) => {
    setEnumeratorSubmissionsLoading(true);
    try {
      const data = await loadEnumeratorSubmissions(campaignId, enumeratorId);
      setEnumeratorSubmissions(data);
      setSelectedEnumeratorId(enumeratorId);
      devLogger.log('✅ Soumissions chargées pour l\'enquêteur:', enumeratorId, data);
    } catch (err: any) {
      console.error('❌ Erreur lors de la récupération des soumissions:', err);
      setEnumeratorSubmissions(null);
    } finally {
      setEnumeratorSubmissionsLoading(false);
    }
  };

  // Fonction pour gérer le clic sur un enquêteur
  const handleEnumeratorClick = async (enumeratorId: string, campaignId: string) => {
    await fetchEnumeratorSubmissions(enumeratorId, campaignId);
  };

  // Fonction d'export des enquêtes avec gestion d'erreur
  // Fonction d'export optimisée - utilise l'endpoint serveur pour les grandes quantités
  const handleExportEnquetes = async () => {
    try {
      // Si on a beaucoup d'enregistrements, utiliser l'export côté serveur
      if (totalRecords > 1000) {
        showExportNotification(false, 'Génération du fichier Excel en cours...');

        const { blob, filename } = await exportAnalystRecords();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        const fileName = filename || `enquetes_${new Date().toISOString().split('T')[0]}.xlsx`;

        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        showExportNotification(true, '✅ Export Excel réussi !');
      } else {
        // Pour les petites quantités, utiliser l'export côté client
        if (records.length > 0) {
          const success = exportEnquetesToExcel(records, 'enquetes_analyste');
          if (success) {
            showExportNotification(true, 'Export des enquêtes réussi !');
          } else {
            showExportNotification(false, 'Erreur lors de l\'export des enquêtes');
          }
        } else {
          showExportNotification(false, 'Aucune enquête à exporter');
        }
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'export:', error);
      showExportNotification(false, `Erreur: ${error.message || 'Erreur inconnue'}`);
    }
  };

  // Fonction d'export des statistiques avec gestion d'erreur
  const handleDetectDuplicates = async () => {
    if (!selectedCampaignId) return;
    setIsDeletingDuplicates(true);
    try {
      const result = await detectDuplicates(selectedCampaignId);
      toast.success(
        `${result.duplicatesRemoved} doublon${result.duplicatesRemoved > 1 ? 's' : ''} supprimé${result.duplicatesRemoved > 1 ? 's' : ''} sur ${result.duplicatesFound} détecté${result.duplicatesFound > 1 ? 's' : ''}`,
        { autoClose: 5000 },
      );
      setShowDeleteConfirmModal(false);
      fetchEnumeratorStats(selectedCampaignId);
      fetchAnalystStats();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error?.message || 'Erreur lors de la suppression des doublons');
    } finally {
      setIsDeletingDuplicates(false);
    }
  };

  const handleExportStats = () => {
    try {
      if (cookingStats) {
        // Préparer les données pour l'export
        const statsCommune = Object.entries(cookingStats.communes).map(([commune, count]) => {
          const totalEnquetes = cookingStats.totalEnquetes;
          const pourcentage = totalEnquetes > 0 ? ((count / totalEnquetes) * 100).toFixed(1) : '0.0';
          return {
            commune,
            nombreEnquetes: count,
            typesCombustibles: Object.keys(cookingStats.combustiblesParCommune[commune] || {}).length,
            typesEquipements: Object.keys(cookingStats.equipementsParCommune[commune] || {}).length,
            pourcentageTotal: `${pourcentage}%`
          };
        });
        
        const statsCombustibles = Object.entries(cookingStats.combustibles).map(([combustible, count]) => ({
          combustible,
          nombreEnquetes: count
        }));
        
        const statsEquipements = Object.entries(cookingStats.equipements).map(([equipement, count]) => ({
          combustible: equipement, // Réutiliser la même interface
          nombreEnquetes: count
        }));
        
        const success = exportStatsToExcel(statsCommune, statsCombustibles, statsEquipements, 'statistiques_detaillees_analyste');
        if (success) {
          showExportNotification(true, 'Export des statistiques réussi !');
        } else {
          showExportNotification(false, 'Erreur lors de l\'export des statistiques');
        }
      }
    } catch (error) {
      showExportNotification(false, 'Erreur lors de l\'export des statistiques');
    }
  };

  // Fonction utilitaire pour extraire le sexe depuis différents formats
  const getSexeFromRecord = (record: any): string | null => {
    if (!record?.formData) return null;
    const formData = record.formData;
    
    // Chercher dans plusieurs emplacements possibles
    const sexe = 
      formData['identification.sexe'] || 
      formData['household.sexe'] ||
      formData.sexe || 
      formData.household?.sexe ||
      formData.identification?.sexe ||
      null;
    
    return sexe;
  };

  // Fonction d'export des statistiques par sexe avec gestion d'erreur
  const handleExportStatsSexe = (filename: string = 'statistiques_sexe_analyste') => {
    try {
      const statsHommes = records.filter(r => {
        const sexe = getSexeFromRecord(r);
        return sexe === 'Homme' || sexe === 'Masculin' || sexe === 'masculin' || sexe === 'male' || sexe === 'MALE';
      }).length;

      const statsFemmes = records.filter(r => {
        const sexe = getSexeFromRecord(r);
        return sexe === 'Femme' || sexe === 'Féminin' || sexe === 'feminin' || sexe === 'female' || sexe === 'FEMALE';
      }).length;

      const statsAutre = records.filter(r => {
        const sexe = getSexeFromRecord(r);
        return sexe === 'Autre' || sexe === 'autre' || sexe === 'other' || sexe === 'OTHER';
      }).length;
      
      const success = exportStatsSexeToExcel(
        statsHommes,
        statsFemmes,
        statsAutre,
        analystStats?.totalRecords || 0,
        filename
      );
      
      if (success) {
        showExportNotification(true, 'Export des statistiques par sexe réussi !');
      } else {
        showExportNotification(false, 'Erreur lors de l\'export des statistiques par sexe');
      }
    } catch (error) {
      showExportNotification(false, 'Erreur lors de l\'export des statistiques par sexe');
    }
  };

  // Calcul des statistiques des solutions de cuisson (version améliorée avec répartition par commune)
  const calculateCookingStats = () => {
    if (!records.length) return null;

    const stats = {
      combustibles: {} as Record<string, number>,
      equipements: {} as Record<string, number>,
      communes: {} as Record<string, number>,
      status: {} as Record<string, number>,
      totalEnquetes: records.length,
      totalEnqueteurs: 0, // NOUVEAU : Nombre total d'enquêteurs
      // NOUVEAU : Statistiques détaillées par commune
      equipementsParCommune: {} as Record<string, Record<string, number>>,
      combustiblesParCommune: {} as Record<string, Record<string, number>>
    };

    // Set pour compter les enquêteurs uniques
    const enqueteursUniques = new Set<string>();

    records.forEach(record => {
      // Compter les enquêteurs uniques
      if (record.authorId) {
        enqueteursUniques.add(record.authorId);
      }

      // Stats par statut
      const status = record.status || 'Inconnu';
      stats.status[status] = (stats.status[status] || 0) + 1;

      // Stats par commune
      const commune = record.formData?.household?.communeQuartier || 'Non spécifiée';
      stats.communes[commune] = (stats.communes[commune] || 0) + 1;

      // Initialiser les objets pour cette commune si nécessaire
      if (!stats.equipementsParCommune[commune]) {
        stats.equipementsParCommune[commune] = {};
        stats.combustiblesParCommune[commune] = {};
      }

      // Stats par combustible (global et par commune)
      if (record.formData?.cooking?.combustibles) {
        record.formData.cooking.combustibles.forEach((combustible: string) => {
          // Global
          stats.combustibles[combustible] = (stats.combustibles[combustible] || 0) + 1;
          // Par commune
          stats.combustiblesParCommune[commune][combustible] = 
            (stats.combustiblesParCommune[commune][combustible] || 0) + 1;
        });
      }

      // Stats par équipement (global et par commune)
      if (record.formData?.cooking?.equipements) {
        record.formData.cooking.equipements.forEach((equipement: string) => {
          // Global
          stats.equipements[equipement] = (stats.equipements[equipement] || 0) + 1;
          // Par commune
          stats.equipementsParCommune[commune][equipement] = 
            (stats.equipementsParCommune[commune][equipement] || 0) + 1;
        });
      }
    });

    // Calculer le nombre total d'enquêteurs uniques
    stats.totalEnqueteurs = enqueteursUniques.size;

    return stats;
  };

  const cookingStats = calculateCookingStats();

  // Données pour les graphiques (version améliorée avec répartition par commune)
  const getChartData = () => {
    if (!analystStats) return null;

    // Préparer les données pour les graphiques basés sur les champs du formulaire
    const communesAvecDonnees = Object.keys(analystStats.communes || {}).filter(commune => 
      (analystStats.communes || {})[commune] > 0
    );

    // Créer des graphiques dynamiques basés sur les champs du formulaire
    const chartData: any = {
      communes: {
        labels: Object.keys(analystStats.communes || {}),
        datasets: [{
          label: 'Nombre d\'enquêtes',
          data: Object.values(analystStats.communes || {}),
          backgroundColor: getChartColor(CompatibleColors.chart.blue, 0.8),
        }]
      }
    };

    // Générer les données pour les graphiques par commune (combustibles et équipements)
    if (records && records.length > 0) {
      // Analyser les combustibles par commune
      const combustiblesParCommune: any = {};
      const equipementsParCommune: any = {};
      
      // Initialiser toutes les communes de Kinshasa
      communesKinshasa.forEach(commune => {
        combustiblesParCommune[commune] = {};
        equipementsParCommune[commune] = {};
      });

      // Analyser chaque record
      records.forEach(record => {
        const formData = record.formData as any;
        const commune = formData?.['identification.communeQuartier'] || formData?.household?.communeQuartier || 'Non spécifiée';
        
        // Analyser les combustibles (format ranking)
        const combustibles = formData?.['modeCuisson.combustibles'];
        if (combustibles && typeof combustibles === 'object') {
          Object.keys(combustibles).forEach(combustible => {
            if (!combustiblesParCommune[commune]) {
              combustiblesParCommune[commune] = {};
            }
            combustiblesParCommune[commune][combustible] = (combustiblesParCommune[commune][combustible] || 0) + 1;
          });
        }
        
        // Analyser les équipements
        const equipements = formData?.['modeCuisson.equipements'];
        if (equipements) {
          if (!equipementsParCommune[commune]) {
            equipementsParCommune[commune] = {};
          }
          equipementsParCommune[commune][equipements] = (equipementsParCommune[commune][equipements] || 0) + 1;
        }
      });

      // Créer les datasets pour les graphiques par commune
      const combustiblesTypes = ['Électricité', 'Charbon de bois (Makala)', 'Bois', 'Gaz (butane/propane)', 'Charbon de bois'];
      const equipementsTypes = ['Cuisinière électrique', 'Réchaud à gaz (GPL)', 'Foyer trois pierres traditionnel', 'Foyer classique au charbon/bois', 'Foyer amélioré au charbon/bois', 'Foyer traditionnel', 'Marmite en fonte'];

      chartData.combustiblesParCommune = {
        labels: communesKinshasa,
        datasets: combustiblesTypes.map((type, index) => ({
          label: type,
          data: communesKinshasa.map(commune => combustiblesParCommune[commune]?.[type] || 0),
          backgroundColor: [
            getChartColor('#f97316', 0.8),   // Orange pour Électricité
            getChartColor('#6b7280', 0.8),   // Gris pour Charbon de bois (Makala)
            getChartColor(CompatibleColors.chart.blue, 0.8),   // Bleu pour Bois
            getChartColor('#14b8a6', 0.8),   // Vert pour Gaz
            getChartColor(CompatibleColors.chart.purple, 0.8),  // Violet pour Charbon de bois
          ][index]
        }))
      };

      chartData.equipementsParCommune = {
        labels: communesKinshasa,
        datasets: equipementsTypes.map((type, index) => ({
          label: type,
          data: communesKinshasa.map(commune => equipementsParCommune[commune]?.[type] || 0),
          backgroundColor: [
            getChartColor(CompatibleColors.chart.red, 0.8),   // Rouge pour Cuisinière électrique
            getChartColor(CompatibleColors.chart.blue, 0.8),    // Bleu pour Réchaud à gaz
            getChartColor(CompatibleColors.chart.yellow, 0.8),    // Jaune pour Foyer trois pierres
            getChartColor('#14b8a6', 0.8),    // Cyan pour Foyer classique
            getChartColor(CompatibleColors.chart.purple, 0.8),   // Violet pour Foyer amélioré
            getChartColor(CompatibleColors.chart.green, 0.8),     // Vert pour Foyer traditionnel
            getChartColor('#f97316', 0.8),    // Orange pour Marmite en fonte
          ][index]
        }))
      };
    }

    // Ajouter des graphiques pour les champs de type select/radio/checkbox
    if (analystStats.formFields) {
      Object.entries(analystStats.formFields || {}).forEach(([fieldName, fieldData]: [string, any]) => {
        if (['select', 'radio', 'checkbox', 'ranking'].includes(fieldData.type) && Object.keys(fieldData.values || {}).length > 0) {
          const valueCount = Object.keys(fieldData.values).length;
          chartData[fieldName] = {
            labels: Object.keys(fieldData.values),
            datasets: [{
              label: fieldData.label || fieldName,
              data: Object.values(fieldData.values),
              backgroundColor: getChartColors(valueCount, 0.8),
            }]
          };
        }
      });
    }

    return chartData;
  };

  // Utiliser useMemo pour éviter le recalcul inutile et forcer la mise à jour
  const chartData = useMemo(() => getChartData(), [analystStats, records]);

  // Gestionnaire d'erreur global
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('❌ Erreur globale capturée:', event.error);
      setError(event.error?.message || 'Erreur inconnue');
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('❌ Promesse rejetée:', event.reason);
      setError(event.reason?.message || 'Erreur de promesse');
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const handleLogout = () => {
    void performLogout(navigate);
  };

  return {
    user,
    error,
    setError,
    view,
    setView,
    selectedEnumeratorId,
    setSelectedEnumeratorId,
    records,
    recordsLoading,
    validationStats,
    validationLoading,
    selectedRecord,
    setSelectedRecord,
    showDetailModal,
    setShowDetailModal,
    search,
    setSearch,
    reviewComment,
    setReviewComment,
    showCommentField,
    setShowCommentField,
    recordActionLocked,
    recordActionMessage,
    communeFilter,
    setCommuneFilter,
    provinceFilter,
    setProvinceFilter,
    campaignData,
    enumeratorStats,
    enumeratorStatsLoading,
    selectedCampaignId,
    setSelectedCampaignId,
    enumeratorSubmissions,
    setEnumeratorSubmissions,
    enumeratorSubmissionsLoading,
    analystStats,
    showDeleteConfirmModal,
    setShowDeleteConfirmModal,
    isDeletingDuplicates,
    setIsDeletingDuplicates,
    exportNotification,
    closeExportNotification,
    setExportNotification,
    pageSize,
    flippedCards,
    toggleCardFlip,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    currentPage,
    setCurrentPage,
    totalRecords,
    totalPages,
    hasMore,
    observerTarget,
    fetchEnumeratorStats,
    fetchRecords,
    fetchAnalystCampaignData,
    fetchAnalystStats,
    exportAllEnumeratorsSubmissions,
    handleEnumeratorClick,
    closeDetailModal,
    handleValidate,
    handleDetectDuplicates,
    handleLogout,
  };
}
