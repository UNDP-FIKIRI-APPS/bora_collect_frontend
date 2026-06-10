import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { environment } from '../../config/environment';
import enhancedApiService from '../../services/enhancedApiService';
import Pagination from '../../components/Pagination';

interface PendingUser {
  id: string;
  name: string;
  email: string;
  role: string;
  gender: string;
  contact: string;
  province?: string;
  city?: string;
  commune?: string;
  quartier?: string;
  campaign?: {
    id: string;
    title: string;
  };
  surveyApplications?: Array<{
    id: string;
    status: string;
    appliedAt: string;
    survey: {
      id: string;
      title: string;
    };
  }>;
  createdAt: string;
  approvalComments?: string;
}

interface ApprovalStats {
  pending: number;
  active: number;
  rejected: number;
  total: number;
}

const PMApprovalRequests: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [allUsers, setAllUsers] = useState<PendingUser[]>([]); // Toutes les demandes
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [comments, setComments] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  
  // États pour l'effet de retournement
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  
  // Styles CSS pour les animations de retournement
  const flipCardStyles = `
    .flip-card {
      background-color: transparent;
      width: 100%;
      height: 200px;
      perspective: 1000px;
    }
    
    .flip-card-inner {
      position: relative;
      width: 100%;
      height: 100%;
      text-align: center;
      transition: transform 0.6s;
      transform-style: preserve-3d;
    }
    
    .flip-card.flipped .flip-card-inner {
      transform: rotateY(180deg);
    }
    
    .flip-card-front, .flip-card-back {
      position: absolute;
      width: 100%;
      height: 100%;
      backface-visibility: hidden;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 1.5rem;
    }
    
    .flip-card-front {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
    }
    
    .flip-card-back {
      background: linear-gradient(135deg, #10b981 0%, #047857 100%);
      color: white;
      transform: rotateY(180deg);
    }
  `;
  
  // Fonction pour basculer l'état de retournement
  const toggleCardFlip = (cardId: string) => {
    setFlippedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  useEffect(() => {
    fetchPendingApprovals(statusFilter === 'all' ? undefined : statusFilter);
    fetchApprovalStats();
  }, [statusFilter]);

  const fetchPendingApprovals = async (status?: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Vous devez être connecté pour accéder à cette page');
        setLoading(false);
        return;
      }

      // Utilisation du nouveau service API
      const allData = await enhancedApiService.get<PendingUser[]>('/users/pm-pending-approvals', {
        skipCache: true, // Forcer le refresh
      });
      
      setAllUsers(allData);
      
      // Filtrer selon le statut sélectionné
      if (status && status !== 'all') {
        const filtered = allData.filter((user: PendingUser) => 
          user.surveyApplications?.some((app: any) => app.status === status)
        );
        setPendingUsers(filtered);
      } else {
        setPendingUsers(allData);
      }
    } catch (error) {
      console.log('❌ Erreur de connexion au serveur:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovalStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      // Utilisation du nouveau service API
      const data = await enhancedApiService.get<ApprovalStats>('/users/pm-approval-stats', {
        skipCache: true, // Forcer le refresh
      });
      
      setStats(data);
    } catch (error) {
      // Erreur silencieuse pour les stats
    }
  };

  const handleApproval = async (user: PendingUser, action: 'approve' | 'reject') => {
    const applicationId = user.surveyApplications?.[0]?.id;
    if (!applicationId) {
      toast.error('Aucune candidature en attente trouvée pour cet utilisateur');
      return;
    }

    setApproving(user.id);
    try {
      await enhancedApiService.post(`/surveys/applications/${applicationId}/pm-review`, {
        action: action === 'approve' ? 'APPROVE' : 'REJECT',
        comments: comments.trim() || undefined,
      });
      
      const actionText = action === 'approve' ? 'approuvé' : 'rejeté';
      toast.success(`Utilisateur ${actionText} avec succès !`);
      
      // Mettre à jour les listes
      await fetchPendingApprovals();
      await fetchApprovalStats();
      
      // Déclencher un événement pour mettre à jour la page enquêteur si c'est une approbation
      if (action === 'approve') {
        window.dispatchEvent(new CustomEvent('enumeratorApproved', {
          detail: { userId: user.id },
        }));
      }
      
      // Fermer le modal
      setShowModal(false);
      setSelectedUser(null);
      setComments('');
    } catch (error: any) {
      toast.error(error?.message || 'Erreur de connexion au serveur');
    } finally {
      setApproving(null);
    }
  };

  const openApprovalModal = (user: PendingUser, actionType: 'approve' | 'reject') => {
    setSelectedUser(user);
    setAction(actionType);
    setComments('');
    setShowModal(true);
  };

  const getGenderLabel = (gender: string) => {
    switch (gender) {
      case 'MALE': return 'Masculin';
      case 'FEMALE': return 'Féminin';
      case 'OTHER': return 'Autre';
      default: return gender;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Administrateur';
      case 'CONTROLLER': return 'Enquêteur';
      case 'ANALYST': return 'Analyste';
      default: return role;
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

  // Filtrer les utilisateurs selon le terme de recherche
  const filteredUsers = useMemo(() => pendingUsers.filter((user) => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.contact?.toLowerCase().includes(searchLower) ||
      user.province?.toLowerCase().includes(searchLower) ||
      user.city?.toLowerCase().includes(searchLower) ||
      user.commune?.toLowerCase().includes(searchLower) ||
      user.quartier?.toLowerCase().includes(searchLower) ||
      user.campaign?.title.toLowerCase().includes(searchLower) ||
      user.surveyApplications?.some((app: any) => 
        app.survey.title.toLowerCase().includes(searchLower)
      ) ||
      getRoleLabel(user.role).toLowerCase().includes(searchLower) ||
      getGenderLabel(user.gender).toLowerCase().includes(searchLower)
    );
  }), [pendingUsers, searchTerm]);

  // Calculer les utilisateurs paginés
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));

  // Réinitialiser à la page 1 quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des demandes d'approbation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-full mx-auto">
        {/* Styles CSS pour les animations */}
        <style dangerouslySetInnerHTML={{ __html: flipCardStyles }} />
          
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 hover:shadow-lg active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Retour
              </button>
            )}
            <h1 className="text-3xl font-bold text-gray-900">
              Demandes d'inscription - Ma Campagne
            </h1>
          </div>
          <p className="text-gray-600">
            Gérez les demandes d'inscription pour votre campagne
          </p>
        </div>

        {/* Compteur unique avec effet de retournement */}
        {stats && (
          <div className="mb-8">
            <div className="max-w-md mx-auto">
            <div 
              className={`flip-card cursor-pointer hover:scale-105 transition-transform duration-200 ${flippedCards['inscriptions'] ? 'flipped' : ''}`}
              onClick={() => toggleCardFlip('inscriptions')}
            >
                <div className="flip-card-inner">
                  {/* Face avant */}
                  <div className="flip-card-front">
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto mb-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <h3 className="text-lg font-semibold mb-2">Total Inscriptions</h3>
                      <p className="text-3xl font-bold animate-bounce">{stats.total}</p>
                      <p className="text-sm opacity-90 mt-2">Cliquez pour voir les détails</p>
                    </div>
                  </div>
                  
                  {/* Face arrière */}
                  <div className="flip-card-back">
                    <div className="w-full">
                      <h3 className="text-lg font-semibold mb-4">Détails des Inscriptions</h3>
                      <div className="space-y-3">
                        {/* En attente */}
                        <div className="flex items-center justify-between bg-white/20 rounded-lg p-3">
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-blue-200 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-medium">En attente</span>
                          </div>
                          <span className="text-lg font-bold animate-pulse">{stats.pending}</span>
                        </div>
                        
                        {/* Approuvés */}
                        <div className="flex items-center justify-between bg-white/20 rounded-lg p-3">
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-green-200 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm font-medium">Approuvés</span>
                          </div>
                          <span className="text-lg font-bold animate-pulse">{stats.active}</span>
                        </div>
                        
                        {/* Rejetés */}
                        <div className="flex items-center justify-between bg-white/20 rounded-lg p-3">
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-red-200 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span className="text-sm font-medium">Rejetés</span>
                          </div>
                          <span className="text-lg font-bold animate-pulse">{stats.rejected}</span>
                        </div>
                      </div>
                      <p className="text-xs opacity-75 mt-4 text-center">Cliquez pour revenir</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Liste des demandes */}
        <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              {statusFilter === 'all' ? 'Toutes les demandes' : 
               statusFilter === 'PENDING' ? 'Demandes en attente' :
               statusFilter === 'APPROVED' ? 'Demandes approuvées' :
               'Demandes rejetées'} ({filteredUsers.length} / {pendingUsers.length})
            </h2>
            <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Toutes
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'PENDING' 
                  ? 'bg-yellow-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              En attente
            </button>
            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'APPROVED' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Approuvées
            </button>
            <button
              onClick={() => setStatusFilter('REJECTED')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'REJECTED' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Rejetées
            </button>
          </div>
          </div>
          {/* Barre de recherche */}
          <div className="relative mt-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par nom, email, contact, localisation, campagne..."
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

        {pendingUsers.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune demande en attente</h3>
            <p className="mt-1 text-sm text-gray-500">
              Toutes les demandes d'inscription pour votre campagne ont été traitées.
            </p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune demande trouvée</h3>
            <p className="mt-1 text-sm text-gray-500">
              Aucune demande ne correspond à votre recherche "{searchTerm}".
            </p>
          </div>
        ) : (
          <div className="w-full">
            <table className="w-full divide-y divide-gray-200 table-auto">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilisateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rôle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Localisation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campagne
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date de demande
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => {
                    const applicationStatus = user.surveyApplications?.[0]?.status || 'PENDING';
                    return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.contact || 'Non renseigné'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          {user.province && <div className="text-xs">{user.province}</div>}
                          {user.city && <div className="text-xs">{user.city}</div>}
                          {user.commune && <div className="text-xs">{user.commune}</div>}
                          {user.quartier && <div className="text-xs">{user.quartier}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                        {user.surveyApplications && user.surveyApplications.length > 0 ? (
                          <div className="break-words">
                            {user.surveyApplications.map((app: any, index: number) => (
                              <div key={app.id} className="text-xs">
                                <span className="font-medium text-blue-600">{app.survey.title}</span>
                                {index < (user.surveyApplications?.length || 0) - 1 && <br />}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Aucune campagne</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          applicationStatus === 'APPROVED' 
                            ? 'bg-green-100 text-green-800' 
                            : applicationStatus === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {applicationStatus === 'APPROVED' ? 'Approuvée' : 
                           applicationStatus === 'REJECTED' ? 'Rejetée' : 
                           'En attente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {applicationStatus === 'PENDING' ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => openApprovalModal(user, 'approve')}
                              className="text-green-600 hover:text-green-900 bg-green-100 hover:bg-green-200 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                            >
                              Approuver
                            </button>
                            <button
                              onClick={() => openApprovalModal(user, 'reject')}
                              className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                            >
                              Rejeter
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Aucune action disponible</span>
                        )}
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination - affichée même avec 1 page */}
          {filteredUsers.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages || 1}
                totalItems={filteredUsers.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                loading={loading}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal d'approbation/rejet */}
      {showModal && selectedUser && (
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
                {action === 'approve' ? 'Approuver' : 'Rejeter'} l'utilisateur
              </h3>
              <div className="mt-2 px-7">
                <p className="text-sm text-gray-500 text-center">
                  {action === 'approve' 
                    ? `Êtes-vous sûr de vouloir approuver ${selectedUser.name} pour votre campagne ?`
                    : `Êtes-vous sûr de vouloir rejeter ${selectedUser.name} ?`
                  }
                </p>
                {selectedUser.campaign && (
                  <p className="text-xs text-blue-600 text-center mt-2">
                    Campagne: {selectedUser.campaign.title}
                  </p>
                )}
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
                  onClick={() => selectedUser && handleApproval(selectedUser, action)}
                  disabled={approving === selectedUser.id}
                  className={`px-4 py-2 rounded-md text-white transition-colors ${
                    action === 'approve'
                      ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400'
                      : 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
                  }`}
                >
                  {approving === selectedUser.id ? 'Traitement...' : action === 'approve' ? 'Approuver' : 'Rejeter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PMApprovalRequests;
