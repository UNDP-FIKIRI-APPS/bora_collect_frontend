import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { environment } from '../config/environment';
import { useNotification } from '../hooks/useNotification';
import NotificationContainer from '../components/NotificationContainer';
import Pagination from '../components/Pagination';
import enhancedApiService from '../services/enhancedApiService';
import { useDebounce } from '../hooks/useDebounce';
import { devLogger } from '../utils/logger';


interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  gender?: string;
  contact?: string;
  whatsapp?: string;
  province?: string;
  targetProvince?: string;
  city?: string;
  commune?: string;
  quartier?: string;
  campaignId?: string;
  campaign?: {
    id: string;
    title: string;
  };
  profilePhoto?: string;
  createdAt: string;
}

const AdminUserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasLoadedOnce = useRef(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [flippedCards, setFlippedCards] = useState<{ [key: string]: boolean }>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [filters, setFilters] = useState({
    gender: '',
    province: '',
    campaign: '',
    role: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 800);
  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const { notifications, showSuccess, showError, removeNotification } = useNotification();

  const GENDERS = [
    { value: 'MALE', label: 'Homme' },
    { value: 'FEMALE', label: 'Femme' },
    { value: 'OTHER', label: 'Autre' }
  ];

  const PROVINCES = [
    'BAS_UELE', 'EQUATEUR', 'HAUT_KATANGA', 'HAUT_LOMAMI', 'HAUT_UELE',
    'ITURI', 'KASAI', 'KASAI_CENTRAL', 'KASAI_ORIENTAL', 'KINSHASA',
    'KONGO_CENTRAL', 'KWANGO', 'KWILU', 'LOMAMI', 'LUALABA',
    'MAI_NDOMBE', 'MANIEMA', 'MONGALA', 'NORD_KIVU', 'NORD_UBANGI',
    'SANKURU', 'SUD_KIVU', 'SUD_UBANGI', 'TANGANYIKA', 'TSHOPO', 'TSHUAPA'
  ];

  const ROLES = [
    { value: 'ANALYST', label: 'Project Manager' },
    { value: 'CONTROLLER', label: 'Enquêteur' },
    { value: 'ANALYST', label: 'Analyste' }
  ];

  // Les filtres sont maintenant appliqués côté serveur, donc on utilise directement users
  // Plus besoin de filtrer côté client
  const filteredUsers = users;
  const paginatedUsers = users; // Les données sont déjà paginées côté serveur

  const fetchUsers = useCallback(async (page: number = currentPage) => {
    if (!hasLoadedOnce.current) {
      setInitialLoading(true);
    } else {
      setIsRefreshing(true);
    }
    try {
      // Construire les paramètres de requête avec filtres
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString()
      });
      
      if (debouncedSearchTerm.trim()) {
        params.append('search', debouncedSearchTerm.trim());
      }
      if (filters.gender) {
        params.append('gender', filters.gender);
      }
      if (filters.province) {
        params.append('province', filters.province);
      }
      if (filters.campaign) {
        params.append('campaign', filters.campaign);
      }
      if (filters.role) {
        params.append('role', filters.role);
      }

      // Utilisation du nouveau service API avec filtres côté serveur
      const responseData = await enhancedApiService.get<any>(`/users?${params.toString()}`, {
        skipCache: true, // Forcer le refresh pour les données critiques
      });
      
      // Extraire les données et pagination
      const usersArray = Array.isArray(responseData) 
        ? responseData 
        : (responseData?.data || []);
      
      const pagination = responseData?.pagination;
      
      if (pagination) {
        setTotalUsers(pagination.total || usersArray.length);
        setTotalPages(pagination.totalPages || Math.ceil((pagination.total || usersArray.length) / pageSize));
        setCurrentPage(pagination.page || page);
      } else {
        setTotalUsers(usersArray.length);
        setTotalPages(Math.ceil(usersArray.length / pageSize));
        setCurrentPage(page);
      }

      setUsers(usersArray);
      devLogger.log(`✅ ${usersArray.length} utilisateurs chargés (page ${page}/${pagination?.totalPages || 1})`);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      setUsers([]);
    } finally {
      setInitialLoading(false);
      setIsRefreshing(false);
      hasLoadedOnce.current = true;
    }
  }, [pageSize, debouncedSearchTerm, filters]);

  const fetchCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    try {
      // Utilisation du nouveau service API
      const responseData = await enhancedApiService.get<any>('/surveys/admin');
      
      // L'API peut retourner un objet avec { data: [...], pagination: {...} } ou directement un tableau
      const campaignsArray = Array.isArray(responseData) 
        ? responseData 
        : (responseData?.data || []);
      devLogger.log('🔍 AdminUserManagement - Campagnes reçues:', campaignsArray);
      setCampaigns(campaignsArray);
    } catch (error) {
      console.error('Erreur lors du chargement des campagnes:', error);
      setCampaigns([]);
    } finally {
      setLoadingCampaigns(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
    fetchUsers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchCampaigns]);

  const skipFilterEffect = useRef(true);
  useEffect(() => {
    if (skipFilterEffect.current) {
      skipFilterEffect.current = false;
      return;
    }
    setCurrentPage(1);
    fetchUsers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm, filters.gender, filters.province, filters.campaign, filters.role]);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    // Le useEffect se chargera de recharger les données
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const clearFilters = () => {
    setFilters({
      gender: '',
      province: '',
      campaign: '',
      role: ''
    });
  };

  // Fonction pour gérer le retournement des cartes
  const toggleCardFlip = (cardId: string) => {
    setFlippedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  // Fonction pour supprimer un utilisateur
  const handleDeleteUser = async (userId: string) => {
    setActionLoading(true);
    try {
      // Utilisation du nouveau service API
      await enhancedApiService.delete(`/users/${userId}`);

      // Recharger la liste des utilisateurs
      await fetchUsers();
      setConfirmDeleteId(null);
      showSuccess('Utilisateur supprimé avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      showError('Erreur de connexion lors de la suppression de l\'utilisateur');
    } finally {
      setActionLoading(false);
    }
  };

  // Fonction pour réinitialiser le mot de passe
  const handleResetPassword = async (userId: string) => {
    if (newPassword !== confirmPassword) {
      showError('Les mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 6) {
      showError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setActionLoading(true);
    try {
      // Utilisation du nouveau service API
      await enhancedApiService.put(`/users/${userId}/reset-password`, {
        password: newPassword
      });

      setResetPasswordId(null);
      setNewPassword('');
      setConfirmPassword('');
      showSuccess('Mot de passe réinitialisé avec succès');
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
      showError('Erreur de connexion lors de la réinitialisation du mot de passe');
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'PROJECT_MANAGER': return 'Project Manager';
      case 'CONTROLLER': return 'Enquêteur';
      case 'ANALYST': return 'Analyste';
      case 'ADMIN': return 'Administrateur';
      default: return role;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Actif';
      case 'PENDING_APPROVAL': return 'En attente';
      case 'REJECTED': return 'Rejeté';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'PENDING_APPROVAL': return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderLocation = (user: User) => {
    const hasProvince = !!user.province;
    const hasCity = !!user.city;
    const hasCommune = !!user.commune;
    const hasQuartier = !!user.quartier;

    if (!hasProvince && !hasCity && !hasCommune && !hasQuartier) {
      return <span className="text-gray-400 text-sm">Non renseigné</span>;
    }

    return (
      <div className="text-xs text-gray-600 space-y-1">
        {hasProvince && (
          <div className="flex items-center gap-1">
            <span className="text-blue-500">•</span>
            <span className="font-medium">{user.province?.replace(/_/g, ' ')}</span>
          </div>
        )}
        {hasCity && (
          <div className="flex items-center gap-1">
            <span className="text-blue-500">•</span>
            <span>{user.city}</span>
          </div>
        )}
        {hasCommune && (
          <div className="flex items-center gap-1">
            <span className="text-blue-500">•</span>
            <span>{user.commune}</span>
          </div>
        )}
        {hasQuartier && (
          <div className="flex items-center gap-1">
            <span className="text-blue-500">•</span>
            <span>{user.quartier}</span>
          </div>
        )}
      </div>
    );
  };

  const formatCSVValue = (value: any) => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value).replace(/"/g, '""');
    return `"${stringValue}"`;
  };

  const handleExportCSV = () => {
    if (filteredUsers.length === 0) {
      showError('Aucun utilisateur à exporter');
      return;
    }

    const headers = [
      'Nom',
      'Email',
      'Rôle',
      'Statut',
      'Genre',
      'Contact',
      'WhatsApp',
      'Province',
      'Ville',
      'Commune',
      'Quartier',
      'Campagne',
      'Date inscription'
    ];

    const rows = filteredUsers.map((user) => [
      user.name || '',
      user.email || '',
      getRoleLabel(user.role),
      getStatusLabel(user.status),
      user.gender ? (user.gender === 'MALE' ? 'Homme' : user.gender === 'FEMALE' ? 'Femme' : 'Autre') : '',
      user.contact || '',
      user.whatsapp || '',
      user.province ? user.province.replace(/_/g, ' ') : '',
      user.city || '',
      user.commune || '',
      user.quartier || '',
      user.campaign?.title || '',
      user.createdAt ? new Date(user.createdAt).toLocaleString('fr-FR') : ''
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map(formatCSVValue).join(';'))
      .join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `utilisateurs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    showSuccess('Export CSV généré avec succès');
  };

  if (initialLoading) {
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
            onChange={handleSearchChange}
            placeholder="Rechercher par nom, email, contact, localisation, campagne, rôle..."
            className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          {isRefreshing && (
            <div className="absolute inset-y-0 right-10 flex items-center pointer-events-none">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
            </div>
          )}
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Genre
            </label>
            <select
              value={filters.gender}
              onChange={(e) => handleFilterChange('gender', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les genres</option>
              {GENDERS.map(gender => (
                <option key={gender.value} value={gender.value}>
                  {gender.label}
                </option>
              ))}
            </select>
          </div>

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
              Campagne
            </label>
            <select
              value={filters.campaign}
              onChange={(e) => handleFilterChange('campaign', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loadingCampaigns}
            >
              <option value="">Toutes les campagnes</option>
              {campaigns.map(campaign => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.title}
                </option>
              ))}
            </select>
            {loadingCampaigns && (
              <div className="text-xs text-gray-500 mt-1">Chargement des campagnes...</div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rôle
            </label>
            <select
              value={filters.role}
              onChange={(e) => handleFilterChange('role', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les rôles</option>
              <option value="PROJECT_MANAGER">Project Manager</option>
              <option value="CONTROLLER">Enquêteur</option>
              <option value="ANALYST">Analyste</option>
              <option value="ADMIN">Administrateur</option>
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

      {/* Compteur Utilisateurs avec effet de retournement - Style PM */}
      <div className="flex justify-center">
        <div 
          className="relative w-full max-w-sm h-32 cursor-pointer perspective-1000 hover:scale-105 transition-transform duration-300"
          onClick={() => toggleCardFlip('totalUsers')}
        >
          <div className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
            flippedCards.totalUsers ? 'rotate-y-180' : ''
          }`}>
            {/* Recto */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow duration-300">
              <div className="text-center text-white">
                <div className="mb-2 hover:scale-110 transition-transform duration-200 relative">
                  <div className="absolute inset-0 bg-white opacity-20 rounded-full blur-sm"></div>
                  <svg className="w-8 h-8 mx-auto relative z-10 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
                <div className="text-sm font-semibold">Total Utilisateurs</div>
                <div className="text-xs opacity-80 mt-1 animate-pulse">Cliquez pour voir</div>
              </div>
            </div>
            {/* Verso */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg flex items-center justify-center rotate-y-180">
              <div className="text-center text-white">
                <div className="text-3xl font-bold mb-2">
                  <span className="animate-bounce hover:animate-pulse transition-all duration-300 hover:scale-110 hover:text-yellow-200">
                    {filteredUsers.length}
                  </span>
                </div>
                <div className="text-xs space-y-1">
                  <div>Actifs: <span className="animate-bounce font-bold">{filteredUsers.filter(u => u.status === 'ACTIVE').length}</span></div>
                  <div>En attente: <span className="animate-bounce font-bold">{filteredUsers.filter(u => u.status === 'PENDING_APPROVAL').length}</span></div>
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

      {/* Liste des utilisateurs */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">
            Utilisateurs ({filteredUsers.length})
          </h2>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v13a1 1 0 001 1h14a1 1 0 001-1V7M12 3v12m0 0l-4-4m4 4l4-4" />
            </svg>
            Exporter en CSV
          </button>
        </div>

        <div className={`overflow-x-auto transition-opacity duration-200 ${isRefreshing ? 'opacity-60 pointer-events-none' : ''}`}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Genre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Province
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Localisation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date d'inscription
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {/* Photo de profil */}
                      <div className="flex-shrink-0 h-10 w-10 mr-3">
                        {user.profilePhoto ? (
                          <img 
                            src={`${environment.apiBaseUrl}${user.profilePhoto}`} 
                            alt={`Photo de ${user.name}`} 
                            className="h-10 w-10 rounded-full object-cover shadow-md"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center shadow-md">
                            <span className="text-gray-600 font-medium text-sm">
                              {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Informations utilisateur */}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      {user.contact && <div className="font-medium">{user.contact}</div>}
                      {user.whatsapp && <div className="text-gray-500">{user.whatsapp}</div>}
                      {!user.contact && !user.whatsapp && <span className="text-gray-400">Non renseigné</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.gender === 'MALE' ? 'Homme' : 
                     user.gender === 'FEMALE' ? 'Femme' : 
                     user.gender === 'OTHER' ? 'Autre' : 'Non renseigné'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getRoleLabel(user.role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.province ? user.province.replace(/_/g, ' ') : 'Non renseigné'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {renderLocation(user)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                      {getStatusLabel(user.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setResetPasswordId(user.id)}
                        className="text-blue-600 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded-md text-xs font-medium transition-colors"
                      >
                        Réinitialiser mot de passe
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(user.id)}
                        className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-2 py-1 rounded-md text-xs font-medium transition-colors"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun utilisateur</h3>
            <p className="mt-1 text-sm text-gray-500">
              Aucun utilisateur ne correspond aux filtres sélectionnés.
            </p>
          </div>
        )}
        
        {/* Pagination - affichée même avec 1 page */}
        {filteredUsers.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages || 1}
              totalItems={totalUsers || filteredUsers.length}
              pageSize={pageSize}
              onPageChange={(page) => {
                setCurrentPage(page);
                fetchUsers(page);
              }}
              loading={isRefreshing}
            />
          </div>
        )}
      </div>

      {/* Modal de confirmation de suppression */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirmer la suppression</h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                disabled={actionLoading}
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteUser(confirmDeleteId)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                disabled={actionLoading}
              >
                {actionLoading ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de réinitialisation de mot de passe */}
      {resetPasswordId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Réinitialiser le mot de passe</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Entrez le nouveau mot de passe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Confirmez le nouveau mot de passe"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setResetPasswordId(null);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                disabled={actionLoading}
              >
                Annuler
              </button>
              <button
                onClick={() => handleResetPassword(resetPasswordId)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={actionLoading}
              >
                {actionLoading ? 'Réinitialisation...' : 'Réinitialiser'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Container pour les notifications */}
      <NotificationContainer 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
    </div>
  );
};

export default AdminUserManagement;
