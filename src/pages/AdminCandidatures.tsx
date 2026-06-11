import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import enhancedApiService from '../services/enhancedApiService';

interface Application {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
  motivation?: string;
  experience?: string;
  availability?: string;
  appliedAt: string;
  reviewedAt?: string;
  adminComments?: string;
  survey: {
    id: string;
    title: string;
    status: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    contact: string;
    role: string;
  };
}

const AdminCandidatures: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewComments, setReviewComments] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const data = await enhancedApiService.get<Application[]>('/surveys/admin/applications', {
        skipCache: true,
      });
      setApplications(data);
    } catch (error: any) {
      toast.error(error?.message || 'Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!selectedApplication) return;

    try {
      await enhancedApiService.post(`/surveys/applications/${selectedApplication.id}/review`, {
        status: reviewStatus,
        comments: reviewComments.trim() || undefined,
      });
      const actionText = reviewStatus === 'APPROVED' ? 'approuvée' : 'rejetée';
      toast.success(`Candidature ${actionText} avec succès !`);
      setShowReviewModal(false);
      setSelectedApplication(null);
      setReviewComments('');
      fetchApplications();
    } catch (error: any) {
      toast.error(error?.message || 'Erreur de connexion au serveur');
    }
  };

  const openReviewModal = (application: Application, status: 'APPROVED' | 'REJECTED') => {
    setSelectedApplication(application);
    setReviewStatus(status);
    setReviewComments('');
    setShowReviewModal(true);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'En attente';
      case 'APPROVED': return 'Approuvée';
      case 'REJECTED': return 'Rejetée';
      case 'WITHDRAWN': return 'Retirée';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'WITHDRAWN': return 'bg-gray-100 text-gray-800';
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
      application.user.name?.toLowerCase().includes(searchLower) ||
      application.user.email?.toLowerCase().includes(searchLower) ||
      application.user.contact?.toLowerCase().includes(searchLower) ||
      application.survey.title?.toLowerCase().includes(searchLower) ||
      application.motivation?.toLowerCase().includes(searchLower) ||
      application.experience?.toLowerCase().includes(searchLower) ||
      application.availability?.toLowerCase().includes(searchLower) ||
      getStatusLabel(application.status).toLowerCase().includes(searchLower)
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
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gestion des candidatures
          </h1>
          <p className="text-gray-600">
            Examinez et gérez les candidatures des enquêteurs aux sondages
          </p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-full">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">En attente</p>
                <p className="text-2xl font-bold text-gray-900">
                  {applications.filter(a => a.status === 'PENDING').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approuvées</p>
                <p className="text-2xl font-bold text-gray-900">
                  {applications.filter(a => a.status === 'APPROVED').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rejetées</p>
                <p className="text-2xl font-bold text-gray-900">
                  {applications.filter(a => a.status === 'REJECTED').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
              </div>
            </div>
          </div>
        </div>

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
                placeholder="Rechercher par nom, email, contact, sondage, statut, motivation..."
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm ? 'Aucune candidature trouvée' : 'Aucune candidature'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm 
                  ? `Aucune candidature ne correspond à votre recherche "${searchTerm}".`
                  : 'Aucun enquêteur n\'a encore postulé aux sondages.'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Candidat
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sondage
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
                          <div className="text-xs text-gray-400">{application.user.contact}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{application.survey.title}</div>
                          <div className="text-xs text-gray-500">Statut: {application.survey.status}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(application.status)}`}>
                          {getStatusLabel(application.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(application.appliedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {application.status === 'PENDING' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => openReviewModal(application, 'APPROVED')}
                              className="text-green-600 hover:text-green-900 bg-green-100 hover:bg-green-200 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                            >
                              Approuver
                            </button>
                            <button
                              onClick={() => openReviewModal(application, 'REJECTED')}
                              className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                            >
                              Rejeter
                            </button>
                          </div>
                        )}
                        {application.status !== 'PENDING' && (
                          <div className="text-sm text-gray-500">
                            {application.adminComments && (
                              <div className="text-xs">
                                <strong>Commentaires:</strong> {application.adminComments}
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

      {/* Modal d'examen de candidature */}
      {showReviewModal && selectedApplication && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-blue-100 rounded-full">
                {reviewStatus === 'APPROVED' ? (
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
                {reviewStatus === 'APPROVED' ? 'Approuver' : 'Rejeter'} la candidature
              </h3>
              <div className="mt-2 px-7">
                <p className="text-sm text-gray-500 text-center">
                  {reviewStatus === 'APPROVED' 
                    ? `Êtes-vous sûr de vouloir approuver ${selectedApplication.user.name} ?`
                    : `Êtes-vous sûr de vouloir rejeter ${selectedApplication.user.name} ?`
                  }
                </p>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commentaires (optionnel)
                </label>
                <textarea
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder={reviewStatus === 'APPROVED' 
                    ? "Commentaires sur l'approbation..."
                    : "Raison du rejet..."
                  }
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleReview}
                  className={`px-4 py-2 rounded-md text-white transition-colors ${
                    reviewStatus === 'APPROVED'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {reviewStatus === 'APPROVED' ? 'Approuver' : 'Rejeter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCandidatures; 
