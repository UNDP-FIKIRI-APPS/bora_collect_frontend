import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { environment } from '../config/environment';
import Pagination from '../components/Pagination';
import enhancedApiService from '../services/enhancedApiService';

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
    email?: string;
  };
  campaignUsers?: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
  }>;
}

const AdminCampaignManagement: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [flippedCards, setFlippedCards] = useState<{ [key: string]: boolean }>({});
  const [filters, setFilters] = useState({
    province: '',
    odd: '',
    status: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  // États pour l'assignation de PM
  const [showAssignPMModal, setShowAssignPMModal] = useState(false);
  const [selectedCampaignForPM, setSelectedCampaignForPM] = useState<Campaign | null>(null);
  const [assigningPM, setAssigningPM] = useState(false);
  const [pmFormData, setPmFormData] = useState({
    name: '',
    email: '',
    contact: '',
    password: '',
    confirmPassword: ''
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const PROVINCES = [
    'BAS_UELE', 'EQUATEUR', 'HAUT_KATANGA', 'HAUT_LOMAMI', 'HAUT_UELE',
    'ITURI', 'KASAI', 'KASAI_CENTRAL', 'KASAI_ORIENTAL', 'KINSHASA',
    'KONGO_CENTRAL', 'KWANGO', 'KWILU', 'LOMAMI', 'LUALABA',
    'MAI_NDOMBE', 'MANIEMA', 'MONGALA', 'NORD_KIVU', 'NORD_UBANGI',
    'SANKURU', 'SUD_KIVU', 'SUD_UBANGI', 'TANGANYIKA', 'TSHOPO', 'TSHUAPA'
  ];

  const ODD_OPTIONS = Array.from({ length: 17 }, (_, i) => ({
    value: i + 1,
    label: `ODD ${i + 1}`
  }));

  const STATUS_OPTIONS = [
    { value: 'ACTIVE', label: 'En cours' },
    { value: 'COMPLETED', label: 'Terminée' },
    { value: 'PENDING', label: 'En attente' }
  ];

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    applyFilters();
    // Réinitialiser à la page 1 quand les filtres changent
    setCurrentPage(1);
  }, [campaigns, filters, searchTerm]);

  // Calculer les campagnes paginées
  const paginatedCampaigns = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredCampaigns.slice(startIndex, endIndex);
  }, [filteredCampaigns, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredCampaigns.length / pageSize));

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      // Vérifier que l'utilisateur est bien ADMIN
      const user = localStorage.getItem('user');
      if (user) {
        const userData = JSON.parse(user);
        if (userData.role !== 'ADMIN') {
          console.error('❌ Accès refusé : rôle non autorisé', userData.role);
          toast.error('Vous n\'avez pas les permissions nécessaires pour accéder à cette page');
          return;
        }
      }

      // Utilisation du nouveau service API
      const data = await enhancedApiService.get<any>('/surveys/admin', {
        skipCache: true, // Forcer le refresh pour les données critiques
      });
      
      setCampaigns(data);
    } catch (error: any) {
      console.error('Erreur lors du chargement des campagnes:', error);
      // Ne pas déconnecter si c'est juste une erreur de chargement
      if (error?.message?.includes('Session expirée') || error?.message?.includes('401')) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
      } else {
        toast.error('Erreur lors du chargement des campagnes');
      }
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...campaigns];

    // Filtrage par recherche textuelle
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(campaign => 
        campaign.title?.toLowerCase().includes(searchLower) ||
        campaign.description?.toLowerCase().includes(searchLower) ||
        campaign.targetProvince?.toLowerCase().includes(searchLower) ||
        campaign.publisher?.name?.toLowerCase().includes(searchLower) ||
        campaign.publisher?.email?.toLowerCase().includes(searchLower) ||
        campaign.campaignUsers?.some(cu => 
          cu.name?.toLowerCase().includes(searchLower) ||
          cu.email?.toLowerCase().includes(searchLower)
        ) ||
        getStatusLabel(campaign.status).toLowerCase().includes(searchLower) ||
        (campaign.selectedODD && `odd ${campaign.selectedODD}`.includes(searchLower))
      );
    }

    if (filters.province) {
      filtered = filtered.filter(campaign => campaign.targetProvince === filters.province);
    }

    if (filters.odd) {
      filtered = filtered.filter(campaign => campaign.selectedODD === parseInt(filters.odd));
    }

    if (filters.status) {
      filtered = filtered.filter(campaign => campaign.status === filters.status);
    }

    setFilteredCampaigns(filtered);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      province: '',
      odd: '',
      status: ''
    });
  };

  // Fonction pour gérer le retournement des cartes
  const toggleCardFlip = (cardId: string) => {
    setFlippedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'En cours';
      case 'COMPLETED': return 'Terminée';
      case 'PENDING': return 'En attente';
      default: return status;
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

  const getODDColor = (odd: number) => {
    const colors = [
      '#E74C3C', '#F39C12', '#27AE60', '#8E44AD', '#E67E22',
      '#3498DB', '#F1C40F', '#2ECC71', '#E67E22', '#E74C3C',
      '#F39C12', '#27AE60', '#2ECC71', '#3498DB', '#27AE60',
      '#8E44AD', '#2ECC71'
    ];
    return colors[odd - 1] || '#6C5CE7';
  };

  // Fonction pour ouvrir le modal d'assignation de PM
  const openAssignPMModal = useCallback((campaign: Campaign) => {
    setSelectedCampaignForPM(campaign);
    setPmFormData({
      name: '',
      email: '',
      contact: '',
      password: '',
      confirmPassword: ''
    });
    setFormErrors({});
    setShowAssignPMModal(true);
  }, []);

  // Fonction pour valider le formulaire
  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!pmFormData.name.trim()) {
      errors.name = 'Le nom est requis';
    }

    if (!pmFormData.email.trim()) {
      errors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pmFormData.email)) {
      errors.email = 'Format d\'email invalide';
    }

    if (!pmFormData.contact.trim()) {
      errors.contact = 'Le numéro de téléphone est requis';
    }

    if (!pmFormData.password) {
      errors.password = 'Le mot de passe est requis';
    } else if (pmFormData.password.length < 6) {
      errors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    if (!pmFormData.confirmPassword) {
      errors.confirmPassword = 'La confirmation du mot de passe est requise';
    } else if (pmFormData.password !== pmFormData.confirmPassword) {
      errors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Fonction pour créer et assigner un PM à un projet
  const createAndAssignPMToCampaign = useCallback(async () => {
    if (!selectedCampaignForPM) {
      toast.error('Aucune campagne sélectionnée');
      return;
    }

    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs du formulaire');
      return;
    }

    try {
      setAssigningPM(true);
      // Utilisation du nouveau service API
      const result = await enhancedApiService.post<any>(
        `/surveys/${selectedCampaignForPM.id}/create-and-assign-pm`,
        {
          name: pmFormData.name.trim(),
          email: pmFormData.email.trim(),
          password: pmFormData.password,
          contact: pmFormData.contact.trim()
        }
      );

      toast.success(result.message || 'PM créé et assigné avec succès !');
      setShowAssignPMModal(false);
      setSelectedCampaignForPM(null);
      setPmFormData({
        name: '',
        email: '',
        contact: '',
        password: '',
        confirmPassword: ''
      });
      setFormErrors({});
      await fetchCampaigns(); // Recharger les campagnes
    } catch (error: any) {
      console.error('Erreur lors de la création et assignation du PM:', error);
      toast.error(error.message || 'Erreur lors de la création et assignation du PM');
    } finally {
      setAssigningPM(false);
    }
  }, [selectedCampaignForPM, pmFormData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Filtres</h2>
        {/* Barre de recherche */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par titre, description, PM, province, statut, ODD..."
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Province
            </label>
            <select
              value={filters.province}
              onChange={(e) => handleFilterChange('province', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Toutes les provinces</option>
              {PROVINCES.map(province => (
                <option key={province} value={province}>
                  {province.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ODD
            </label>
            <select
              value={filters.odd}
              onChange={(e) => handleFilterChange('odd', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les ODD</option>
              {ODD_OPTIONS.map(odd => (
                <option key={odd.value} value={odd.value}>
                  {odd.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Statut
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les statuts</option>
              {STATUS_OPTIONS.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Effacer les filtres
          </button>
        </div>
      </div>

      {/* Compteur Campagnes avec effet de retournement - Style PM */}
      <div className="flex justify-center">
        <div 
          className="relative w-full max-w-sm h-32 cursor-pointer perspective-1000 hover:scale-105 transition-transform duration-300"
          onClick={() => toggleCardFlip('totalCampaigns')}
        >
          <div className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
            flippedCards.totalCampaigns ? 'rotate-y-180' : ''
          }`}>
            {/* Recto */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow duration-300">
              <div className="text-center text-white">
                <div className="mb-2 hover:scale-110 transition-transform duration-200 relative">
                  <div className="absolute inset-0 bg-white opacity-20 rounded-full blur-sm"></div>
                  <svg className="w-8 h-8 mx-auto relative z-10 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                  </svg>
                </div>
                <div className="text-sm font-semibold">Total Campagnes</div>
                <div className="text-xs opacity-80 mt-1 animate-pulse">Cliquez pour voir</div>
              </div>
            </div>
            {/* Verso */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg flex items-center justify-center rotate-y-180">
              <div className="text-center text-white">
                <div className="text-3xl font-bold mb-2">
                  <span className="animate-bounce hover:animate-pulse transition-all duration-300 hover:scale-110 hover:text-yellow-200">
                    {filteredCampaigns.length}
                  </span>
                </div>
                <div className="text-xs space-y-1">
                  <div>En cours: <span className="animate-bounce font-bold">{filteredCampaigns.filter(c => c.status === 'ACTIVE').length}</span></div>
                  <div>Terminées: <span className="animate-bounce font-bold">{filteredCampaigns.filter(c => c.status === 'COMPLETED').length}</span></div>
                  <div>En attente: <span className="animate-bounce font-bold">{filteredCampaigns.filter(c => c.status === 'PENDING').length}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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

      {/* Liste des campagnes */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Campagnes ({filteredCampaigns.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campagne
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project Manager
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Province
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ODD
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dates
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedCampaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{campaign.title}</div>
                      <div className="text-sm text-gray-500 max-w-xs truncate">{campaign.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(() => {
                      const allPMs: string[] = [];
                      if (campaign.publisher) {
                        allPMs.push(campaign.publisher.name);
                      }
                      const pmUsers = campaign.campaignUsers?.filter(u => u.role === 'PROJECT_MANAGER' && u.id !== campaign.publisher?.id) || [];
                      pmUsers.forEach(pm => allPMs.push(pm.name));
                      return allPMs.length > 0 
                        ? allPMs.join(', ')
                        : '-';
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {campaign.targetProvince ? campaign.targetProvince.replace(/_/g, ' ') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {campaign.selectedODD ? (
                      <div className="flex items-center">
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2"
                          style={{ backgroundColor: getODDColor(campaign.selectedODD) }}
                        >
                          {campaign.selectedODD}
                        </div>
                        <span className="text-sm text-gray-900">ODD {campaign.selectedODD}</span>
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(campaign.status)}`}>
                      {getStatusLabel(campaign.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      {campaign.startDate && (
                        <div>Début: {new Date(campaign.startDate).toLocaleDateString('fr-FR')}</div>
                      )}
                      {campaign.endDate && (
                        <div>Fin: {new Date(campaign.endDate).toLocaleDateString('fr-FR')}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => openAssignPMModal(campaign)}
                      className="text-purple-600 hover:text-purple-900 bg-purple-100 hover:bg-purple-200 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                    >
                      Assigner PM
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination - affichée même avec 1 page */}
        {filteredCampaigns.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages || 1}
              totalItems={filteredCampaigns.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              loading={loading}
            />
          </div>
        )}

        {filteredCampaigns.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune campagne</h3>
            <p className="mt-1 text-sm text-gray-500">
              Aucune campagne ne correspond aux filtres sélectionnés.
            </p>
          </div>
        )}
      </div>

      {/* Modal de création et assignation de PM */}
      {showAssignPMModal && selectedCampaignForPM && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4 my-8">
            <h2 className="text-xl font-semibold mb-4">
              Créer et assigner un Project Manager
            </h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Campagne: <span className="font-semibold">{selectedCampaignForPM.title}</span>
              </p>
              {(() => {
                const allPMs: Array<{id: string, name: string}> = [];
                if (selectedCampaignForPM.publisher) {
                  allPMs.push({ id: selectedCampaignForPM.publisher.id, name: selectedCampaignForPM.publisher.name });
                }
                const pmUsers = selectedCampaignForPM.campaignUsers?.filter(u => u.role === 'PROJECT_MANAGER' && u.id !== selectedCampaignForPM.publisher?.id) || [];
                pmUsers.forEach(pm => allPMs.push({ id: pm.id, name: pm.name }));
                return allPMs.length > 0 ? (
                  <p className="text-xs text-gray-500">
                    PM{allPMs.length > 1 ? 's' : ''} assigné{allPMs.length > 1 ? 's' : ''}: {allPMs.map(pm => pm.name).join(', ')}
                  </p>
                ) : null;
              })()}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); createAndAssignPMToCampaign(); }} className="space-y-4">
              {/* Nom */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom complet *
                </label>
                <input
                  type="text"
                  value={pmFormData.name}
                  onChange={(e) => setPmFormData({ ...pmFormData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    formErrors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={assigningPM}
                  placeholder="Nom et prénom"
                />
                {formErrors.name && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse email *
                </label>
                <input
                  type="email"
                  value={pmFormData.email}
                  onChange={(e) => setPmFormData({ ...pmFormData, email: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    formErrors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={assigningPM}
                  placeholder="email@example.com"
                />
                {formErrors.email && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
                )}
              </div>

              {/* Numéro de téléphone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro de téléphone *
                </label>
                <input
                  type="tel"
                  value={pmFormData.contact}
                  onChange={(e) => setPmFormData({ ...pmFormData, contact: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    formErrors.contact ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={assigningPM}
                  placeholder="+243 812 345 678"
                />
                {formErrors.contact && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.contact}</p>
                )}
              </div>

              {/* Mot de passe */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe *
                </label>
                <input
                  type="password"
                  value={pmFormData.password}
                  onChange={(e) => setPmFormData({ ...pmFormData, password: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    formErrors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={assigningPM}
                  placeholder="Minimum 6 caractères"
                />
                {formErrors.password && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.password}</p>
                )}
              </div>

              {/* Confirmation du mot de passe */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le mot de passe *
                </label>
                <input
                  type="password"
                  value={pmFormData.confirmPassword}
                  onChange={(e) => setPmFormData({ ...pmFormData, confirmPassword: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    formErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={assigningPM}
                  placeholder="Répétez le mot de passe"
                />
                {formErrors.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.confirmPassword}</p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignPMModal(false);
                    setSelectedCampaignForPM(null);
                    setPmFormData({
                      name: '',
                      email: '',
                      contact: '',
                      password: '',
                      confirmPassword: ''
                    });
                    setFormErrors({});
                  }}
                  disabled={assigningPM}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={assigningPM}
                  className="px-4 py-2 text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assigningPM ? 'Création...' : 'Créer et assigner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCampaignManagement;
