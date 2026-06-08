import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { environment } from '../config/environment';
import { extractFormEntries } from '../utils/formDataUtils';
import { exportEnquetesToExcel } from '../utils/excelExport';
import { Download } from 'lucide-react';
import SuccessNotification from '../components/SuccessNotification';
import enhancedApiService from '../services/enhancedApiService';
import Pagination from '../components/Pagination';
// Virtualisation - import conditionnel avec fallback
// Note: react-window doit être installé avec: npm install react-window @types/react-window
// @ts-ignore - Module optionnel, peut ne pas être installé
let List: any = null;
if (typeof window !== 'undefined') {
  try {
    // @ts-ignore
    const reactWindow = require('react-window');
    List = reactWindow.FixedSizeList;
  } catch (e) {
    // react-window non installé - fallback sur rendu normal
    // L'application fonctionnera sans virtualisation
  }
}

interface Campaign {
  id: string;
  title: string;
  description: string;
  status: string;
  targetProvince?: string;
  selectedODD?: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  publisher?: {
    id: string;
    name: string;
  };
}

interface CampaignResponse {
  id: string;
  surveyId: string;
  formData: { [key: string]: any };
  status: string;
  analystValidationStatus?: string | null; // Statut de validation par l'analyste
  createdAt: string;
  updatedAt: string;
  authorId: string;
  validatedBy: string | null;
  isSystemForm: boolean;
  author?: {
    id: string;
    name: string;
    email: string;
  } | null;
  survey?: {
    id: string;
    title: string;
    description: string;
  } | null;
  // Pour les soumissions publiques
  submitterName?: string;
  submitterContact?: string;
  source?: 'application' | 'public_link';
}

interface AdminCampaignDataProps {
  onBack?: () => void;
}

const AdminCampaignData: React.FC<AdminCampaignDataProps> = ({ onBack }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [responses, setResponses] = useState<CampaignResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [flippedCards, setFlippedCards] = useState<{ [key: string]: boolean }>({});
  const [selectedResponse, setSelectedResponse] = useState<CampaignResponse | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [enumeratorStats, setEnumeratorStats] = useState<any[]>([]);
  const [enumeratorStatsLoading, setEnumeratorStatsLoading] = useState(false);
  const [selectedEnumeratorId, setSelectedEnumeratorId] = useState<string | null>(null);
  const [enumeratorSubmissions, setEnumeratorSubmissions] = useState<any>(null);
  const [enumeratorSubmissionsLoading, setEnumeratorSubmissionsLoading] = useState(false);
  const [successNotification, setSuccessNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'warning';
  }>({
    show: false,
    message: '',
    type: 'success'
  });
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  
  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50); // 50 réponses par page
  const [totalResponses, setTotalResponses] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Styles CSS optimisés (remplace les animations 3D coûteuses)
  const cardStyles = `
    .stat-card {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
  `;

  // Fonction pour gérer le retournement des cartes
  const toggleCardFlip = (cardId: string) => {
    setFlippedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Debounce pour fetchEnumeratorStats
  const debounceTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const debouncedFetchEnumeratorStats = (campaignId: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      fetchEnumeratorStats(campaignId);
    }, 500); // Attendre 500ms après le dernier appel
  };

  useEffect(() => {
    if (selectedCampaign) {
      setCurrentPage(1); // Réinitialiser à la page 1 quand on change de campagne
      fetchCampaignResponses(selectedCampaign, 1);
      debouncedFetchEnumeratorStats(selectedCampaign);
    }
  }, [selectedCampaign]);
  
  // Nettoyer le timer au démontage
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Fonction pour récupérer les statistiques des enquêteurs par campagne
  const fetchEnumeratorStats = async (campaignId: string) => {
    setEnumeratorStatsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Utilisation du nouveau service API
      const responseData = await enhancedApiService.get<any>(`/records/campaign/${campaignId}/enumerators/stats`, {
        skipCache: true,
      });
      
      // L'API peut retourner un objet avec { data: [...], pagination: {...} } ou directement un tableau
      const statsArray = Array.isArray(responseData) 
        ? responseData 
        : (responseData?.data || []);
      setEnumeratorStats(statsArray);
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
      const token = localStorage.getItem('token');
      if (!token) return;

      // Utilisation du nouveau service API
      const responseData = await enhancedApiService.get<any>(`/records/campaign/${campaignId}/enumerator/${enumeratorId}/submissions`, {
        skipCache: true,
      });
      
      // L'API peut retourner un objet avec { data: [...], pagination: {...} } ou directement un tableau/objet
      const submissionsData = Array.isArray(responseData) 
        ? responseData 
        : (responseData?.data !== undefined ? responseData.data : responseData);
      setEnumeratorSubmissions(submissionsData);
      setSelectedEnumeratorId(enumeratorId);
    } catch (err: any) {
      console.error('Erreur lors de la récupération des soumissions:', err);
      setEnumeratorSubmissions(null);
    } finally {
      setEnumeratorSubmissionsLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Utilisation du nouveau service API
      const responseData = await enhancedApiService.get<any>('/surveys/admin', {
        skipCache: true,
      });
      
      // L'API peut retourner un objet avec { data: [...], pagination: {...} } ou directement un tableau
      const campaignsArray = Array.isArray(responseData) 
        ? responseData 
        : (responseData?.data || []);
      setCampaigns(campaignsArray);
    } catch (error) {
      console.error('Erreur lors du chargement des campagnes:', error);
      toast.error('Erreur lors du chargement des campagnes');
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaignResponses = async (campaignId: string, page: number = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Utilisation du nouveau service API avec pagination
      const responseData = await enhancedApiService.get<any>(
        `/records/campaign/${campaignId}?page=${page}&limit=${pageSize}`,
        {
          skipCache: true,
        }
      );
      
      // L'API peut retourner un objet avec { data: [...], pagination: {...} } ou directement un tableau
      const responsesArray = Array.isArray(responseData) 
        ? responseData 
        : (responseData?.data || []);
      setResponses(responsesArray);
      
      // Mettre à jour la pagination
      if (responseData.pagination) {
        setTotalResponses(responseData.pagination.total || responsesArray.length);
        setTotalPages(responseData.pagination.totalPages || Math.ceil((responseData.pagination.total || responsesArray.length) / pageSize));
        setCurrentPage(responseData.pagination.page || page);
      } else {
        // Fallback si pas de pagination dans la réponse
        setTotalResponses(responsesArray.length);
        setTotalPages(Math.ceil(responsesArray.length / pageSize));
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des réponses:', error);
      toast.error('Erreur lors du chargement des données');
      setResponses([]);
      setTotalResponses(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  // Convertir les réponses au format attendu par exportEnquetesToExcel
  const convertResponsesToEnquetes = (responses: CampaignResponse[]) => {
    return responses.map((response) => {
      // Pour les soumissions publiques, utiliser submitterName si disponible
      const authorName = response.source === 'public_link' 
        ? (response.submitterName || response.author?.name || 'N/A')
        : (response.author?.name || 'N/A');
      
      return {
        ...response,
        authorName,
        formData: response.formData || {}
      };
    });
  };

  // Fonction pour réinitialiser les données d'une campagne
  const resetCampaignData = async () => {
    if (!selectedCampaign) {
      toast.error('Veuillez sélectionner une campagne');
      return;
    }

    setResetting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Vous devez être connecté');
        return;
      }

      const response = await fetch(`${environment.apiBaseUrl}/records/campaign/${selectedCampaign}/reset`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessNotification({
          show: true,
          message: `✅ ${data.message}. ${data.totalDeleted} formulaire(s) supprimé(s).`,
          type: 'success'
        });
        
        // Fermer le modal
        setShowResetModal(false);
        
        // Recharger les données (qui seront maintenant vides)
        fetchCampaignResponses(selectedCampaign);
        fetchEnumeratorStats(selectedCampaign);
        
        // Réinitialiser les états
        setResponses([]);
        setEnumeratorStats([]);
        setEnumeratorSubmissions(null);
        setSelectedEnumeratorId(null);
        
        toast.success('Données de la campagne réinitialisées avec succès');
      } else {
        setSuccessNotification({
          show: true,
          message: `❌ Erreur: ${data.message || 'Impossible de réinitialiser les données'}`,
          type: 'error'
        });
        toast.error(data.message || 'Erreur lors de la réinitialisation');
      }
    } catch (error: any) {
      console.error('Erreur lors de la réinitialisation:', error);
      setSuccessNotification({
        show: true,
        message: '❌ Erreur lors de la réinitialisation des données',
        type: 'error'
      });
      toast.error('Erreur lors de la réinitialisation');
    } finally {
      setResetting(false);
    }
  };

  const exportToCSV = async () => {
    if (!selectedCampaign) {
      toast.warning('Veuillez sélectionner une campagne');
      return;
    }

    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Vous devez être connecté');
        return;
      }

      const response = await fetch(
        `${environment.apiBaseUrl}/records/campaign/${selectedCampaign}/export`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors de l\'export');
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;

      const campaign = campaigns.find((c) => c.id === selectedCampaign);
      const contentDisposition = response.headers.get('Content-Disposition');
      let fileName = `donnees_campagne_${campaign?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'campagne'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) fileName = match[1];
      }

      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      toast.success('Export Excel complet généré avec succès');
    } catch (error: any) {
      console.error('Erreur lors de l\'export:', error);
      toast.error(error.message || 'Erreur lors de l\'export Excel');
    } finally {
      setExporting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'COMPLETED': return 'bg-blue-100 text-blue-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'En cours';
      case 'COMPLETED': return 'Terminée';
      case 'PENDING': return 'En attente';
      default: return status;
    }
  };

  const getAnalystValidationStatusColor = (status: string | null | undefined) => {
    switch (status) {
      case 'VALIDATED': return 'bg-green-100 text-green-800';
      case 'NEEDS_REVIEW': return 'bg-orange-100 text-orange-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case null:
      case undefined:
        return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAnalystValidationStatusLabel = (status: string | null | undefined) => {
    switch (status) {
      case 'VALIDATED': return 'Validé';
      case 'NEEDS_REVIEW': return 'À revoir';
      case 'PENDING': return 'En attente';
      case null:
      case undefined:
        return 'En attente';
      default: return status || 'Non défini';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const renderResponseDetails = (formData: any) => {
    if (!formData) {
      return <p className="text-gray-500">Aucune donnée disponible pour ce formulaire.</p>;
    }

    const entries = extractFormEntries(formData);

    if (!entries.length) {
      return <p className="text-gray-500">Aucune donnée disponible pour ce formulaire.</p>;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {entries.map((entry) => (
          <div key={entry.key} className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm font-medium text-gray-600 mb-1">{entry.label}</div>
            {entry.chips && entry.chips.length ? (
              <div className="flex flex-wrap gap-2">
                {entry.chips.map((chip, idx) => (
                  <span
                    key={`${entry.key}-${idx}`}
                    className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-base text-gray-800 whitespace-pre-wrap break-words">
                {entry.displayValue || 'Non renseigné'}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Fonction pour voir les détails d'une réponse
  const viewResponseDetails = (response: CampaignResponse) => {
    setSelectedResponse(response);
    setShowDetailModal(true);
  };

  // Fonction pour fermer le modal de détails
  const closeDetailModal = () => {
    setSelectedResponse(null);
    setShowDetailModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Styles CSS optimisés */}
      <style dangerouslySetInnerHTML={{ __html: cardStyles }} />
      
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 hover:scale-105 active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="font-semibold">Retour</span>
              </button>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Données des Campagnes
              </h1>
              <p className="text-gray-600">
                Visualisez et exportez les données des répondants par campagne
              </p>
            </div>
          </div>
        </div>

        {/* Sélection de campagne */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Sélectionner une campagne</h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campagne
              </label>
              <select
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">Sélectionnez une campagne</option>
                {campaigns.map(campaign => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.title} - {getStatusLabel(campaign.status)}
                  </option>
                ))}
              </select>
            </div>
            {selectedCampaign && (
              <div className="flex gap-2">
                <button
                  onClick={exportToCSV}
                  disabled={exporting || totalResponses === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors duration-200 hover:scale-105 active:scale-95"
                >
                  {exporting ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Export en cours...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Exporter en Excel</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowResetModal(true)}
                  disabled={resetting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors duration-200 hover:scale-105 active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Réinitialiser</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Statistiques avec cartes animées */}
        {selectedCampaign && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Carte Total Réponses - Optimisée */}
            <div 
              className="stat-card bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 cursor-pointer"
              onClick={() => toggleCardFlip('totalResponses')}
            >
              <div className="text-center text-white">
                {!flippedCards.totalResponses ? (
                  <>
                    <div className="mb-2 relative">
                      <svg className="w-8 h-8 mx-auto drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="text-sm font-semibold">Total Réponses</div>
                    <div className="text-xs opacity-80 mt-1">Cliquez pour voir</div>
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-bold mb-2">
                      {loading ? (
                        <div className="animate-pulse bg-white/20 rounded w-12 h-8 mx-auto"></div>
                      ) : (
                        <span className="transition-all duration-300">
                          {totalResponses}
                        </span>
                      )}
                    </div>
                    <div className="text-xs">
                      <div>Total: {totalResponses} réponses</div>
                      <div className="font-semibold mt-1">
                        {campaigns.find(c => c.id === selectedCampaign)?.title || 'N/A'}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Carte Réponses Valides - Optimisée */}
            <div 
              className="stat-card bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 cursor-pointer"
              onClick={() => toggleCardFlip('validResponses')}
            >
              <div className="text-center text-white">
                {!flippedCards.validResponses ? (
                  <>
                    <div className="mb-2 relative">
                      <svg className="w-8 h-8 mx-auto drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-sm font-semibold">Réponses Valides</div>
                    <div className="text-xs opacity-80 mt-1">Cliquez pour voir</div>
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-bold mb-2">
                      {loading ? (
                        <div className="animate-pulse bg-white/20 rounded w-12 h-8 mx-auto"></div>
                      ) : (
                        <span className="transition-all duration-300">
                          {responses.filter(r => r.analystValidationStatus === 'VALIDATED').length}
                        </span>
                      )}
                    </div>
                    <div className="text-xs">
                      <div>Statut: Validés</div>
                      <div className="font-semibold mt-1">
                        {totalResponses > 0 ? 
                          `${Math.round((responses.filter(r => r.analystValidationStatus === 'VALIDATED').length / totalResponses) * 100)}%` : 
                          '0%'
                        }
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Carte En Attente - Optimisée */}
            <div 
              className="stat-card bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 cursor-pointer"
              onClick={() => toggleCardFlip('pendingResponses')}
            >
              <div className="text-center text-white">
                {!flippedCards.pendingResponses ? (
                  <>
                    <div className="mb-2 relative">
                      <svg className="w-8 h-8 mx-auto drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-sm font-semibold">En Attente</div>
                    <div className="text-xs opacity-80 mt-1">Cliquez pour voir</div>
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-bold mb-2">
                      {loading ? (
                        <div className="animate-pulse bg-white/20 rounded w-12 h-8 mx-auto"></div>
                      ) : (
                        <span className="transition-all duration-300">
                          {responses.filter(r => r.analystValidationStatus === 'PENDING' || r.analystValidationStatus === null || r.analystValidationStatus === undefined).length}
                        </span>
                      )}
                    </div>
                    <div className="text-xs">
                      <div>Statut: En attente</div>
                      <div className="font-semibold mt-1">
                        {totalResponses > 0 ? 
                          `${Math.round((responses.filter(r => r.analystValidationStatus === 'PENDING' || r.analystValidationStatus === null || r.analystValidationStatus === undefined).length / totalResponses) * 100)}%` : 
                          '0%'
                        }
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pagination - affichée même avec 1 page */}
        {selectedCampaign && totalPages > 0 && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages || 1}
              totalItems={totalResponses}
              pageSize={pageSize}
              onPageChange={(newPage) => {
                setCurrentPage(newPage);
                fetchCampaignResponses(selectedCampaign, newPage);
              }}
              loading={loading}
            />
          </div>
        )}

        {/* Liste des enquêteurs ou des réponses */}
        {selectedCampaign && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                {selectedEnumeratorId ? 'Formulaires de l\'enquêteur' : `Enquêteurs (${enumeratorStats.length})`}
              </h2>
            </div>

            {/* Bouton de retour si un enquêteur est sélectionné */}
            {selectedEnumeratorId && enumeratorSubmissions && (
              <div className="px-6 py-4 border-b border-gray-200">
                <button
                  onClick={() => {
                    setSelectedEnumeratorId(null);
                    setEnumeratorSubmissions(null);
                    if (selectedCampaign) {
                      fetchEnumeratorStats(selectedCampaign);
                    }
                  }}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Retour à la liste des enquêteurs
                </button>
              </div>
            )}

            {/* Si un enquêteur est sélectionné, afficher ses formulaires */}
            {selectedEnumeratorId && enumeratorSubmissions ? (
              <div className="p-6">
                {/* Statistiques de l'enquêteur */}
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg mb-4 sm:mb-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600 mb-2">
                          {enumeratorSubmissions.appSubmissions?.length || 0}
                        </div>
                        <div className="text-blue-800 font-medium">Par application</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600 mb-2">
                          {enumeratorSubmissions.publicSubmissions?.length || 0}
                        </div>
                        <div className="text-green-800 font-medium">Par lien public</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600 mb-2">
                          {enumeratorSubmissions.total || 0}
                        </div>
                        <div className="text-purple-800 font-medium">Total</div>
                      </div>
                    </div>
                    {/* Bouton d'export Excel */}
                    <button
                      onClick={() => {
                        const allSubmissions = [
                          ...(enumeratorSubmissions.appSubmissions || []).map((s: any) => ({
                            ...s,
                            authorName: s.author?.name || 'N/A',
                            source: 'application'
                          })),
                          ...(enumeratorSubmissions.publicSubmissions || []).map((s: any) => ({
                            ...s,
                            authorName: s.author?.name || s.submitterName || 'N/A',
                            source: 'public_link'
                          }))
                        ];
                        const fileName = `formulaires_admin_${enumeratorSubmissions.enumeratorName || 'enqueteur'}_${new Date().toISOString().split('T')[0]}`;
                        const success = exportEnquetesToExcel(allSubmissions, fileName);
                        if (success) {
                          setSuccessNotification({
                            show: true,
                            message: '✅ Export Excel réussi !',
                            type: 'success'
                          });
                        }
                      }}
                      className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold"
                    >
                      <Download className="h-4 w-4" />
                      Exporter en Excel
                    </button>
                  </div>
                </div>

                {/* Liste des formulaires par application - Virtualisée */}
                {enumeratorSubmissions.appSubmissions && enumeratorSubmissions.appSubmissions.length > 0 && (
                  <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
                    <h3 className="text-lg font-semibold mb-4 text-blue-800">Formulaires soumis par application ({enumeratorSubmissions.appSubmissions.length})</h3>
                    {List ? (
                      <div className="h-[400px]">
                        <List
                          height={400}
                          itemCount={enumeratorSubmissions.appSubmissions.length}
                          itemSize={120}
                          width="100%"
                          itemData={enumeratorSubmissions.appSubmissions}
                        >
                          {({ index, style, data }: { index: number; style: React.CSSProperties; data: any[] }) => {
                            const submission = data[index];
                            return (
                              <div style={style} className="px-2">
                                <div
                                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-white"
                                  onClick={() => {
                                    setSelectedResponse(submission);
                                    setShowDetailModal(true);
                                  }}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Application</span>
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      submission.analystValidationStatus === 'VALIDATED' ? 'bg-green-100 text-green-800' :
                                      submission.analystValidationStatus === 'NEEDS_REVIEW' ? 'bg-orange-100 text-orange-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {submission.analystValidationStatus === 'VALIDATED' ? 'Validé' :
                                       submission.analystValidationStatus === 'NEEDS_REVIEW' ? 'À revoir' :
                                       'En attente'}
                                    </span>
                                  </div>
                                  <p className="text-sm font-medium text-gray-900 mt-2">
                                    {submission.formData?.['identification.nomOuCode'] || submission.formData?.household?.nomOuCode || 'N/A'}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(submission.createdAt).toLocaleDateString('fr-FR')}
                                  </p>
                                </div>
                              </div>
                            );
                          }}
                        </List>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {enumeratorSubmissions.appSubmissions.map((submission: any) => (
                          <div
                            key={submission.id}
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => {
                              setSelectedResponse(submission);
                              setShowDetailModal(true);
                            }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Application</span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                submission.analystValidationStatus === 'VALIDATED' ? 'bg-green-100 text-green-800' :
                                submission.analystValidationStatus === 'NEEDS_REVIEW' ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {submission.analystValidationStatus === 'VALIDATED' ? 'Validé' :
                                 submission.analystValidationStatus === 'NEEDS_REVIEW' ? 'À revoir' :
                                 'En attente'}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-gray-900 mt-2">
                              {submission.formData?.['identification.nomOuCode'] || submission.formData?.household?.nomOuCode || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(submission.createdAt).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Liste des formulaires par lien public - Virtualisée */}
                {enumeratorSubmissions.publicSubmissions && enumeratorSubmissions.publicSubmissions.length > 0 && (
                  <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
                    <h3 className="text-lg font-semibold mb-4 text-green-800">Formulaires soumis par lien public ({enumeratorSubmissions.publicSubmissions.length})</h3>
                    {List ? (
                      <div className="h-[400px]">
                        <List
                          height={400}
                          itemCount={enumeratorSubmissions.publicSubmissions.length}
                          itemSize={120}
                          width="100%"
                          itemData={enumeratorSubmissions.publicSubmissions}
                        >
                          {({ index, style, data }: { index: number; style: React.CSSProperties; data: any[] }) => {
                            const submission = data[index];
                            return (
                              <div style={style} className="px-2">
                                <div
                                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-white"
                                  onClick={() => {
                                    setSelectedResponse(submission);
                                    setShowDetailModal(true);
                                  }}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Lien public</span>
                                    {submission.submitterName && (
                                      <span className="text-xs text-gray-600">{submission.submitterName}</span>
                                    )}
                                  </div>
                                  <p className="text-sm font-medium text-gray-900 mt-2">
                                    {submission.formData?.['identification.nomOuCode'] || submission.formData?.household?.nomOuCode || 'N/A'}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(submission.createdAt).toLocaleDateString('fr-FR')}
                                  </p>
                                </div>
                              </div>
                            );
                          }}
                        </List>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {enumeratorSubmissions.publicSubmissions.map((submission: any) => (
                          <div
                            key={submission.id}
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => {
                              setSelectedResponse(submission);
                              setShowDetailModal(true);
                            }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Lien public</span>
                              {submission.submitterName && (
                                <span className="text-xs text-gray-600">{submission.submitterName}</span>
                              )}
                            </div>
                            <p className="text-sm font-medium text-gray-900 mt-2">
                              {submission.formData?.['identification.nomOuCode'] || submission.formData?.household?.nomOuCode || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(submission.createdAt).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {enumeratorSubmissionsLoading && (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-600">Chargement des formulaires...</p>
                  </div>
                )}
              </div>
            ) : (
              /* Liste des enquêteurs avec leurs stats */
              <div className="p-6">
                {enumeratorStatsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Chargement des enquêteurs...</p>
                  </div>
                ) : enumeratorStats.length > 0 ? (
                  // Virtualisation pour les grandes listes d'enquêteurs
                  List ? (
                    <div className="h-[600px]">
                      <List
                        height={600}
                        itemCount={enumeratorStats.length}
                        itemSize={180}
                        width="100%"
                        itemData={enumeratorStats}
                      >
                        {({ index, style, data }: { index: number; style: React.CSSProperties; data: any[] }) => {
                          const enumerator = data[index];
                          return (
                            <div style={style} className="px-2">
                              <div
                                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-white"
                                onClick={() => {
                                  if (selectedCampaign) {
                                    fetchEnumeratorSubmissions(enumerator.id, selectedCampaign);
                                  }
                                }}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                      <span className="text-blue-600 font-bold">
                                        {enumerator.name.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <div>
                                      <p className="font-semibold text-gray-900">{enumerator.name}</p>
                                      <p className="text-xs text-gray-500">{enumerator.email}</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                  <div className="text-center p-2 bg-blue-50 rounded">
                                    <div className="text-lg font-bold text-blue-600">{enumerator.appSubmissionsCount || 0}</div>
                                    <div className="text-xs text-blue-800">Par app</div>
                                  </div>
                                  <div className="text-center p-2 bg-green-50 rounded">
                                    <div className="text-lg font-bold text-green-600">{enumerator.publicLinkSubmissionsCount || 0}</div>
                                    <div className="text-xs text-green-800">Par lien</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }}
                      </List>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {enumeratorStats.map((enumerator: any) => (
                        <div
                          key={enumerator.id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => {
                            if (selectedCampaign) {
                              fetchEnumeratorSubmissions(enumerator.id, selectedCampaign);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-blue-600 font-bold">
                                  {enumerator.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{enumerator.name}</p>
                                <p className="text-xs text-gray-500">{enumerator.email}</p>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            <div className="text-center p-2 bg-blue-50 rounded">
                              <div className="text-lg font-bold text-blue-600">{enumerator.appSubmissionsCount || 0}</div>
                              <div className="text-xs text-blue-800">Par app</div>
                            </div>
                            <div className="text-center p-2 bg-green-50 rounded">
                              <div className="text-lg font-bold text-green-600">{enumerator.publicLinkSubmissionsCount || 0}</div>
                              <div className="text-xs text-green-800">Par lien</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Aucun enquêteur trouvé pour cette campagne
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Ancienne liste des réponses - masquée pour l'instant */}
        {false && selectedCampaign && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Réponses ({responses.length})
              </h2>
            </div>

            {loading ? (
              <div className="px-6 py-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Chargement des données...</p>
              </div>
            ) : responses.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune réponse trouvée</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Cette campagne n'a pas encore de réponses ou les données ne sont pas disponibles.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Enquêteur
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Localisation
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date de soumission
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {responses.map((response) => (
                      <tr key={response.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{response.author?.name || response.authorId || 'N/A'}</div>
                            <div className="text-sm text-gray-500">{response.author?.email || 'N/A'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {response.formData?.['identification.communeQuartier'] || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAnalystValidationStatusColor(response.analystValidationStatus)}`}>
                            {getAnalystValidationStatusLabel(response.analystValidationStatus)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(response.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => viewResponseDetails(response)}
                            className="text-blue-600 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                          >
                            Voir détails
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 🔄 Modal de détails de la réponse - Version structurée identique à l'analyste */}
        {showDetailModal && selectedResponse && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                {/* En-tête du modal */}
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Détails de la réponse - {selectedResponse.author?.name || selectedResponse.authorId || 'N/A'}
                  </h3>
                  <button
                    onClick={closeDetailModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Contenu du modal */}
                <div className="max-h-96 overflow-y-auto">
                  {/* Informations générales */}
                  <div className="mb-6">
                    <h4 className="text-md font-semibold text-gray-800 mb-3 border-b pb-2 flex items-center">
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-bold mr-2">ℹ️</span>
                      Informations générales
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="font-medium text-gray-700">Enquêteur :</span>
                        <div className="mt-1 text-gray-900 font-semibold">
                          {selectedResponse.author?.name || selectedResponse.submitterName || selectedResponse.authorId || 'N/A'}
                        </div>
                        {selectedResponse.author?.email && (
                          <div className="mt-1 text-xs text-gray-600">{selectedResponse.author.email}</div>
                        )}
                        {selectedResponse.source === 'public_link' && selectedResponse.submitterContact && (
                          <div className="mt-1 text-xs text-gray-600">Contact soumetteur : {selectedResponse.submitterContact}</div>
                        )}
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="font-medium text-gray-700">Date et heure de soumission :</span>
                        <div className="mt-1 text-gray-900 font-semibold">
                          {selectedResponse.createdAt ? new Date(selectedResponse.createdAt).toLocaleString('fr-FR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          }) : 'N/A'}
                        </div>
                      </div>
                      {selectedResponse.survey && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <span className="font-medium text-gray-700">Campagne :</span>
                          <div className="mt-1 text-gray-900 font-semibold">{selectedResponse.survey.title}</div>
                          {selectedResponse.survey.description && (
                            <div className="mt-1 text-xs text-gray-600">{selectedResponse.survey.description}</div>
                          )}
                        </div>
                      )}
                      {selectedResponse.source && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <span className="font-medium text-gray-700">Source :</span>
                          <div className="mt-1">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                              selectedResponse.source === 'public_link' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {selectedResponse.source === 'public_link' ? 'Lien public' : 'Application'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-gray-800 mb-3 border-b pb-2 flex items-center">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold mr-2">📋</span>
                      Contenu du formulaire
                    </h4>
                    {renderResponseDetails(selectedResponse.formData)}
                  </div>

                </div>

                {/* Boutons d'action */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                  <button
                    onClick={closeDetailModal}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de confirmation pour réinitialisation */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">Réinitialiser les données</h3>
                  <p className="text-sm text-gray-600 mt-1">Cette action est irréversible</p>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-800 font-medium mb-2">
                  ⚠️ Attention : Cette action va supprimer définitivement :
                </p>
                <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                  <li>Tous les formulaires soumis par application</li>
                  <li>Toutes les soumissions via les liens publics</li>
                  <li>Toutes les statistiques de la campagne</li>
                </ul>
                <p className="text-sm text-red-800 font-semibold mt-3">
                  Les données seront perdues et ne pourront pas être récupérées.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetModal(false)}
                  disabled={resetting}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={resetCampaignData}
                  disabled={resetting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {resetting ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Réinitialisation...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Confirmer la réinitialisation</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification de succès */}
      <SuccessNotification
        show={successNotification.show}
        message={successNotification.message}
        type={successNotification.type}
        onClose={() => setSuccessNotification({ show: false, message: '', type: 'success' })}
      />
    </div>
  );
};

export default AdminCampaignData;
