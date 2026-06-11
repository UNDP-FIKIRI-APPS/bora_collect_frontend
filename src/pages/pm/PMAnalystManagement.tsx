import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import enhancedApiService from '../../services/enhancedApiService';
import { environment } from '../../config/environment';
import UserCreationForm from '../../components/UserCreationForm';
import { devLogger } from '../../utils/logger';


interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  contact?: string;
  province?: string;
  city?: string;
  commune?: string;
  quartier?: string;
  whatsapp?: string;
  gender?: string;
  profilePhoto?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING_APPROVAL';
  createdAt: string;
  surveyApplications?: Array<{
    id: string;
    status: string;
    appliedAt: string;
    survey: {
      id: string;
      title: string;
    };
  }>;
}


const PMAnalystManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  
  // États pour les filtres et la recherche
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('');

  // Charger les campagnes disponibles
  const fetchCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const campaignsData = await enhancedApiService.get<any[]>('/users/campaigns', { skipCache: true });
      setCampaigns(campaignsData);
    } catch (error) {
      console.error('Erreur lors du chargement des campagnes:', error);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  // Fonction de filtrage
  const applyFilters = () => {
    let filtered = users;

    // Filtre par nom
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtre par sexe
    if (selectedGender) {
      filtered = filtered.filter(user => user.gender === selectedGender);
    }

    // Filtre par province
    if (selectedProvince) {
      filtered = filtered.filter(user => user.province === selectedProvince);
    }

    // Filtre par campagne
    if (selectedCampaign) {
      filtered = filtered.filter(user => 
        user.surveyApplications?.some(app => app.survey.id === selectedCampaign)
      );
    }

    setFilteredUsers(filtered);
  };

  // Appliquer les filtres quand les données ou les filtres changent
  useEffect(() => {
    applyFilters();
  }, [users, searchTerm, selectedGender, selectedProvince, selectedCampaign]);

  useEffect(() => {
    fetchUsers();
    fetchCampaigns();
  }, []);

  // Écouter les événements d'approbation d'enquêteurs
  useEffect(() => {
    const handleEnumeratorApproved = () => {
      devLogger.log('🔄 Événement enumeratorApproved reçu - rechargement des utilisateurs');
      fetchUsers();
    };

    window.addEventListener('enumeratorApproved', handleEnumeratorApproved);
    
    return () => {
      window.removeEventListener('enumeratorApproved', handleEnumeratorApproved);
    };
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const approvedUsers = await enhancedApiService.get<any[]>('/users/pm-approved-enumerators', {
        skipCache: true,
        skipToast: true,
      });
      setUsers(approvedUsers);
    } catch (error: any) {
      devLogger.log('❌ Erreur de connexion au serveur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: any) => {
    try {
      setSubmitting(true);
      
      // Préparation des données avec le rôle sélectionné
      const cleanData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role, // Utiliser le rôle sélectionné dans le formulaire
        contact: formData.contact?.trim() || undefined,
        province: formData.province || undefined,
        city: formData.city || undefined,
        commune: formData.commune || undefined,
        quartier: formData.quartier || undefined,
        campaignId: formData.campaignId || undefined
      };

      // Envoi de la requête selon le rôle
      let endpoint = '';
      if (formData.role === 'ANALYST') {
        endpoint = '/users/pm-create-analyst';
      } else if (formData.role === 'CONTROLLER') {
        endpoint = '/users/pm-create-enumerator';
      } else {
        throw new Error('Rôle non supporté pour la création par PM');
      }

      await enhancedApiService.post(endpoint, cleanData);

      const roleLabel = formData.role === 'CONTROLLER' ? 'Enquêteur' : 'Analyste';
      toast.success(`${roleLabel} créé avec succès !`);
      
      // Fermer le formulaire et recharger les données
      setShowCreateForm(false);
      await fetchUsers();
      
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la création de l\'utilisateur');
      throw error; // Re-throw pour que le composant UserCreationForm puisse gérer l'erreur
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveFromCampaign = async (userId: string, surveyId: string, surveyTitle: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir retirer cet enquêteur de la campagne "${surveyTitle}" ?`)) {
      return;
    }

    try {
      setSubmitting(true);
      await enhancedApiService.post(`/users/${userId}/remove-from-campaign`, { surveyId });
      toast.success('Enquêteur retiré de la campagne avec succès');
      fetchUsers();
    } catch (error) {
      console.error('Erreur lors du retrait:', error);
      toast.error('Erreur lors du retrait de l\'enquêteur de la campagne');
    } finally {
      setSubmitting(false);
    }
  };


  const toggleAnalystStatus = async (analystId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await enhancedApiService.post(`/users/${analystId}/toggle-status`, { status: newStatus });
      toast.success(`Utilisateur ${newStatus === 'ACTIVE' ? 'activé' : 'désactivé'} avec succès !`);
      await fetchUsers();
    } catch (error: any) {
      toast.error(error?.message || 'Erreur de connexion au serveur');
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Actif';
      case 'INACTIVE': return 'Inactif';
      case 'PENDING_APPROVAL': return 'En attente';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'INACTIVE': return 'bg-red-100 text-red-800';
      case 'PENDING_APPROVAL': return 'bg-yellow-100 text-yellow-800';
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

  // Obtenir les options de sexe
  const getGenderOptions = () => [
    { value: 'MALE', label: 'Homme' },
    { value: 'FEMALE', label: 'Femme' },
    { value: 'OTHER', label: 'Autre' }
  ];

  // Réinitialiser les filtres
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedGender('');
    setSelectedProvince('');
    setSelectedCampaign('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des utilisateurs...</p>
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
            Gestion des Enquêteurs Approuvés
          </h1>
          <p className="text-gray-600">
            Gérez les enquêteurs approuvés pour vos campagnes
          </p>
        </div>

        {/* Bouton de création */}
        <div className="mb-6">
          <button
            onClick={() => setShowCreateForm(true)}
            disabled={submitting}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Ajouter un Utilisateur
          </button>
        </div>

        {/* Filtres et recherche */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Recherche par nom */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rechercher par nom
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nom ou email..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtre par sexe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sexe
              </label>
              <select
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tous les sexes</option>
                {getGenderOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

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

            {/* Filtre par campagne */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campagne
              </label>
              <select
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Toutes les campagnes</option>
                {campaigns.map((campaign: any) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.title}
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

        {/* Formulaire de création */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <UserCreationForm
              onSubmit={handleSubmit}
              onCancel={() => setShowCreateForm(false)}
              isLoading={submitting}
              title="Créer un nouvel Utilisateur"
              showRoleSelection={true}
              campaigns={campaigns}
              loadingCampaigns={loadingCampaigns}
            />
          </div>
        )}

        {/* Liste des utilisateurs */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Enquêteurs Approuvés ({filteredUsers.length} sur {users.length})
            </h2>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {users.length === 0 ? 'Aucun enquêteur approuvé' : 'Aucun résultat trouvé'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {users.length === 0 
                  ? 'Les enquêteurs approuvés pour vos campagnes apparaîtront ici.'
                  : 'Essayez de modifier vos critères de recherche ou de filtrage.'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilisateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact complet
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Genre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Localisation complète
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campagnes assignées
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
                  {filteredUsers.map((user) => (
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
                            <div className="text-xs text-gray-400">
                              {user.role === 'CONTROLLER' ? 'Enquêteur' : 'Analyste'}
                            </div>
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
                        <div>
                          {user.province && <div className="font-medium">{user.province.replace(/_/g, ' ')}</div>}
                          {user.city && <div className="text-gray-600">{user.city}</div>}
                          {user.commune && <div className="text-gray-500">{user.commune}</div>}
                          {user.quartier && <div className="text-gray-400 text-xs">{user.quartier}</div>}
                          {!user.province && !user.city && !user.commune && !user.quartier && 
                            <span className="text-gray-400">Non renseigné</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.surveyApplications && user.surveyApplications.length > 0 ? (
                          <div>
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                          {getStatusLabel(user.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {user.surveyApplications && user.surveyApplications.length > 0 && (
                            user.surveyApplications.map((app: any) => (
                              <button
                                key={app.id}
                                onClick={() => handleRemoveFromCampaign(user.id, app.survey.id, app.survey.title)}
                                disabled={submitting}
                                className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-2 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
                              >
                                Retirer
                              </button>
                            ))
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
      </div>
    </div>
  );
};

export default PMAnalystManagement;
