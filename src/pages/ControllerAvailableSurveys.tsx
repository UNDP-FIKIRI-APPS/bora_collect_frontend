import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import enhancedApiService from '../services/enhancedApiService';

interface Survey {
  id: string;
  title: string;
  description: string;
  requirements?: string;
  location?: string;
  duration?: string;
  compensation?: string;
  maxApplicants?: number;
  status: string;
  publishedAt: string;
  applications: any[];
}


interface Application {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
  motivation?: string;
  experience?: string;
  availability?: string;
  appliedAt: string;
  survey: {
    id: string;
    title: string;
    description: string;
    status: string;
    publishedAt: string;
  };
}

const ControllerAvailableSurveys: React.FC = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [applicationData, setApplicationData] = useState({
    motivation: '',
    experience: '',
    availability: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [surveysData, applicationsData] = await Promise.all([
        enhancedApiService.get<Survey[]>('/surveys/published', { skipCache: true }),
        enhancedApiService.get<Application[]>('/surveys/my-applications', { skipCache: true }),
      ]);
      setSurveys(surveysData);
      setMyApplications(applicationsData);
    } catch (error: any) {
      toast.error(error?.message || 'Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const handleApplication = async () => {
    if (!selectedSurvey) return;

    try {
      await enhancedApiService.post(`/surveys/${selectedSurvey.id}/apply`, applicationData);
      toast.success('Candidature envoyée avec succès !');
      setShowApplicationModal(false);
      setSelectedSurvey(null);
      setApplicationData({ motivation: '', experience: '', availability: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error?.message || 'Erreur de connexion au serveur');
    }
  };

  const openApplicationModal = (survey: Survey) => {
    setSelectedSurvey(survey);
    setApplicationData({ motivation: '', experience: '', availability: '' });
    setShowApplicationModal(true);
  };

  const hasAppliedToSurvey = (surveyId: string) => {
    // Vérifier si l'utilisateur a une candidature active (PENDING ou APPROVED)
    return myApplications.some(app => 
      app.survey.id === surveyId && 
      (app.status === 'PENDING' || app.status === 'APPROVED')
    );
  };

  const canReapplyToSurvey = (surveyId: string) => {
    // Vérifier si l'utilisateur peut repostuler (candidature REJECTED ou WITHDRAWN)
    const application = myApplications.find(app => app.survey.id === surveyId);
    return application && (application.status === 'REJECTED' || application.status === 'WITHDRAWN');
  };

  const getApplicationStatus = (surveyId: string) => {
    const application = myApplications.find(app => app.survey.id === surveyId);
    return application ? application.status : null;
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
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des enquêtes...</p>
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
            Enquêtes disponibles
          </h1>
          <p className="text-gray-600">
            Consultez et postulez aux enquêtes publiées par l'administration
          </p>
        </div>

        {/* Mes candidatures */}
        {myApplications.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Mes candidatures ({myApplications.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Enquête
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date de candidature
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {myApplications.map((application) => (
                    <tr key={application.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{application.survey.title}</div>
                          <div className="text-sm text-gray-500">{application.survey.description.substring(0, 100)}...</div>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Liste des enquêtes disponibles */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Enquêtes disponibles ({surveys.length})
            </h2>
          </div>

          {surveys.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune enquête disponible</h3>
              <p className="mt-1 text-sm text-gray-500">
                Aucune enquête n'est actuellement publiée.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {surveys.map((survey) => {
                const hasApplied = hasAppliedToSurvey(survey.id);
                const applicationStatus = getApplicationStatus(survey.id);
                const isFull = survey.maxApplicants && survey.maxApplicants > 0 && survey.applications.length >= survey.maxApplicants;

                return (
                  <div key={survey.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{survey.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">{survey.description}</p>
                      
                      {survey.requirements && (
                        <div className="mb-2">
                          <span className="text-xs font-medium text-gray-500">Exigences:</span>
                          <p className="text-xs text-gray-600">{survey.requirements}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        {survey.location && (
                          <div className="flex items-center gap-1">
                            <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="font-medium">Localisation:</span> {survey.location}
                          </div>
                        )}
                        {survey.duration && (
                          <div className="flex items-center gap-1">
                            <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-medium">Durée:</span> {survey.duration}
                          </div>
                        )}
                        {survey.compensation && (
                          <div className="flex items-center gap-1">
                            <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                            <span className="font-medium">Compensation:</span> {survey.compensation}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span className="font-medium">Candidats:</span> {survey.maxApplicants ? `${survey.applications.length}/${survey.maxApplicants}` : survey.applications.length}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      {hasApplied ? (
                        <div className="text-center">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(applicationStatus || 'PENDING')}`}>
                            {getStatusLabel(applicationStatus || 'PENDING')}
                          </span>
                        </div>
                      ) : canReapplyToSurvey(survey.id) ? (
                        <button
                          onClick={() => openApplicationModal(survey)}
                          className="w-full bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors text-sm font-medium"
                        >
                          Repostuler
                        </button>
                      ) : isFull ? (
                        <div className="text-center">
                          <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Complet
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => openApplicationModal(survey)}
                          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          Postuler
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Modal de candidature */}
      {showApplicationModal && selectedSurvey && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-blue-100 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4 text-center">
                Postuler à l'enquête
              </h3>
              <div className="mt-2 px-7">
                <p className="text-sm text-gray-500 text-center mb-4">
                  {selectedSurvey.title}
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivation
                  </label>
                  <textarea
                    value={applicationData.motivation}
                    onChange={(e) => setApplicationData({...applicationData, motivation: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Pourquoi souhaitez-vous participer à cette enquête ?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expérience
                  </label>
                  <textarea
                    value={applicationData.experience}
                    onChange={(e) => setApplicationData({...applicationData, experience: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Décrivez votre expérience pertinente..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Disponibilité
                  </label>
                  <textarea
                    value={applicationData.availability}
                    onChange={(e) => setApplicationData({...applicationData, availability: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                    placeholder="Quand êtes-vous disponible ?"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowApplicationModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleApplication}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Envoyer la candidature
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControllerAvailableSurveys; 
