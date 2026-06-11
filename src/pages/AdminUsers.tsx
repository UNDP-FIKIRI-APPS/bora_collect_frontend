import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import ConfirmModal from '../components/ConfirmModal';
import UserCreationForm from '../components/UserCreationForm';
import enhancedApiService from '../services/enhancedApiService';
import { environment } from '../config/environment';
import { useDebounce } from '../hooks/useDebounce';

// Rôles disponibles pour l'admin (seulement Project Managers)
const roles = [
  { value: 'ANALYST', label: 'Project Manager' },
];

// Options pour le sexe
const genderOptions = [
  { value: 'MALE', label: 'Masculin' },
  { value: 'FEMALE', label: 'Féminin' },
  { value: 'OTHER', label: 'Autre' },
];

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  gender?: string;
  profilePictureUrl?: string;
  profilePhoto?: string;
  status: string;
}

const USERS_PER_PAGE = 10;

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [addError, setAddError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editRoleId, setEditRoleId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('CONTROLLER');
  const [roleSaving, setRoleSaving] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showReset, setShowReset] = useState<string | null>(null);
  const [resetPwd, setResetPwd] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSaving, setResetSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Charger seulement les Project Managers
  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const allUsers = await enhancedApiService.get<any[]>('/users', { skipCache: true });
      // Filtrer seulement les Project Managers (ANALYST)
      const pmUsers = allUsers.filter((user: any) => user.role === 'ANALYST');
      setUsers(pmUsers);
    } catch (err: any) {
      setError(err.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    fetchUsers();
    fetchCampaigns();
  }, []);

  // Ajouter un Project Manager
  const handleAdd = async (formData: any) => {
    setAddError('');
    setSaving(true);
    try {
      // Forcer le rôle ANALYST (Project Manager) pour l'admin
      const pmData = {
        ...formData,
        role: 'ANALYST'
      };
      
      await enhancedApiService.post('/users', pmData);
      setShowAdd(false);
      fetchUsers();
    } catch (err: any) {
      setAddError(err.message || 'Erreur inconnue');
      throw err; // Re-throw pour que le composant UserCreationForm puisse gérer l'erreur
    } finally {
      setSaving(false);
    }
  };

  // Supprimer un utilisateur
  const handleDelete = async (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    setLoading(true);
    try {
      await enhancedApiService.delete(`/users/${confirmDeleteId}`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
      setConfirmDeleteId(null);
    }
  };

  // Modifier le rôle d'un utilisateur
  const handleEditRole = async () => {
    if (!editRoleId) return;
    setRoleSaving(true);
    try {
      await enhancedApiService.patch(`/users/${editRoleId}`, { role: editRole });
      setEditRoleId(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Erreur inconnue');
    } finally {
      setRoleSaving(false);
    }
  };

  // Réinitialiser le mot de passe
  const handleResetPwd = async () => {
    if (!showReset) return;
    if (!resetPwd || resetPwd.length < 6) {
      setResetError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setResetSaving(true);
    setResetError('');
    try {
      await enhancedApiService.put(`/users/${showReset}/reset-password`, { password: resetPwd });
      setShowReset(null);
      setResetPwd('');
      setResetError('');
      toast.success('Mot de passe réinitialisé avec succès', {
        autoClose: 3000,
        position: 'top-right'
      });
      fetchUsers();
    } catch (err: any) {
      setResetError(err.message || 'Erreur inconnue');
    } finally {
      setResetSaving(false);
    }
  };

  // Handlers optimisés avec useCallback pour éviter les re-renders
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const handleFilterStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterStatus(e.target.value);
  }, []);

  // Recherche et pagination avec debounce - Utiliser useMemo pour éviter les re-renders inutiles
  const filtered = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = !debouncedSearch || 
        u.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesStatus = !filterStatus || u.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [users, debouncedSearch, filterStatus]);
  
  const totalPages = useMemo(() => Math.ceil(filtered.length / USERS_PER_PAGE), [filtered.length]);
  const paginated = useMemo(() => {
    return filtered.slice((page - 1) * USERS_PER_PAGE, page * USERS_PER_PAGE);
  }, [filtered, page]);

  // Réactiver un utilisateur
  const handleReactivate = async (id: string) => {
    setLoading(true);
    try {
      await enhancedApiService.patch(`/users/${id}`, { status: 'ACTIVE' });
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto bg-white p-4 sm:p-8 rounded-xl shadow-lg mt-4 sm:mt-8 mx-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Gestion des Project Managers</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm sm:text-base transition-colors"
        >
          + Ajouter un Project Manager
        </button>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="mb-6 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={search}
            onChange={handleSearchChange}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterStatus}
            onChange={handleFilterStatusChange}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tous les statuts</option>
            <option value="ACTIVE">Actif</option>
            <option value="INACTIVE">Inactif</option>
            <option value="PENDING_APPROVAL">En attente</option>
          </select>
        </div>
        <div className="text-sm text-gray-600">
          {filtered.length} Project Manager(s) trouvé(s)
        </div>
      </div>

      {/* Tableau responsive */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sexe</th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginated.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-3 sm:px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {user.profilePhoto ? (
                      <img 
                        src={`${environment.apiBaseUrl}${user.profilePhoto}`} 
                        alt={`Photo de ${user.name}`} 
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover shadow-md"
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm sm:text-base shadow-md">
                        {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="ml-3">
                      <div className="text-sm sm:text-base font-medium text-gray-900">{user.name}</div>
                      <div className="text-xs sm:text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-sm sm:text-base text-gray-900">
                  {user.gender || 'N/A'}
                </td>
                <td className="px-3 sm:px-4 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                    user.role === 'CONTROLLER' ? 'bg-green-100 text-green-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role === 'ADMIN' ? 'Admin' :
                     user.role === 'CONTROLLER' ? 'Enquêteur' :
                     user.role === 'ANALYST' ? 'Analyste' : user.role}
                  </span>
                </td>
                <td className="px-3 sm:px-4 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                    user.status === 'INACTIVE' ? 'bg-gray-100 text-gray-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {user.status === 'ACTIVE' ? 'Actif' :
                     user.status === 'INACTIVE' ? 'Inactif' :
                     user.status === 'PENDING_APPROVAL' ? 'En attente' : user.status}
                  </span>
                </td>
                <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-sm sm:text-base font-medium">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => setEditRoleId(user.id)}
                      className="text-blue-600 hover:text-blue-900 text-xs sm:text-sm"
                    >
                      Modifier le rôle
                    </button>
                    <button
                      onClick={() => setShowReset(user.id)}
                      className="text-green-600 hover:text-green-900 text-xs sm:text-sm"
                    >
                      Réinitialiser le mot de passe
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(user.id)}
                      className="text-red-600 hover:text-red-900 text-xs sm:text-sm"
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

      {/* Pagination responsive */}
      {users.length > USERS_PER_PAGE && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-700">
            Affichage de {((page - 1) * USERS_PER_PAGE) + 1} à {Math.min(page * USERS_PER_PAGE, users.length)} sur {users.length} utilisateurs
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Précédent
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page * USERS_PER_PAGE >= users.length}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
      {/* Modal ajout utilisateur */}
      {showAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-2xl w-full relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowAdd(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold transition-colors">&times;</button>
            <UserCreationForm
              onSubmit={handleAdd}
              onCancel={() => setShowAdd(false)}
              isLoading={saving}
              title="Ajouter un Project Manager"
              showRoleSelection={false}
              defaultRole="ANALYST"
              campaigns={campaigns}
              loadingCampaigns={loadingCampaigns}
            />
          </div>
        </div>
      )}
      {/* Modal réinitialisation mot de passe */}
      {showReset && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full relative">
            <button onClick={() => setShowReset(null)} className="absolute top-2 right-2 text-gray-500 text-2xl">&times;</button>
            <h3 className="text-xl font-bold mb-4">Réinitialiser le mot de passe</h3>
            <div className="mb-4">Saisissez le nouveau mot de passe pour cet utilisateur.</div>
            <input type="password" value={resetPwd} onChange={e => setResetPwd(e.target.value)} className="w-full border rounded p-2 mb-2" minLength={6} placeholder="Nouveau mot de passe" />
            {resetError && <div className="text-red-600 text-center mb-2">{resetError}</div>}
            <button onClick={handleResetPwd} className="bg-blue-600 text-white px-4 py-2 rounded shadow w-full" disabled={resetSaving || resetPwd.length < 6}>{resetSaving ? 'Réinitialisation...' : 'Réinitialiser'}</button>
          </div>
        </div>
      )}
      {/* Modal confirmation suppression */}
      <ConfirmModal
        show={!!confirmDeleteId}
        message="Voulez-vous vraiment supprimer cet utilisateur ? Cette action est irréversible."
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
        confirmText="Supprimer"
        cancelText="Annuler"
      />
    </div>
  );
} 
