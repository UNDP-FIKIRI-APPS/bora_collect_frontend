import React, { useState, useEffect, useMemo } from 'react';
import { environment } from '../../config/environment';
import { toast } from 'react-toastify';
import { extractFormEntries, flattenFormDataToObject } from '../../utils/formDataUtils';
import { exportEnquetesToExcel } from '../../utils/excelExport';
import { Download } from 'lucide-react';
import SuccessNotification from '../../components/SuccessNotification';
import Pagination from '../../components/Pagination';
import enhancedApiService from '../../services/enhancedApiService';
import { devLogger } from '../../utils/logger';


// Styles CSS pour les animations de retournement
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

interface ValidatedForm {
  id: string;
  formData: any;
  createdAt: string;
  updatedAt: string;
  status: string;
  analystValidationStatus: string | null; // Statut de validation par l'analyste
  surveyId: string | null;
  authorId: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  survey: {
    id: string;
    title: string;
    description?: string;
  } | null;
  analystValidator?: {
    id: string;
    name: string;
    email: string;
  } | null; // Analyste qui a validé le formulaire
  submitterName?: string; // Pour les soumissions publiques
  submitterContact?: string; // Pour les soumissions publiques
  source?: 'application' | 'public_link'; // Source de la soumission
}

const PMValidatedForms: React.FC = () => {
  const [validatedForms, setValidatedForms] = useState<ValidatedForm[]>([]);
  const [filteredForms, setFilteredForms] = useState<ValidatedForm[]>([]);
  const [selectedForm, setSelectedForm] = useState<ValidatedForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'VALIDATED' | 'NEEDS_REVIEW'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [flippedCards, setFlippedCards] = useState<{ [key: string]: boolean }>({});
  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [enumeratorStats, setEnumeratorStats] = useState<any[]>([]);
  const [enumeratorStatsLoading, setEnumeratorStatsLoading] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedEnumeratorId, setSelectedEnumeratorId] = useState<string | null>(null);
  const [enumeratorSubmissions, setEnumeratorSubmissions] = useState<any>(null);
  const [enumeratorSubmissionsLoading, setEnumeratorSubmissionsLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [successNotification, setSuccessNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'warning';
  }>({
    show: false,
    message: '',
    type: 'success'
  });

  // Fonction pour gérer le retournement des cartes
  const toggleCardFlip = (cardId: string) => {
    setFlippedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  useEffect(() => {
    fetchValidatedForms();
  }, []);

  useEffect(() => {
    filterForms();
    // Réinitialiser à la page 1 quand les filtres changent
    setCurrentPage(1);
  }, [validatedForms, filterStatus, searchTerm]);

  // Calculer les formulaires paginés
  const paginatedForms = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredForms.slice(startIndex, endIndex);
  }, [filteredForms, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredForms.length / pageSize));

  // Charger les stats des enquêteurs quand une campagne est sélectionnée
  useEffect(() => {
    if (selectedCampaignId && !selectedEnumeratorId) {
      fetchEnumeratorStats(selectedCampaignId);
    }
  }, [selectedCampaignId, selectedEnumeratorId]);

  // Fonction pour récupérer les statistiques des enquêteurs par campagne
  const fetchEnumeratorStats = async (campaignId: string) => {
    setEnumeratorStatsLoading(true);
    try {
      // Utilisation du nouveau service API
      const data = await enhancedApiService.get<any>(`/records/campaign/${campaignId}/enumerators/stats`, {
        skipCache: true,
      });
      
      setEnumeratorStats(data);
    } catch (err: any) {
      console.error('Erreur lors de la récupération des stats des enquêteurs:', err);
    } finally {
      setEnumeratorStatsLoading(false);
    }
  };

  // Fonction pour récupérer les soumissions d'un enquêteur
  const fetchEnumeratorSubmissions = async (enumeratorId: string, campaignId: string) => {
    setEnumeratorSubmissionsLoading(true);
    try {
      // Utilisation du nouveau service API
      const data = await enhancedApiService.get<any>(`/records/campaign/${campaignId}/enumerator/${enumeratorId}/submissions`, {
        skipCache: true,
      });
      
      setEnumeratorSubmissions(data);
      setSelectedEnumeratorId(enumeratorId);
    } catch (err: any) {
      console.error('Erreur lors de la récupération des soumissions:', err);
    } finally {
      setEnumeratorSubmissionsLoading(false);
    }
  };

  const fetchValidatedForms = async () => {
    try {
      setLoading(true);
      // Utilisation du nouveau service API
      const data = await enhancedApiService.get<any[]>('/surveys/pm-validated-forms');
      devLogger.log('✅ Formulaires validés récupérés:', data);
      setValidatedForms(data);

      const uniqueCampaigns = Array.from(
        new Map(data.map((form: ValidatedForm) => [form.surveyId, form.survey])).values()
      ).filter(Boolean) as Array<{ id: string; title: string; description?: string }>;
      setCampaigns(uniqueCampaigns);
      if (uniqueCampaigns.length > 0 && !selectedCampaignId) {
        setSelectedCampaignId(uniqueCampaigns[0].id);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des formulaires validés:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterForms = () => {
    let filtered = [...validatedForms];

    // Filtrer par statut de validation de l'analyste
    if (filterStatus !== 'all') {
      filtered = filtered.filter(form => form.analystValidationStatus === filterStatus);
    }

    // Filtrer par terme de recherche
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(form => 
        form.author.name.toLowerCase().includes(searchLower) ||
        form.survey?.title.toLowerCase().includes(searchLower) ||
        form.formData?.identification?.nom?.toLowerCase().includes(searchLower) ||
        form.formData?.nom?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredForms(filtered);
  };

  // Convertir les formulaires validés au format attendu par exportEnquetesToExcel
  const convertFormsToEnquetes = (forms: ValidatedForm[]) => {
    return forms.map((form) => {
      // Ajouter authorName pour la compatibilité avec exportEnquetesToExcel
      return {
        ...form,
        authorName: form.author?.name || 'N/A',
        formData: form.formData || {}
      };
    });
  };

  const handleExportAll = () => {
    const formsToExport = filteredForms.length ? filteredForms : validatedForms;
    if (formsToExport.length === 0) {
      toast.warning('Aucune donnée à exporter');
      return;
    }

    try {
      const enquetes = convertFormsToEnquetes(formsToExport);
      const success = exportEnquetesToExcel(enquetes, 'formulaires_pm');
      if (success) {
        toast.success('Export Excel généré avec succès');
      } else {
        toast.error('Erreur lors de l\'export Excel');
      }
    } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error);
      toast.error('Erreur lors de l\'export Excel');
    }
  };

  const handleExportSingle = (form: ValidatedForm) => {
    try {
      const enquetes = convertFormsToEnquetes([form]);
      const success = exportEnquetesToExcel(enquetes, `formulaire_${form.id}`);
      if (success) {
        toast.success('Export Excel généré avec succès');
      } else {
        toast.error('Erreur lors de l\'export Excel');
      }
    } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error);
      toast.error('Erreur lors de l\'export Excel');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VALIDATED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Validé
          </span>
        );
      case 'NEEDS_REVIEW':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            À revoir
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            En attente
          </span>
        );
    }
  };

  const renderFormDetails = (formData: any) => {
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
                {entry.chips.map((chip, index) => (
                  <span
                    key={`${entry.key}-${index}`}
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des formulaires...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Styles CSS pour les animations */}
      <style>{flipCardStyles}</style>
      
      {/* En-tête */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          {selectedEnumeratorId ? 'Formulaires de l\'enquêteur' : 'Formulaires Validés par l\'Analyste'}
        </h1>
        <p className="text-gray-600">
          {selectedEnumeratorId 
            ? 'Visualisez les formulaires soumis par cet enquêteur'
            : 'Visualisez et consultez les formulaires validés ou nécessitant une révision'}
        </p>
      </div>

      {/* Bouton de retour si un enquêteur est sélectionné */}
      {selectedEnumeratorId && enumeratorSubmissions && (
        <div>
          <button
            onClick={() => {
              setSelectedEnumeratorId(null);
              setEnumeratorSubmissions(null);
              if (selectedCampaignId) {
                fetchEnumeratorStats(selectedCampaignId);
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
        <div>
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
                  const fileName = `formulaires_pm_${enumeratorSubmissions.enumeratorName || 'enqueteur'}_${new Date().toISOString().split('T')[0]}`;
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

          {/* Liste des formulaires par application */}
          {enumeratorSubmissions.appSubmissions && enumeratorSubmissions.appSubmissions.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
              <h3 className="text-lg font-semibold mb-4 text-blue-800">Formulaires soumis par application ({enumeratorSubmissions.appSubmissions.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enumeratorSubmissions.appSubmissions.map((submission: any) => (
                  <div
                    key={submission.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      setSelectedForm(submission);
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Application</span>
                      {getStatusBadge(submission.analystValidationStatus || submission.status)}
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
            </div>
          )}

          {/* Liste des formulaires par lien public */}
          {enumeratorSubmissions.publicSubmissions && enumeratorSubmissions.publicSubmissions.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
              <h3 className="text-lg font-semibold mb-4 text-green-800">Formulaires soumis par lien public ({enumeratorSubmissions.publicSubmissions.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enumeratorSubmissions.publicSubmissions.map((submission: any) => (
                  <div
                    key={submission.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      setSelectedForm(submission);
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
        /* Liste des enquêteurs avec leurs stats OU liste des formulaires validés */
        <div>
          {/* Sélection de campagne */}
          {campaigns.length > 0 && (
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg mb-4 sm:mb-6">
              <label className="block font-semibold mb-2 text-sm text-gray-700">Sélectionner une campagne</label>
              <select
                value={selectedCampaignId || ''}
                onChange={(e) => {
                  const campaignId = e.target.value;
                  setSelectedCampaignId(campaignId);
                  if (campaignId) {
                    fetchEnumeratorStats(campaignId);
                  } else {
                    // Si aucune campagne n'est sélectionnée, réinitialiser les stats
                    setEnumeratorStats([]);
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Toutes les campagnes (voir tous les formulaires validés)</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Si une campagne est sélectionnée, afficher les enquêteurs */}
          {selectedCampaignId ? (
            <>
              {/* Chargement des stats */}
              {enumeratorStatsLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-600">Chargement des enquêteurs...</p>
                </div>
              ) : enumeratorStats.length > 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
              <h3 className="text-lg font-semibold mb-4">Enquêteurs ({enumeratorStats.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enumeratorStats.map((enumerator: any) => (
                  <div
                    key={enumerator.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      if (selectedCampaignId) {
                        fetchEnumeratorSubmissions(enumerator.id, selectedCampaignId);
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
            </div>
          ) : selectedCampaignId ? (
            <div className="text-center py-8 text-gray-500">
              Aucun enquêteur trouvé pour cette campagne
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Veuillez sélectionner une campagne pour voir les enquêteurs
            </div>
          )}
            </>
          ) : (
            /* Si aucune campagne n'est sélectionnée, afficher tous les formulaires validés */
            <div className="text-center py-8 text-gray-500">
              <p className="mb-4">Sélectionnez une campagne pour voir les enquêteurs, ou consultez tous les formulaires validés ci-dessous.</p>
            </div>
          )}
        </div>
      )}

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-6xl mx-auto">
        {/* Carte Total */}
        <div 
          className="relative w-full h-24 cursor-pointer perspective-1000 hover:scale-105 transition-transform duration-300"
          onClick={() => toggleCardFlip('total')}
        >
          <div className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
            flippedCards.total ? 'rotate-y-180' : ''
          }`}>
            {/* Recto */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow duration-300">
              <div className="text-center text-white">
                <div className="mb-2 hover:scale-110 transition-transform duration-200 relative">
                  <div className="absolute inset-0 bg-white opacity-20 rounded-full blur-sm"></div>
                  <svg className="w-6 h-6 mx-auto relative z-10 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                  </svg>
                </div>
                <div className="text-xs font-semibold">Total</div>
                <div className="text-xs opacity-80 mt-1 animate-pulse">Cliquez pour voir</div>
              </div>
            </div>
            {/* Verso */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg flex items-center justify-center rotate-y-180">
              <div className="text-center text-white">
                <div className="text-2xl font-bold mb-1 animate-bounce">
                  {validatedForms.length}
                </div>
                <div className="text-xs font-semibold">Formulaires totaux</div>
                <div className="text-xs opacity-80 mt-1">
                  Formulaire{validatedForms.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Carte Validés */}
        <div 
          className="relative w-full h-24 cursor-pointer perspective-1000 hover:scale-105 transition-transform duration-300"
          onClick={() => toggleCardFlip('validated')}
        >
          <div className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
            flippedCards.validated ? 'rotate-y-180' : ''
          }`}>
            {/* Recto */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow duration-300">
              <div className="text-center text-white">
                <div className="mb-2 hover:scale-110 transition-transform duration-200 relative">
                  <div className="absolute inset-0 bg-white opacity-20 rounded-full blur-sm"></div>
                  <svg className="w-6 h-6 mx-auto relative z-10 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                </div>
                <div className="text-xs font-semibold">Validés</div>
                <div className="text-xs opacity-80 mt-1 animate-pulse">Cliquez pour voir</div>
              </div>
            </div>
            {/* Verso */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg flex items-center justify-center rotate-y-180">
              <div className="text-center text-white">
                <div className="text-2xl font-bold mb-1 animate-bounce">
                  {validatedForms.filter(f => f.analystValidationStatus === 'VALIDATED').length}
                </div>
                <div className="text-xs font-semibold">Formulaires validés</div>
                <div className="text-xs opacity-80 mt-1">
                  {validatedForms.length > 0 
                    ? `${((validatedForms.filter(f => f.analystValidationStatus === 'VALIDATED').length / validatedForms.length) * 100).toFixed(1)}% du total`
                    : '0% du total'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Carte À revoir */}
        <div 
          className="relative w-full h-24 cursor-pointer perspective-1000 hover:scale-105 transition-transform duration-300"
          onClick={() => toggleCardFlip('needsReview')}
        >
          <div className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
            flippedCards.needsReview ? 'rotate-y-180' : ''
          }`}>
            {/* Recto */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow duration-300">
              <div className="text-center text-white">
                <div className="mb-2 hover:scale-110 transition-transform duration-200 relative">
                  <div className="absolute inset-0 bg-white opacity-20 rounded-full blur-sm"></div>
                  <svg className="w-6 h-6 mx-auto relative z-10 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11,9H13V7H11M13,20H11V12H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                  </svg>
                </div>
                <div className="text-xs font-semibold">À revoir</div>
                <div className="text-xs opacity-80 mt-1 animate-pulse">Cliquez pour voir</div>
              </div>
            </div>
            {/* Verso */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg flex items-center justify-center rotate-y-180">
              <div className="text-center text-white">
                <div className="text-2xl font-bold mb-1 animate-bounce">
                  {validatedForms.filter(f => f.analystValidationStatus === 'NEEDS_REVIEW').length}
                </div>
                <div className="text-xs font-semibold">Nécessitent révision</div>
                <div className="text-xs opacity-80 mt-1">
                  {validatedForms.length > 0 
                    ? `${((validatedForms.filter(f => f.analystValidationStatus === 'NEEDS_REVIEW').length / validatedForms.length) * 100).toFixed(1)}% du total`
                    : '0% du total'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des formulaires validés - toujours visible sauf si un enquêteur spécifique est sélectionné */}
      {!selectedEnumeratorId && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Liste des Formulaires Validés ({filteredForms.length})
          </h2>

        {filteredForms.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-4 text-gray-600">Aucun formulaire trouvé</p>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedForms.map((form) => (
              <div
                key={form.id}
                onClick={() => setSelectedForm(form)}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-bold">
                          {form.author.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{form.author.name}</div>
                        <div className="text-sm text-gray-600">{form.author.email}</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      Campagne: <span className="font-medium">{form.survey?.title || 'Non spécifiée'}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Soumis le: <span className="font-medium">
                        {new Date(form.createdAt).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(form.analystValidationStatus || form.status)}
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      Voir les détails →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Pagination - affichée même avec 1 page */}
        {filteredForms.length > 0 && (
          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages || 1}
              totalItems={filteredForms.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              loading={loading}
            />
          </div>
        )}
        </div>
      )}

      {/* Modal de détails */}
      {selectedForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between z-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Détails du Formulaire</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedForm.author.name} - {selectedForm.survey?.title || 'Sans campagne'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleExportSingle(selectedForm)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Exporter ce formulaire
                </button>
                <button
                  onClick={() => setSelectedForm(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Informations générales */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Informations générales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Enquêteur</div>
                    <div className="font-medium text-gray-800">
                      {selectedForm.author?.name || selectedForm.submitterName || 'N/A'}
                  </div>
                    {selectedForm.author?.email && (
                      <div className="text-xs text-gray-500 mt-1">{selectedForm.author.email}</div>
                    )}
                    {selectedForm.source === 'public_link' && selectedForm.submitterContact && (
                      <div className="text-xs text-gray-500 mt-1">Contact soumetteur : {selectedForm.submitterContact}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Date de soumission</div>
                    <div className="font-medium text-gray-800">
                      {selectedForm.createdAt ? new Date(selectedForm.createdAt).toLocaleString('fr-FR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      }) : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Statut de validation</div>
                    {getStatusBadge(selectedForm.analystValidationStatus || selectedForm.status)}
                  </div>
                  {selectedForm.survey && (
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Campagne</div>
                      <div className="font-medium text-gray-800">{selectedForm.survey.title}</div>
                      {selectedForm.survey.description && (
                        <div className="text-xs text-gray-500 mt-1">{selectedForm.survey.description}</div>
                      )}
                    </div>
                  )}
                  {selectedForm.source && (
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Source</div>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                        selectedForm.source === 'public_link' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {selectedForm.source === 'public_link' ? 'Lien public' : 'Application'}
                      </span>
                    </div>
                  )}
                  {selectedForm.analystValidator && (
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Validé par l'analyste</div>
                      <div className="font-medium text-gray-800">{selectedForm.analystValidator.name}</div>
                      <div className="text-xs text-gray-500">{selectedForm.analystValidator.email}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Contenu du formulaire */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Contenu du formulaire</h3>
                {renderFormDetails(selectedForm.formData)}
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

export default PMValidatedForms;
