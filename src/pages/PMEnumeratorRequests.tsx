import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { environment } from '../config/environment';
import enhancedApiService from '../services/enhancedApiService';
import Pagination from '../components/Pagination';
import { devLogger } from '../utils/logger';


interface EnumeratorRequest {
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
  approvalComments?: string;
}

interface PMStats {
  pending: number;
  active: number;
  rejected: number;
  total: number;
}

const PMEnumeratorRequests: React.FC = () => {
  const [enumeratorRequests, setEnumeratorRequests] = useState<EnumeratorRequest[]>([]);
  const [stats, setStats] = useState<PMStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<EnumeratorRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [comments, setComments] = useState('');
  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);

  const apiBaseUrl = environment.apiBaseUrl;

  useEffect(() => {
    // Vérifier que l'utilisateur est connecté et est Project Manager
    const user = localStorage.getItem('user');
    
    if (!user) {
      toast.error('Vous devez être connecté pour accéder à cette page');
      return;
    }

    try {
      const userData = JSON.parse(user);
      if (userData.role !== 'PROJECT_MANAGER') {
        devLogger.log('🚫 User role is not PROJECT_MANAGER:', userData.role);
        return;
      }
    } catch (error) {
      devLogger.log('❌ Error parsing user data:', error);
      return;
    }

    // Charger les données
    const loadData = async () => {
      try {
        devLogger.log('🔄 Loading data for PMEnumeratorRequests...');
        await fetchEnumeratorRequests();
        await fetchPMStats();
        devLogger.log('✅ Data loading completed');
      } catch (error) {
        console.error('❌ Error in loadData:', error);
        toast.error('Erreur lors du chargement des données');
      }
    };
    loadData();
  }, []);

  const fetchEnumeratorRequests = async () => {
    try {
      devLogger.log('🔍 Fetching enumerator requests from:', `${apiBaseUrl}/users/pm-enumerator-requests`);
      
      // Utilisation du nouveau service API
      const requests = await enhancedApiService.get<any[]>('/users/pm-enumerator-requests', {
        skipCache: true, // Forcer le refresh
      });
      
      devLogger.log('✅ Enumerator requests loaded:', requests.length);
      setEnumeratorRequests(requests);
    } catch (error) {
      devLogger.log('❌ Network error:', error);
      // Ne pas afficher de toast pour éviter les notifications répétées
    } finally {
      setLoading(false);
    }
  };

  const fetchPMStats = async () => {
    try {
      devLogger.log('🔍 Fetching PM stats from:', `${apiBaseUrl}/users/pm-approval-stats`);
      
      // Utilisation du nouveau service API
      const statsData = await enhancedApiService.get<PMStats>('/users/pm-approval-stats', {
        skipCache: true, // Forcer le refresh
      });
      
      devLogger.log('✅ PM stats loaded:', statsData);
      setStats(statsData);
    } catch (error) {
      devLogger.log('❌ Error loading PM stats:', error);
      // Ne pas afficher de toast pour éviter les notifications répétées
    }
  };

  const handleApproval = async (requestId: string, action: 'approve' | 'reject') => {
    setApproving(requestId);

    try {
      // Utilisation du nouveau service API
      await enhancedApiService.post(`/users/${requestId}/${action}`, {
        comments: comments
      });

      toast.success(`Enquêteur ${action === 'approve' ? 'approuvé' : 'rejeté'} avec succès`);
      setShowModal(false);
      setComments('');
      await fetchEnumeratorRequests();
      await fetchPMStats();
    } catch (error) {
      console.error('Erreur lors de l\'approbation:', error);
      toast.error('Erreur de connexion au serveur');
    } finally {
      setApproving(null);
    }
  };

  const openModal = (request: EnumeratorRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setAction(action);
    setComments('');
    setShowModal(true);
  };

  // Calculer les demandes paginées
  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return enumeratorRequests.slice(startIndex, endIndex);
  }, [enumeratorRequests, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(enumeratorRequests.length / pageSize));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Demandes d'Enquêteurs</h2>
        <button
          onClick={() => {
            fetchEnumeratorRequests();
            fetchPMStats();
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Actualiser
        </button>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-yellow-100 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-yellow-800">En attente</h3>
            <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
          </div>
          <div className="bg-green-100 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-green-800">Approuvés</h3>
            <p className="text-2xl font-bold text-green-900">{stats.active}</p>
          </div>
          <div className="bg-red-100 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-red-800">Rejetés</h3>
            <p className="text-2xl font-bold text-red-900">{stats.rejected}</p>
          </div>
          <div className="bg-blue-100 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800">Total</h3>
            <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
          </div>
        </div>
      )}

      {/* Liste des demandes */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Demandes d'Enquêteurs ({enumeratorRequests.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {enumeratorRequests.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              Aucune demande d'enquêteur en attente
            </div>
          ) : (
            paginatedRequests.map((request) => (
              <div key={request.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {request.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {request.name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {request.email}
                        </p>
                        <p className="text-sm text-gray-500">
                          {request.contact} • {request.province}, {request.city}
                        </p>
                        <p className="text-xs text-gray-400">
                          Demande du {new Date(request.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openModal(request, 'approve')}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                    >
                      Approuver
                    </button>
                    <button
                      onClick={() => openModal(request, 'reject')}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                    >
                      Rejeter
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Pagination - affichée même avec 1 page */}
        {enumeratorRequests.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages || 1}
              totalItems={enumeratorRequests.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              loading={loading}
            />
          </div>
        )}
      </div>

      {/* Modal de confirmation */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {action === 'approve' ? 'Approuver' : 'Rejeter'} l'enquêteur
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {selectedRequest.name} ({selectedRequest.email})
              </p>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={`Commentaires pour l'${action === 'approve' ? 'approbation' : 'rejet'}...`}
                className="w-full p-3 border border-gray-300 rounded-md mb-4"
                rows={3}
              />
              <div className="flex space-x-3">
                <button
                  onClick={() => handleApproval(selectedRequest.id, action)}
                  disabled={approving === selectedRequest.id}
                  className={`flex-1 px-4 py-2 rounded-md text-white ${
                    action === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  } disabled:opacity-50`}
                >
                  {approving === selectedRequest.id ? 'Traitement...' : 
                   action === 'approve' ? 'Approuver' : 'Rejeter'}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PMEnumeratorRequests;
