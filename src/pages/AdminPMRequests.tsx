import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import enhancedApiService from '../services/enhancedApiService';
import { devLogger } from '../utils/logger';


interface PendingProjectManager {
  id: string;
  name: string;
  email: string;
  role: string;
  gender?: string;
  contact?: string;
  province?: string;
  city?: string;
  commune?: string;
  quartier?: string;
  createdAt: string;
  whatsapp?: string;
  // Champs spécifiques aux Project Managers
  organization?: string;
  campaignDescription?: string;
  targetProvinces?: string[];
  campaignDuration?: string;
  selectedODD?: number;
  numberOfEnumerators?: number;
}

interface ApprovalStats {
  pending: number;
  active: number;
  rejected: number;
  total: number;
}

interface AdminPMRequestsProps {
  onBack?: () => void;
}

const AdminPMRequests: React.FC<AdminPMRequestsProps> = ({ onBack }) => {
  const [pendingPMs, setPendingPMs] = useState<PendingProjectManager[]>([]);
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [flippedCards, setFlippedCards] = useState<{ [key: string]: boolean }>({});
  const [approving, setApproving] = useState<string | null>(null);
  const [selectedPM, setSelectedPM] = useState<PendingProjectManager | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [comments, setComments] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Charger les données directement - le backend gérera l'autorisation
    const loadData = async () => {
      try {
        // Vérifier que le token existe
        devLogger.log('🔄 Loading data for AdminPMRequests...');
        await fetchPendingApprovals();
        await fetchApprovalStats();
        devLogger.log('✅ Data loading completed');
      } catch (error) {
        console.error('❌ Error in loadData:', error);
        toast.error('Erreur lors du chargement des données');
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      const pendingPMs = await enhancedApiService.get<any[]>('/users/pending-approvals', {
        skipCache: true,
      });
      devLogger.log('✅ Pending approvals loaded:', pendingPMs.length);
      setPendingPMs(pendingPMs);
    } catch (error: any) {
      console.error('❌ Network error:', error);
      toast.error(error?.message || 'Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovalStats = async () => {
    try {
      const statsData = await enhancedApiService.get<any>('/users/approval-stats', { skipCache: true });
      devLogger.log('✅ Approval stats loaded:', statsData);
      setStats(statsData);
    } catch (error) {
      console.error('❌ Error loading approval stats:', error);
    }
  };

  const handleApproval = async (pmId: string, action: 'approve' | 'reject') => {
    setApproving(pmId);
    try {
      await enhancedApiService.post(`/users/${pmId}/approve`, {
        action: action === 'approve' ? 'APPROVE' : 'REJECT',
        comments: comments.trim() || undefined,
      });

      const actionText = action === 'approve' ? 'approuvé' : 'rejeté';
      toast.success(`Project Manager ${actionText} avec succès !`);
      await fetchPendingApprovals();
      await fetchApprovalStats();
      setShowModal(false);
      setSelectedPM(null);
      setComments('');
    } catch (error: any) {
      toast.error(error?.message || 'Erreur de connexion au serveur');
    } finally {
      setApproving(null);
    }
  };

  const openApprovalModal = (pm: PendingProjectManager, actionType: 'approve' | 'reject') => {
    setSelectedPM(pm);
    setAction(actionType);
    setComments('');
    setShowModal(true);
  };

  // Fonction pour gérer le retournement des cartes
  const toggleCardFlip = (cardId: string) => {
    setFlippedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
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

  // Filtrer les PMs selon le terme de recherche
  const filteredPMs = pendingPMs.filter((pm) => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      pm.name?.toLowerCase().includes(searchLower) ||
      pm.email?.toLowerCase().includes(searchLower) ||
      pm.contact?.toLowerCase().includes(searchLower) ||
      pm.whatsapp?.toLowerCase().includes(searchLower) ||
      pm.organization?.toLowerCase().includes(searchLower) ||
      pm.campaignDescription?.toLowerCase().includes(searchLower) ||
      pm.province?.toLowerCase().includes(searchLower) ||
      pm.city?.toLowerCase().includes(searchLower) ||
      pm.commune?.toLowerCase().includes(searchLower) ||
      pm.quartier?.toLowerCase().includes(searchLower) ||
      (pm.targetProvinces && Array.isArray(pm.targetProvinces) && 
       pm.targetProvinces.some(p => p.toLowerCase().includes(searchLower))) ||
      (pm.selectedODD && `odd ${pm.selectedODD}`.includes(searchLower)) ||
      (pm.campaignDuration && pm.campaignDuration.toLowerCase().includes(searchLower))
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des demandes d'approbation des Project Managers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
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
                Demandes d'inscription - Project Managers
              </h1>
              <p className="text-gray-600">
                Gérez les demandes d'inscription des Project Managers en attente d'approbation
              </p>
            </div>
          </div>
        </div>

        {/* Compteur Demandes PM avec effet de retournement - Style PM */}
        {stats && (
          <div className="flex justify-center mb-8">
            <div 
              className="relative w-full max-w-sm h-32 cursor-pointer perspective-1000 hover:scale-105 transition-transform duration-300"
              onClick={() => toggleCardFlip('totalPMRequests')}
            >
              <div className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
                flippedCards.totalPMRequests ? 'rotate-y-180' : ''
              }`}>
                {/* Recto */}
                <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow duration-300">
                  <div className="text-center text-white">
                    <div className="mb-2 hover:scale-110 transition-transform duration-200 relative">
                      <div className="absolute inset-0 bg-white opacity-20 rounded-full blur-sm"></div>
                      <svg className="w-8 h-8 mx-auto relative z-10 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                    </div>
                    <div className="text-sm font-semibold">Total Demandes PM</div>
                    <div className="text-xs opacity-80 mt-1 animate-pulse">Cliquez pour voir</div>
                  </div>
                </div>
                {/* Verso */}
                <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg flex items-center justify-center rotate-y-180">
                  <div className="text-center text-white">
                    <div className="text-3xl font-bold mb-2">
                      <span className="animate-bounce hover:animate-pulse transition-all duration-300 hover:scale-110 hover:text-yellow-200">
                        {stats.total}
                      </span>
                    </div>
                    <div className="text-xs space-y-1">
                      <div>En attente: <span className="animate-bounce font-bold">{stats.pending}</span></div>
                      <div>Approuvés: <span className="animate-bounce font-bold">{stats.active}</span></div>
                      <div>Rejetés: <span className="animate-bounce font-bold">{stats.rejected}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Styles CSS pour les animations 3D */}
        <style>{`
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
        `}</style>

        {/* Liste des demandes */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Project Managers en attente ({filteredPMs.length} / {pendingPMs.length})
              </h2>
            </div>
            {/* Barre de recherche */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par nom, email, contact, organisation, campagne, localisation..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {pendingPMs.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm ? 'Aucun Project Manager trouvé' : 'Aucun Project Manager en attente'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm 
                  ? `Aucun Project Manager ne correspond à votre recherche "${searchTerm}".`
                  : 'Toutes les demandes d\'inscription des Project Managers ont été traitées.'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Informations Personnelles
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organisation & Campagne
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Détails du Projet
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date de demande
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPMs.map((pm) => (
                    <tr key={pm.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-900">{pm.name}</div>
                          <div className="text-sm text-gray-500">{pm.email}</div>
                          {pm.contact && (
                            <div className="text-xs text-gray-600 flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {pm.contact}
                            </div>
                          )}
                          {pm.whatsapp && (
                            <div className="text-xs text-gray-600 flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                              </svg>
                              {pm.whatsapp}
                            </div>
                          )}
                          {pm.province && (
                            <div className="text-xs text-gray-600 flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {pm.province}
                              {pm.city && `, ${pm.city}`}
                              {pm.commune && `, ${pm.commune}`}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {pm.organization && (
                            <div className="text-sm font-medium text-gray-900 flex items-center">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              {pm.organization}
                            </div>
                          )}
                          {pm.campaignDescription && (
                            <div className="text-sm text-gray-700 flex items-center">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              {pm.campaignDescription}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {pm.targetProvinces && pm.targetProvinces.length > 0 && (
                            <div className="text-xs text-gray-600 flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Provinces cibles: {Array.isArray(pm.targetProvinces) ? pm.targetProvinces.join(', ') : pm.targetProvinces}
                            </div>
                          )}
                          {pm.campaignDuration && (
                            <div className="text-xs text-gray-600 flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Durée: {pm.campaignDuration}
                            </div>
                          )}
                          {pm.numberOfEnumerators && (
                            <div className="text-xs text-gray-600 flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                              </svg>
                              Enquêteurs: {pm.numberOfEnumerators}
                            </div>
                          )}
                          {pm.selectedODD && (
                            <div className="text-xs text-gray-600 flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                              ODD: {pm.selectedODD}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(pm.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openApprovalModal(pm, 'approve')}
                            className="text-green-600 hover:text-green-900 bg-green-100 hover:bg-green-200 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                          >
                            Approuver
                          </button>
                          <button
                            onClick={() => openApprovalModal(pm, 'reject')}
                            className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                          >
                            Rejeter
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal d'approbation/rejet */}
      {showModal && selectedPM && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-blue-100 rounded-full">
                {action === 'approve' ? (
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4 text-center">
                {action === 'approve' ? 'Approuver' : 'Rejeter'} le Project Manager
              </h3>
              <div className="mt-2 px-7">
                <p className="text-sm text-gray-500 text-center">
                  {action === 'approve' 
                    ? `Êtes-vous sûr de vouloir approuver ${selectedPM.name} ?`
                    : `Êtes-vous sûr de vouloir rejeter ${selectedPM.name} ?`
                  }
                </p>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commentaires (optionnel)
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder={action === 'approve' 
                    ? "Commentaires sur l'approbation..."
                    : "Raison du rejet..."
                  }
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleApproval(selectedPM.id, action)}
                  disabled={approving === selectedPM.id}
                  className={`px-4 py-2 rounded-md text-white transition-colors ${
                    action === 'approve'
                      ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400'
                      : 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
                  }`}
                >
                  {approving === selectedPM.id ? 'Traitement...' : action === 'approve' ? 'Approuver' : 'Rejeter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPMRequests;
