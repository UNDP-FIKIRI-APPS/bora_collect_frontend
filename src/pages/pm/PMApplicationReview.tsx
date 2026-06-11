import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import enhancedApiService from '../../services/enhancedApiService';
import { devLogger } from '../../utils/logger';


interface Application {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  appliedAt: string;
  reviewedAt?: string;
  reviewComments?: string;
  motivation?: string;
  experience?: string;
  availability?: string;
  user: {
    id: string;
    name: string;
    email: string;
    contact?: string;
    province?: string;
    city?: string;
    commune?: string;
    quartier?: string;
  };
  survey: {
    id: string;
    title: string;
    description: string;
    location?: string;
    compensation?: string;
  };
}

interface ApplicationStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

const PMApplicationReview: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [comments, setComments] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
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
    fetchApplications();
    fetchApplicationStats();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const data = await enhancedApiService.get<any[]>('/surveys/pm-applications', {
        skipCache: true,
        skipToast: true,
      });
      setApplications(data);
    } catch (error) {
      devLogger.log('❌ Erreur de connexion au serveur:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicationStats = async () => {
    try {
      const data = await enhancedApiService.get<any>('/surveys/pm-application-stats', { skipCache: true });
      setStats(data);
    } catch (error) {
      // Erreur silencieuse pour les stats
    }
  };

  const handleReview = async (applicationId: string, action: 'approve' | 'reject') => {
    setReviewing(applicationId);
    try {
      await enhancedApiService.post(`/surveys/applications/${applicationId}/pm-review`, {
        action: action === 'approve' ? 'APPROVE' : 'REJECT',
        comments: comments.trim() || undefined,
      });

      const actionText = action === 'approve' ? 'approuvée' : 'rejetée';
      toast.success(`Candidature ${actionText} avec succès !`);
      await fetchApplications();
      await fetchApplicationStats();

      if (action === 'approve') {
        window.dispatchEvent(new CustomEvent('enumeratorApproved', {
          detail: { applicationId, userId: selectedApplication?.user.id },
        }));
      }

      setShowModal(false);
      setSelectedApplication(null);
      setComments('');
    } catch (error: any) {
      toast.error(error?.message || 'Erreur de connexion au serveur');
    } finally {
      setReviewing(null);
    }
  };

  const openReviewModal = (application: Application, actionType: 'approve' | 'reject') => {
    setSelectedApplication(application);
    setAction(actionType);
    setComments('');
    setShowModal(true);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'En attente';
      case 'APPROVED': return 'Approuvée';
      case 'REJECTED': return 'Rejetée';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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

  // Filtrer les candidatures selon le terme de recherche
  const filteredApplications = applications.filter((application) => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      application.user.name.toLowerCase().includes(searchLower) ||
      application.user.email.toLowerCase().includes(searchLower) ||
      application.user.contact?.toLowerCase().includes(searchLower) ||
      application.survey.title.toLowerCase().includes(searchLower) ||
      application.survey.description.toLowerCase().includes(searchLower) ||
      application.motivation?.toLowerCase().includes(searchLower) ||
      application.experience?.toLowerCase().includes(searchLower) ||
      application.availability?.toLowerCase().includes(searchLower) ||
      getStatusLabel(application.status).toLowerCase().includes(searchLower) ||
      (application.user.province && application.user.province.toLowerCase().includes(searchLower)) ||
      (application.user.city && application.user.city.toLowerCase().includes(searchLower))
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des candidatures...</p>
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
              Validation des Candidatures
            </h1>
          </div>
          <p className="text-gray-600">
            Gérez les candidatures pour vos enquêtes
          </p>
        </div>

        {/* Compteur unique avec effet de retournement */}
        {stats && (
          <div className="mb-8">
            <div className="max-w-md mx-auto">
              <div 
                className={`flip-card cursor-pointer hover:scale-105 transition-transform duration-200 ${flippedCards['candidatures'] ? 'flipped' : ''}`}
                onClick={() => toggleCardFlip('candidatures')}
              >
                <div className="flip-card-inner">
                  {/* Face avant */}
                  <div className="flip-card-front">
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto mb-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="text-lg font-semibold mb-2">Total Candidatures</h3>
                      <p className="text-3xl font-bold animate-bounce">{stats.total}</p>
                      <p className="text-sm opacity-90 mt-2">Cliquez pour voir les détails</p>
                    </div>
                  </div>
                  
                  {/* Face arrière */}
                  <div className="flip-card-back">
                    <div className="w-full">
                      <h3 className="text-lg font-semibold mb-4">Détails des Candidatures</h3>
                      <div className="space-y-3">
                        {/* En attente */}
                        <div className="flex items-center justify-between bg-white/20 rounded-lg p-3">
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-yellow-200 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-medium">En attente</span>
                          </div>
                          <span className="text-lg font-bold animate-pulse">{stats.pending}</span>
                        </div>
                        
                        {/* Approuvées */}
                        <div className="flex items-center justify-between bg-white/20 rounded-lg p-3">
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-green-200 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm font-medium">Approuvées</span>
                          </div>
                          <span className="text-lg font-bold animate-pulse">{stats.approved}</span>
                        </div>
                        
                        {/* Rejetées */}
                        <div className="flex items-center justify-between bg-white/20 rounded-lg p-3">
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-red-200 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span className="text-sm font-medium">Rejetées</span>
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

        {/* Liste des candidatures */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Candidatures ({filteredApplications.length} / {applications.length})
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
                placeholder="Rechercher par nom, email, enquête, statut, localisation..."
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

          {applications.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune candidature</h3>
              <p className="mt-1 text-sm text-gray-500">
                Aucune candidature reçue pour vos enquêtes.
              </p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune candidature trouvée</h3>
              <p className="mt-1 text-sm text-gray-500">
                Aucune candidature ne correspond à votre recherche "{searchTerm}".
              </p>
            </div>
          ) : (
            <div className="w-full">
              <table className="w-full divide-y divide-gray-200 table-auto">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Candidat
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Enquête
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Motivation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expérience
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Disponibilité
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date de candidature
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredApplications.map((application) => (
                    <tr key={application.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{application.user.name}</div>
                          <div className="text-sm text-gray-500">{application.user.email}</div>
                          {application.user.province && (
                            <div className="text-xs text-gray-400">
                              {application.user.province} - {application.user.city}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{application.survey.title}</div>
                          <div className="text-sm text-gray-500">
                            {application.survey.description.substring(0, 80)}
                            {application.survey.description.length > 80 && '...'}
                          </div>
                          {application.survey.compensation && (
                            <div className="text-xs text-green-600 font-medium">
                              {application.survey.compensation}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                        {application.user.contact || 'Non renseigné'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                        <div className="break-words" title={application.motivation || 'Non renseigné'}>
                          {application.motivation || 'Non renseigné'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                        <div className="break-words" title={application.experience || 'Non renseigné'}>
                          {application.experience || 'Non renseigné'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                        <div className="break-words" title={application.availability || 'Non renseigné'}>
                          {application.availability || 'Non renseigné'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(application.status)}`}>
                          {getStatusLabel(application.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                        {formatDate(application.appliedAt)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                        {application.status === 'PENDING' ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => openReviewModal(application, 'approve')}
                              className="text-green-600 hover:text-green-900 bg-green-100 hover:bg-green-200 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                            >
                              Approuver
                            </button>
                            <button
                              onClick={() => openReviewModal(application, 'reject')}
                              className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                            >
                              Rejeter
                            </button>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">
                            {application.reviewedAt && (
                              <div>Révisée le {formatDate(application.reviewedAt)}</div>
                            )}
                            {application.reviewComments && (
                              <div className="text-xs mt-1 max-w-md break-words" title={application.reviewComments}>
                                {application.reviewComments}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de validation */}
      {showModal && selectedApplication && (
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
                {action === 'approve' ? 'Approuver' : 'Rejeter'} la candidature
              </h3>
              <div className="mt-2 px-7">
                <p className="text-sm text-gray-500 text-center">
                  {action === 'approve' 
                    ? `Êtes-vous sûr de vouloir approuver la candidature de ${selectedApplication.user.name} ?`
                    : `Êtes-vous sûr de vouloir rejeter la candidature de ${selectedApplication.user.name} ?`
                  }
                </p>
                <p className="text-xs text-blue-600 text-center mt-2">
                  Enquête: {selectedApplication.survey.title}
                </p>
              </div>
              
              {/* Détails de la candidature */}
              <div className="mt-4 px-7">
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Détails de la candidature</h4>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-600">Motivation:</label>
                    <p className="text-sm text-gray-800 mt-1">
                      {selectedApplication.motivation || 'Non renseigné'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-600">Expérience:</label>
                    <p className="text-sm text-gray-800 mt-1">
                      {selectedApplication.experience || 'Non renseigné'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-600">Disponibilité:</label>
                    <p className="text-sm text-gray-800 mt-1">
                      {selectedApplication.availability || 'Non renseigné'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-600">Contact:</label>
                    <p className="text-sm text-gray-800 mt-1">
                      {selectedApplication.user.contact || 'Non renseigné'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-600">Localisation:</label>
                    <p className="text-sm text-gray-800 mt-1">
                      {selectedApplication.user.province && selectedApplication.user.city 
                        ? `${selectedApplication.user.province} - ${selectedApplication.user.city}`
                        : 'Non renseigné'
                      }
                    </p>
                  </div>
                </div>
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
                  onClick={() => handleReview(selectedApplication.id, action)}
                  disabled={reviewing === selectedApplication.id}
                  className={`px-4 py-2 rounded-md text-white transition-colors ${
                    action === 'approve'
                      ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400'
                      : 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
                  }`}
                >
                  {reviewing === selectedApplication.id ? 'Traitement...' : action === 'approve' ? 'Approuver' : 'Rejeter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PMApplicationReview;
