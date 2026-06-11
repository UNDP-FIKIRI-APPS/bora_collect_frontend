import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import enhancedApiService from '../../services/enhancedApiService';
import { isAuthenticated } from '../../utils/authStorage';
import { devLogger } from '../../utils/logger';


// Types et interfaces
interface Survey {
  id: string;
  title: string;
  description: string;
  requirements?: string;
  location?: string;
  duration?: string;
  compensation?: string;
  maxApplicants?: number;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'CANCELLED' | 'TERMINATED';
  publishedAt?: string;
  createdAt: string;
  applications: any[];
  campaignUsers: any[];
  totalTargetRespondents?: number;
  campaignDurationDays?: number;
  dailyTargetPerEnumerator?: number;
}

interface CreateSurveyData {
  title: string;
  description: string;
  requirements?: string;
  location?: string;
  duration?: string;
  compensation?: string;
  maxApplicants?: number;
  startDate: string;
  endDate: string;
  // Champs d'objectifs
  totalTargetRespondents?: number;
  campaignDurationDays?: number;
  dailyTargetPerEnumerator?: number;
  totalEnumeratorTarget?: number;
}

interface ReusableFormTemplate {
  id: string;
  name: string;
  description: string;
  surveyId: string;
  survey?: { id: string; title: string; status: string };
}

type FormSetupMode = 'later' | 'reuse' | 'new';

const PMSurveyManagement: React.FC = () => {
  // États
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [filteredSurveys, setFilteredSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  
  // États pour les filtres
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [formSetupMode, setFormSetupMode] = useState<FormSetupMode>('later');
  const [reusableForms, setReusableForms] = useState<ReusableFormTemplate[]>([]);
  const [loadingReusableForms, setLoadingReusableForms] = useState(false);
  const [sourceFormTemplateId, setSourceFormTemplateId] = useState('');
  const [newFormName, setNewFormName] = useState('');
  const [newFormDescription, setNewFormDescription] = useState('');

  const [formData, setFormData] = useState<CreateSurveyData>({
    title: '',
    description: '',
    requirements: '',
    location: '',
    duration: '',
    compensation: '',
    maxApplicants: undefined,
    startDate: '',
    endDate: '',
    totalTargetRespondents: undefined,
    campaignDurationDays: undefined,
    dailyTargetPerEnumerator: undefined,
    totalEnumeratorTarget: undefined
  });

  // Fonction utilitaire pour la gestion des erreurs
  const handleApiError = useCallback((error: any, context: string) => {
    console.error(`❌ Erreur ${context}:`, error);
    
    let errorMessage = `Erreur lors de ${context}`;
    
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    toast.error(errorMessage);
    return errorMessage;
  }, []);

  // Fonction pour calculer automatiquement la date de fin
  const calculateEndDate = useCallback((startDate: string, duration: string): string => {
    if (!startDate || !duration) return '';
    
    try {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) return '';
      
      const durationLower = duration.toLowerCase();
      let endDate = new Date(start);
      
      if (durationLower.includes('jour') || durationLower.includes('day')) {
        const days = parseInt(duration.match(/\d+/)?.[0] || '1');
        endDate.setDate(start.getDate() + days);
      } else if (durationLower.includes('semaine') || durationLower.includes('week')) {
        const weeks = parseInt(duration.match(/\d+/)?.[0] || '1');
        endDate.setDate(start.getDate() + (weeks * 7));
      } else if (durationLower.includes('mois') || durationLower.includes('month')) {
        const months = parseInt(duration.match(/\d+/)?.[0] || '1');
        endDate.setMonth(start.getMonth() + months);
      } else {
        endDate.setDate(start.getDate() + 7);
      }
      
      return endDate.toISOString().split('T')[0];
    } catch (error) {
      console.error('❌ Erreur calcul date:', error);
      return '';
    }
  }, []);

  const ensureAuthenticated = useCallback((): boolean => {
    if (isAuthenticated()) return true;
    toast.error('Vous devez être connecté pour effectuer cette action');
    return false;
  }, []);

  // Fonction pour charger les enquêtes du Projet Manager
  const fetchSurveys = useCallback(async () => {
    try {
      setLoading(true);
      if (!ensureAuthenticated()) return;

      const data = await enhancedApiService.get<Survey[]>('/surveys/pm-surveys', { skipCache: true });
      setSurveys(data);
    } catch (error) {
      handleApiError(error, 'du chargement des enquêtes');
    } finally {
      setLoading(false);
    }
  }, [ensureAuthenticated, handleApiError]);

  const fetchReusableForms = useCallback(async () => {
    try {
      setLoadingReusableForms(true);
      if (!ensureAuthenticated()) return;

      const data = await enhancedApiService.get<any[]>('/forms', { skipCache: true });
      setReusableForms(Array.isArray(data) ? data : []);
    } catch (error) {
      handleApiError(error, 'du chargement des formulaires existants');
      setReusableForms([]);
    } finally {
      setLoadingReusableForms(false);
    }
  }, [ensureAuthenticated, handleApiError]);

  // Fonction pour soumettre le formulaire
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      
      // Validation des données
      if (!formData.title.trim() || !formData.description.trim() || !formData.startDate || !formData.endDate) {
        toast.error('Veuillez remplir tous les champs obligatoires');
        return;
      }

      // Validation des dates
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        toast.error('Dates invalides détectées');
        return;
      }

      if (endDate <= startDate) {
        toast.error('La date de fin doit être après la date de début');
        return;
      }

      if (!formData.dailyTargetPerEnumerator || formData.dailyTargetPerEnumerator <= 0) {
        toast.error('Veuillez indiquer un objectif quotidien par enquêteur (strictement positif)');
        return;
      }

      if (!editingSurvey && formSetupMode === 'reuse' && !sourceFormTemplateId) {
        toast.error('Veuillez sélectionner un formulaire à réutiliser');
        return;
      }

      if (!editingSurvey && formSetupMode === 'new' && !newFormName.trim()) {
        toast.error('Veuillez donner un nom au nouveau formulaire');
        return;
      }

      if (!ensureAuthenticated()) return;

      // Calculer la durée en jours
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const rawDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const daysDiff = rawDiff > 0 ? rawDiff : 1;
      const derivedCampaignDays = formData.campaignDurationDays || daysDiff;
      const derivedTotalEnumeratorTarget = formData.totalEnumeratorTarget
        || (formData.dailyTargetPerEnumerator
          ? formData.dailyTargetPerEnumerator * derivedCampaignDays
          : undefined);

      // Préparation des données
      const cleanData: Record<string, unknown> = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        requirements: formData.requirements?.trim() || null,
        location: formData.location?.trim() || null,
        duration: formData.duration?.trim() || null,
        compensation: formData.compensation?.trim() || null,
        maxApplicants: formData.maxApplicants || null,
        totalTargetRespondents: formData.totalTargetRespondents || null,
        campaignDurationDays: derivedCampaignDays,
        dailyTargetPerEnumerator: formData.dailyTargetPerEnumerator,
      };

      if (!editingSurvey) {
        cleanData.formSetup = {
          mode: formSetupMode,
          ...(formSetupMode === 'reuse' && {
            sourceFormTemplateId,
            newFormName: newFormName.trim() || undefined,
            newFormDescription: newFormDescription.trim() || undefined,
          }),
          ...(formSetupMode === 'new' && {
            newFormName: newFormName.trim(),
            newFormDescription: newFormDescription.trim() || undefined,
          }),
        };
      }

      const result = editingSurvey
        ? await enhancedApiService.put<any>(`/surveys/${editingSurvey.id}`, cleanData)
        : await enhancedApiService.post<any>('/surveys/pm-create', cleanData);

      const action = editingSurvey ? 'modifiée' : 'créée';
      if (!editingSurvey && result.form) {
        if (formSetupMode === 'reuse') {
          toast.success(`Campagne créée et formulaire réutilisé avec succès !`);
        } else if (formSetupMode === 'new') {
          toast.success(`Campagne créée avec un nouveau formulaire. Complétez-le dans « Formulaires ».`);
        }
      } else {
        toast.success(`Enquête ${action} avec succès !`);
      }
      
      // Réinitialisation et rechargement
      resetForm();
      await fetchSurveys();
      
    } catch (error) {
      handleApiError(error, 'de la création/modification de l\'enquête');
    } finally {
      setSubmitting(false);
    }
  }, [
    formData,
    editingSurvey,
    formSetupMode,
    sourceFormTemplateId,
    newFormName,
    newFormDescription,
    ensureAuthenticated,
    handleApiError,
    fetchSurveys,
  ]);

  // Fonction pour réinitialiser le formulaire
  const resetForm = useCallback(() => {
    setFormData({
      title: '',
      description: '',
      requirements: '',
      location: '',
      duration: '',
      compensation: '',
      maxApplicants: undefined,
      startDate: '',
      endDate: '',
      totalTargetRespondents: undefined,
      campaignDurationDays: undefined,
    dailyTargetPerEnumerator: undefined,
    totalEnumeratorTarget: undefined
    });
    setFormSetupMode('later');
    setSourceFormTemplateId('');
    setNewFormName('');
    setNewFormDescription('');
    setEditingSurvey(null);
    setShowCreateForm(false);
  }, []);

  // Fonction pour éditer une enquête
  const editSurvey = useCallback((survey: Survey) => {
    const startDate = survey.startDate ? survey.startDate.split('T')[0] : '';
    const endDate = survey.endDate ? survey.endDate.split('T')[0] : '';
    const dailyTarget = survey.dailyTargetPerEnumerator || undefined;
    const campaignDays = survey.campaignDurationDays || undefined;

    setFormData({
      title: survey.title,
      description: survey.description,
      requirements: survey.requirements || '',
      location: survey.location || '',
      duration: survey.duration || '',
      compensation: survey.compensation || '',
      maxApplicants: survey.maxApplicants,
      startDate,
      endDate,
      totalTargetRespondents: survey.totalTargetRespondents,
      campaignDurationDays: campaignDays,
      dailyTargetPerEnumerator: dailyTarget,
      totalEnumeratorTarget:
        dailyTarget && campaignDays ? dailyTarget * campaignDays : undefined
    });
    setEditingSurvey(survey);
    setShowCreateForm(true);
  }, []);

  // Fonction pour publier une enquête
  const publishSurvey = useCallback(async (surveyId: string) => {
    try {
      if (!ensureAuthenticated()) return;

      await enhancedApiService.post(`/surveys/${surveyId}/publish`);
      toast.success('Enquête publiée avec succès !');
      await fetchSurveys();
    } catch (error) {
      handleApiError(error, 'de la publication de l\'enquête');
    }
  }, [ensureAuthenticated, handleApiError, fetchSurveys]);

  // Fonction pour fermer une enquête
  const closeSurvey = useCallback(async (surveyId: string) => {
    try {
      if (!ensureAuthenticated()) return;

      await enhancedApiService.post(`/surveys/${surveyId}/close`);
      toast.success('Enquête fermée avec succès !');
      await fetchSurveys();
    } catch (error) {
      handleApiError(error, 'de la fermeture de l\'enquête');
    }
  }, [ensureAuthenticated, handleApiError, fetchSurveys]);

  // Fonction pour terminer une enquête
  const terminateSurvey = useCallback(async (surveyId: string) => {
    try {
      if (!ensureAuthenticated()) return;

      await enhancedApiService.post(`/surveys/${surveyId}/terminate`);
      toast.success('Enquête terminée avec succès !');
      await fetchSurveys();
    } catch (error) {
      handleApiError(error, 'de la terminaison de l\'enquête');
    }
  }, [ensureAuthenticated, handleApiError, fetchSurveys]);

  // Fonctions utilitaires pour l'affichage
  const getStatusLabel = useCallback((status: string) => {
    const statusMap: Record<string, string> = {
      'DRAFT': 'Brouillon',
      'PUBLISHED': 'Publiée',
      'CLOSED': 'Fermée',
      'CANCELLED': 'Annulée',
      'TERMINATED': 'Terminée'
    };
    return statusMap[status] || status;
  }, []);

  const getStatusColor = useCallback((status: string) => {
    const colorMap: Record<string, string> = {
      'DRAFT': 'bg-gray-100 text-gray-800',
      'PUBLISHED': 'bg-green-100 text-green-800',
      'CLOSED': 'bg-orange-100 text-orange-800',
      'CANCELLED': 'bg-yellow-100 text-yellow-800',
      'TERMINATED': 'bg-red-100 text-red-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  }, []);

  // Fonction de filtrage
  const applyFilters = () => {
    let filtered = surveys;

    // Filtre par province (basé sur la localisation)
    if (selectedProvince) {
      filtered = filtered.filter(survey => 
        survey.location?.toLowerCase().includes(selectedProvince.toLowerCase())
      );
    }

    // Filtre par année (basé sur la date de début)
    if (selectedYear) {
      filtered = filtered.filter(survey => {
        const surveyYear = new Date(survey.startDate).getFullYear().toString();
        return surveyYear === selectedYear;
      });
    }

    // Filtre par statut
    if (selectedStatus) {
      filtered = filtered.filter(survey => survey.status === selectedStatus);
    }

    setFilteredSurveys(filtered);
  };

  // Appliquer les filtres quand les données ou les filtres changent
  useEffect(() => {
    applyFilters();
  }, [surveys, selectedProvince, selectedYear, selectedStatus]);

  // Obtenir les provinces de la RDC
  const getRDCProvinces = () => [
    'Bas-Uele',
    'Équateur',
    'Haut-Katanga',
    'Haut-Lomami',
    'Haut-Uele',
    'Ituri',
    'Kasaï',
    'Kasaï-Central',
    'Kasaï-Oriental',
    'Kinshasa',
    'Kongo-Central',
    'Kwango',
    'Kwilu',
    'Lomami',
    'Lualaba',
    'Mai-Ndombe',
    'Maniema',
    'Mongala',
    'Nord-Kivu',
    'Nord-Ubangi',
    'Sankuru',
    'Sud-Kivu',
    'Sud-Ubangi',
    'Tanganyika',
    'Tshopo',
    'Tshuapa'
  ];

  // Obtenir les années disponibles (jusqu'à 2025)
  const getAvailableYears = () => {
    // Debug: vérifier les données des enquêtes
    devLogger.log('Surveys data:', surveys);
    devLogger.log('Survey start dates:', surveys.map(s => s.startDate));
    
    // Obtenir les années des enquêtes existantes
    const surveyYears = surveys
      .map(survey => new Date(survey.startDate).getFullYear())
      .filter(year => !isNaN(year) && year <= 2025);
    
    devLogger.log('Survey years:', surveyYears);
    
    const uniqueSurveyYears = [...new Set(surveyYears)].sort((a, b) => b - a);
    
    // Si aucune enquête ou années manquantes, ajouter une plage par défaut
    if (uniqueSurveyYears.length === 0) {
      const currentYear = new Date().getFullYear();
      const defaultYears = [];
      for (let year = currentYear; year >= 2020 && year <= 2025; year--) {
        defaultYears.push(year);
      }
      devLogger.log('Using default years:', defaultYears);
      return defaultYears;
    }
    
    devLogger.log('Final years:', uniqueSurveyYears);
    return uniqueSurveyYears;
  };

  // Obtenir les options de statut (seulement Terminée, Fermée, Publiée)
  const getStatusOptions = () => [
    { value: 'PUBLISHED', label: 'Publiée' },
    { value: 'CLOSED', label: 'Fermée' },
    { value: 'TERMINATED', label: 'Terminée' }
  ];

  // Réinitialiser les filtres
  const resetFilters = () => {
    setSelectedProvince('');
    setSelectedYear('');
    setSelectedStatus('');
  };

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  useEffect(() => {
    if (showCreateForm && !editingSurvey) {
      fetchReusableForms();
    }
  }, [showCreateForm, editingSurvey, fetchReusableForms]);

  // Gestionnaires d'événements pour le formulaire
  const handleInputChange = useCallback((field: keyof CreateSurveyData, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      // Calcul automatique de la date de fin si nécessaire
      if ((field === 'startDate' || field === 'duration') && newData.startDate && newData.duration) {
        const calculatedEndDate = calculateEndDate(newData.startDate, newData.duration);
        if (calculatedEndDate) {
          newData.endDate = calculatedEndDate;
        }
      }

      const dailyTarget = field === 'dailyTargetPerEnumerator' ? value : newData.dailyTargetPerEnumerator;
      let campaignDays =
        field === 'campaignDurationDays' ? value : newData.campaignDurationDays;
      let totalEnumeratorTarget =
        field === 'totalEnumeratorTarget' ? value : newData.totalEnumeratorTarget;

      if (field === 'totalEnumeratorTarget' && dailyTarget && value) {
        const derivedDays = Math.max(Math.ceil(value / dailyTarget), 1);
        campaignDays = derivedDays;
        newData.campaignDurationDays = derivedDays;
      }

      if ((field === 'dailyTargetPerEnumerator' || field === 'campaignDurationDays') && dailyTarget && campaignDays) {
        totalEnumeratorTarget = dailyTarget * campaignDays;
        newData.totalEnumeratorTarget = totalEnumeratorTarget;
      }

      if (!newData.totalEnumeratorTarget && dailyTarget && campaignDays) {
        newData.totalEnumeratorTarget = dailyTarget * campaignDays;
      }

      return newData;
    });
  }, [calculateEndDate]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gestion des Enquêtes
          </h1>
          <p className="text-gray-600">
            Créez et gérez vos enquêtes
          </p>
        </div>

        {/* Bouton de création */}
        <div className="mb-6">
          <button
            onClick={() => setShowCreateForm(true)}
            disabled={submitting}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Créer une nouvelle enquête
          </button>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filtre par province */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Province
              </label>
              <select
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Toutes les provinces</option>
                {getRDCProvinces().map(province => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtre par année */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Année
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Toutes les années</option>
                {getAvailableYears().map(year => (
                  <option key={year} value={year.toString()}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtre par statut */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statut
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tous les statuts</option>
                {getStatusOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Bouton de réinitialisation */}
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="w-full bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>

        {/* Formulaire de création/modification */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {editingSurvey ? 'Modifier l\'enquête' : 'Créer une nouvelle enquête'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Titre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titre *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={submitting}
                  />
                </div>

                {/* Localisation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Localisation
                  </label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={submitting}
                  />
                </div>

                {/* Durée */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Durée
                  </label>
                  <input
                    type="text"
                    placeholder="ex: 2 semaines, 1 mois, 30 jours"
                    value={formData.duration || ''}
                    onChange={(e) => handleInputChange('duration', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={submitting}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Formats acceptés: "2 semaines", "1 mois", "30 jours"
                  </p>
                </div>

                {/* Compensation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Compensation
                  </label>
                  <input
                    type="text"
                    placeholder="ex: 500€"
                    value={formData.compensation || ''}
                    onChange={(e) => handleInputChange('compensation', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={submitting}
                  />
                </div>

                {/* Nombre max de candidats */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre max de candidats
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxApplicants || ''}
                    onChange={(e) => handleInputChange('maxApplicants', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={submitting}
                  />
                </div>

                {/* Date de début */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de début *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={submitting}
                  />
                </div>

                {/* Date de fin */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de fin *
                    {formData.startDate && formData.duration && (
                      <span className="text-xs text-blue-600 ml-2">(calculée automatiquement)</span>
                    )}
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    min={formData.startDate}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formData.startDate && formData.duration 
                        ? 'border-blue-300 bg-blue-50' 
                        : 'border-gray-300'
                    }`}
                    disabled={submitting}
                  />
                  {formData.startDate && formData.duration && (
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-blue-600">
                        Basée sur: {formData.startDate} + {formData.duration}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (formData.startDate && formData.duration) {
                            const calculatedEndDate = calculateEndDate(formData.startDate, formData.duration);
                            if (calculatedEndDate) {
                              handleInputChange('endDate', calculatedEndDate);
                            }
                          }
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                        disabled={submitting}
                      >
                        Recalculer
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Section Objectifs de Campagne */}
              <div className="border-t-2 border-blue-200 pt-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Objectifs de Campagne
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Nombre total de répondants */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre total de personnes/ménages à enquêter
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.totalTargetRespondents || ''}
                      onChange={(e) => handleInputChange('totalTargetRespondents', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={submitting}
                      placeholder="Ex: 1000"
                    />
                  </div>

                  {/* Durée de la campagne en jours */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Durée de la campagne (jours)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.campaignDurationDays || ''}
                      onChange={(e) => handleInputChange('campaignDurationDays', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={submitting}
                      placeholder="Ex: 30"
                    />
                  </div>

                  {/* Objectif quotidien par enquêteur */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Objectif quotidien par enquêteur
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.dailyTargetPerEnumerator || ''}
                      onChange={(e) => handleInputChange('dailyTargetPerEnumerator', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={submitting}
                      placeholder="Ex: 5"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Nombre de ménages/formulaires que chaque enquêteur doit couvrir par jour.
                    </p>
                  </div>

                  {/* Objectif total par enquêteur */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Objectif total par enquêteur
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.totalEnumeratorTarget || ''}
                      onChange={(e) =>
                        handleInputChange(
                          'totalEnumeratorTarget',
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={submitting || !formData.dailyTargetPerEnumerator}
                      placeholder="Ex: 50"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Total attendu pour un enquêteur sur toute la campagne.
                      {formData.dailyTargetPerEnumerator && formData.campaignDurationDays ? (
                        <span className="block text-blue-600 mt-1">
                          Calcul automatique : {formData.dailyTargetPerEnumerator} par jour ×{' '}
                          {formData.campaignDurationDays} jours ={' '}
                          {formData.dailyTargetPerEnumerator * formData.campaignDurationDays}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Ces objectifs permettront de suivre la progression de la campagne et des enquêteurs
                </p>
              </div>

              {/* Configuration du formulaire (création uniquement) */}
              {!editingSurvey && (
                <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Formulaire de collecte</h3>
                    <p className="text-xs text-gray-600 mt-1">
                      Choisissez comment associer un formulaire à cette nouvelle campagne.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label className={`flex items-start gap-2 p-3 rounded-md border cursor-pointer transition-colors ${formSetupMode === 'later' ? 'border-blue-500 bg-white' : 'border-gray-200 bg-white/80'}`}>
                      <input
                        type="radio"
                        name="formSetupMode"
                        value="later"
                        checked={formSetupMode === 'later'}
                        onChange={() => setFormSetupMode('later')}
                        className="mt-1"
                        disabled={submitting}
                      />
                      <span>
                        <span className="block text-sm font-medium text-gray-900">Plus tard</span>
                        <span className="block text-xs text-gray-500">Créer le formulaire après, dans l’onglet Formulaires</span>
                      </span>
                    </label>

                    <label className={`flex items-start gap-2 p-3 rounded-md border cursor-pointer transition-colors ${formSetupMode === 'reuse' ? 'border-blue-500 bg-white' : 'border-gray-200 bg-white/80'}`}>
                      <input
                        type="radio"
                        name="formSetupMode"
                        value="reuse"
                        checked={formSetupMode === 'reuse'}
                        onChange={() => setFormSetupMode('reuse')}
                        className="mt-1"
                        disabled={submitting}
                      />
                      <span>
                        <span className="block text-sm font-medium text-gray-900">Réutiliser</span>
                        <span className="block text-xs text-gray-500">Copier un formulaire d’une ancienne campagne</span>
                      </span>
                    </label>

                    <label className={`flex items-start gap-2 p-3 rounded-md border cursor-pointer transition-colors ${formSetupMode === 'new' ? 'border-blue-500 bg-white' : 'border-gray-200 bg-white/80'}`}>
                      <input
                        type="radio"
                        name="formSetupMode"
                        value="new"
                        checked={formSetupMode === 'new'}
                        onChange={() => setFormSetupMode('new')}
                        className="mt-1"
                        disabled={submitting}
                      />
                      <span>
                        <span className="block text-sm font-medium text-gray-900">Nouveau</span>
                        <span className="block text-xs text-gray-500">Créer un formulaire vierge pour cette campagne</span>
                      </span>
                    </label>
                  </div>

                  {formSetupMode === 'reuse' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Formulaire à réutiliser *
                        </label>
                        {loadingReusableForms ? (
                          <p className="text-sm text-gray-500">Chargement des formulaires...</p>
                        ) : reusableForms.length === 0 ? (
                          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                            Aucun formulaire disponible. Créez d’abord une campagne avec un formulaire, ou choisissez « Nouveau ».
                          </p>
                        ) : (
                          <select
                            value={sourceFormTemplateId}
                            onChange={(e) => setSourceFormTemplateId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={submitting}
                          >
                            <option value="">Sélectionner un formulaire</option>
                            {reusableForms.map((form) => (
                              <option key={form.id} value={form.id}>
                                {form.name} — {form.survey?.title || 'Campagne'}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nom du formulaire copié (optionnel)
                        </label>
                        <input
                          type="text"
                          value={newFormName}
                          onChange={(e) => setNewFormName(e.target.value)}
                          placeholder="Laisser vide pour un nom automatique"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  )}

                  {formSetupMode === 'new' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nom du nouveau formulaire *
                        </label>
                        <input
                          type="text"
                          value={newFormName}
                          onChange={(e) => setNewFormName(e.target.value)}
                          placeholder="Ex: Enquête ménages 2026"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={submitting}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description du formulaire
                        </label>
                        <input
                          type="text"
                          value={newFormDescription}
                          onChange={(e) => setNewFormDescription(e.target.value)}
                          placeholder="Optionnel"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={submitting}
                        />
                      </div>
                      <p className="md:col-span-2 text-xs text-gray-500">
                        Un formulaire de base sera créé. Vous pourrez le personnaliser dans l’onglet « Formulaires ».
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={submitting}
                />
              </div>

              {/* Exigences */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exigences
                </label>
                <textarea
                  rows={3}
                  value={formData.requirements || ''}
                  onChange={(e) => handleInputChange('requirements', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={submitting}
                />
              </div>

              {/* Boutons d'action */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={submitting}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Enregistrement...' : (editingSurvey ? 'Modifier' : 'Créer')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Écran de chargement */}
        {loading && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement des enquêtes...</p>
          </div>
        )}

        {/* Liste des enquêtes */}
        {!loading && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Mes Enquêtes ({filteredSurveys.length} sur {surveys.length})
              </h2>
            </div>

            {filteredSurveys.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {surveys.length === 0 ? 'Aucune enquête' : 'Aucun résultat trouvé'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {surveys.length === 0 
                    ? 'Commencez par créer votre première enquête.'
                    : 'Essayez de modifier vos critères de filtrage.'
                  }
                </p>
              </div>
            ) : (
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
                        Dates
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Participants
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSurveys.map((survey) => (
                      <tr key={survey.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{survey.title}</div>
                            <div className="text-sm text-gray-500">
                              {survey.description.substring(0, 100)}
                              {survey.description.length > 100 && '...'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(survey.status)}`}>
                            {getStatusLabel(survey.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="text-xs text-gray-500">Début:</div>
                            <div>{survey.startDate ? new Date(survey.startDate).toLocaleDateString('fr-FR') : 'N/A'}</div>
                            <div className="text-xs text-gray-500 mt-1">Fin:</div>
                            <div>{survey.endDate ? new Date(survey.endDate).toLocaleDateString('fr-FR') : 'N/A'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{survey.campaignUsers?.length || 0}</div>
                            {survey.maxApplicants && (
                              <div className="text-xs text-gray-500">/ {survey.maxApplicants} max</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex flex-wrap gap-2">
                            {/* Bouton Modifier */}
                            <button
                              onClick={() => editSurvey(survey)}
                              className="text-blue-600 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                            >
                              Modifier
                            </button>

                            {/* Bouton Publier (si DRAFT) */}
                            {survey.status === 'DRAFT' && (
                              <button
                                onClick={() => publishSurvey(survey.id)}
                                className="text-green-600 hover:text-green-900 bg-green-100 hover:bg-green-200 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                              >
                                Publier
                              </button>
                            )}

                            {/* Bouton Fermer (si PUBLISHED) */}
                            {survey.status === 'PUBLISHED' && (
                              <button
                                onClick={() => closeSurvey(survey.id)}
                                className="text-orange-600 hover:text-orange-900 bg-orange-100 hover:bg-orange-200 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                              >
                                Fermer
                              </button>
                            )}

                            {/* Bouton Terminer (si CLOSED) */}
                            {survey.status === 'CLOSED' && (
                              <button
                                onClick={() => terminateSurvey(survey.id)}
                                className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                              >
                                Terminer
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PMSurveyManagement;
