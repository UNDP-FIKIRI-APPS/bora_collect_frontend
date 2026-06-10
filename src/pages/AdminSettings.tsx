import React, { useState, useEffect } from 'react';
import { environment } from '../config/environment';
import { getCitiesByProvince, getCommunesByCity } from '../data/citiesData';
import { getQuartiersByCommune } from '../data/quartiersData';

const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    email: '',
    name: '',
    whatsapp: '',
    gender: '',
    contact: '',
    province: '',
    city: '',
    commune: '',
    quartier: '',
    organization: '',
    campaignDescription: '',
    targetProvince: '',
    campaignDuration: '',
    selectedODD: '',
    numberOfEnumerators: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [customQuartier, setCustomQuartier] = useState('');
  const [showCustomQuartier, setShowCustomQuartier] = useState(false);
  const [photoDeletedLocally, setPhotoDeletedLocally] = useState(false);
  const [activeCampaigns, setActiveCampaigns] = useState<
    Array<{ id: string; title: string; endDate?: string | null }>
  >([]);
  const [purgeCampaignId, setPurgeCampaignId] = useState('');
  const [purgingData, setPurgingData] = useState(false);

  // Charger les données utilisateur au montage du composant
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${environment.apiBaseUrl}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData.user);
          setProfilePhoto(userData.user.profilePhoto || null);
          setSettings(prev => ({
            ...prev,
            email: userData.user.email || '',
            name: userData.user.name || '',
            whatsapp: userData.user.whatsapp || '',
            gender: userData.user.gender || '',
            contact: userData.user.contact || '',
            province: userData.user.province || '',
            city: userData.user.city || '',
            commune: userData.user.commune || '',
            quartier: userData.user.quartier || '',
            organization: userData.user.organization || '',
            campaignDescription: userData.user.campaignDescription || '',
            targetProvince: userData.user.targetProvince || '',
            campaignDuration: userData.user.campaignDuration || '',
            selectedODD: userData.user.selectedODD || '',
            numberOfEnumerators: userData.user.numberOfEnumerators || ''
          }));
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données utilisateur:', error);
      }
    };

    loadUserData();
  }, []);

  useEffect(() => {
    const loadActiveCampaigns = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${environment.apiBaseUrl}/surveys/admin`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) return;

        const surveys = await response.json();
        const now = Date.now();
        const ongoing = (Array.isArray(surveys) ? surveys : []).filter((survey: any) => {
          if (survey.status !== 'PUBLISHED') return false;
          if (!survey.endDate) return true;
          return new Date(survey.endDate).getTime() >= now;
        });
        setActiveCampaigns(
          ongoing.map((survey: any) => ({
            id: survey.id,
            title: survey.title,
            endDate: survey.endDate,
          })),
        );
      } catch (error) {
        console.error('Erreur chargement campagnes actives:', error);
      }
    };

    loadActiveCampaigns();
  }, []);

  const handlePurgeCampaignData = async () => {
    if (!purgeCampaignId) return;

    const selected = activeCampaigns.find((campaign) => campaign.id === purgeCampaignId);
    const confirmed = window.confirm(
      `Supprimer toutes les données collectées pour « ${selected?.title || 'cette campagne'} » ?\n\n` +
        'Cette action efface les soumissions enquêteurs et formulaires publics. La campagne et ses formulaires seront conservés.',
    );
    if (!confirmed) return;

    setPurgingData(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${environment.apiBaseUrl}/surveys/${purgeCampaignId}/purge-data`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Échec de la suppression des données');
      }

      setMessage(
        `${result.message} (${result.recordsDeleted} enquêtes, ${result.publicSubmissionsDeleted} soumissions publiques supprimées)`,
      );
      setMessageType('success');
      setPurgeCampaignId('');
    } catch (error: any) {
      setMessage(error.message || 'Erreur lors de la suppression des données');
      setMessageType('error');
    } finally {
      setPurgingData(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'province') {
      // Réinitialiser ville et commune quand la province change
      setSettings(prev => ({
        ...prev,
        province: value,
        city: '',
        commune: '',
        quartier: ''
      }));
    } else if (name === 'city') {
      // Réinitialiser commune et quartier quand la ville change
      setSettings(prev => ({
        ...prev,
        city: value,
        commune: '',
        quartier: ''
      }));
      setShowCustomQuartier(false);
      setCustomQuartier('');
    } else if (name === 'commune') {
      // Réinitialiser quartier quand la commune change
      setSettings(prev => ({
        ...prev,
        commune: value,
        quartier: ''
      }));
      setShowCustomQuartier(false);
      setCustomQuartier('');
    } else if (name === 'quartier') {
      if (value === 'CUSTOM') {
        setShowCustomQuartier(true);
        setSettings(prev => ({
          ...prev,
          quartier: ''
        }));
      } else {
        setShowCustomQuartier(false);
        setCustomQuartier('');
        setSettings(prev => ({
          ...prev,
          quartier: value
        }));
      }
    } else {
      setSettings(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.match(/^image\/(jpg|jpeg|png|gif)$/)) {
      setMessage('Seuls les fichiers image (JPG, PNG, GIF) sont autorisés');
      setMessageType('error');
      return;
    }

    // Vérifier la taille du fichier (1MB max)
    if (file.size > 1 * 1024 * 1024) {
      setMessage('La taille du fichier ne doit pas dépasser 1MB');
      setMessageType('error');
      return;
    }

    setUploadingPhoto(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${environment.apiBaseUrl}/upload/profile-photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setProfilePhoto(result.photoUrl);
        setMessage('Photo de profil mise à jour avec succès');
        setMessageType('success');
        
        // Mettre à jour les données utilisateur dans localStorage
        const updatedUser = { ...user, profilePhoto: result.photoUrl };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        
        // Déclencher l'événement pour mettre à jour l'interface
        window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: updatedUser }));
      } else {
        const error = await response.json();
        setMessage(error.message || 'Erreur lors de l\'upload de la photo');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Erreur de connexion lors de l\'upload');
      setMessageType('error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${environment.apiBaseUrl}/upload/profile-photo`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setProfilePhoto(null);
        setMessage('Photo de profil supprimée avec succès');
        setMessageType('success');
        
        // Mettre à jour les données utilisateur dans localStorage
        const updatedUser = { ...user, profilePhoto: null };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        
        // Dispatcher l'événement pour mettre à jour les autres composants
        window.dispatchEvent(new CustomEvent('userProfileUpdated', { 
          detail: { user: updatedUser } 
        }));
      } else {
        const error = await response.json();
        setMessage(error.message || 'Erreur lors de la suppression de la photo');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      setMessage('Erreur lors de la suppression de la photo');
      setMessageType('error');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (settings.newPassword !== settings.confirmPassword) {
      setMessage('Les mots de passe ne correspondent pas');
      setMessageType('error');
      setLoading(false);
      return;
    }

    if (settings.newPassword.length < 6) {
      setMessage('Le nouveau mot de passe doit contenir au moins 6 caractères');
      setMessageType('error');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${environment.apiBaseUrl}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: settings.currentPassword,
          newPassword: settings.newPassword
        })
      });

      if (response.ok) {
        setMessage('Mot de passe modifié avec succès');
        setMessageType('success');
        setSettings(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        const errorData = await response.json();
        setMessage(errorData.message || 'Erreur lors de la modification du mot de passe');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Erreur de connexion au serveur');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${environment.apiBaseUrl}/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: settings.name,
          email: settings.email,
          whatsapp: settings.whatsapp,
          gender: settings.gender || undefined,
          contact: settings.contact || undefined,
          province: settings.province || undefined,
          city: settings.city || undefined,
          commune: settings.commune || undefined,
          quartier: showCustomQuartier ? customQuartier : (settings.quartier || undefined),
          organization: settings.organization || undefined,
          campaignDescription: settings.campaignDescription || undefined,
          targetProvince: settings.targetProvince || undefined,
          campaignDuration: settings.campaignDuration || undefined,
          selectedODD: settings.selectedODD ? parseInt(settings.selectedODD) : undefined,
          numberOfEnumerators: settings.numberOfEnumerators ? parseInt(settings.numberOfEnumerators) : undefined
        })
      });

      if (response.ok) {
        setMessage('Identité mise à jour avec succès');
        setMessageType('success');
        // Mettre à jour les données utilisateur dans localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
          const userObj = JSON.parse(userData);
          userObj.name = settings.name;
          userObj.email = settings.email;
          userObj.whatsapp = settings.whatsapp;
          localStorage.setItem('user', JSON.stringify(userObj));
        }
      } else {
        const errorData = await response.json();
        setMessage(errorData.message || 'Erreur lors de la mise à jour de l\'identité');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Erreur de connexion au serveur');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setSettings(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        whatsapp: user.whatsapp || ''
      }));
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Photo de profil */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Photo de profil</h2>
        
        <div className="flex items-center space-x-6">
          {/* Affichage de la photo actuelle */}
          <div className="relative">
            {profilePhoto ? (
              <img 
                src={`${environment.apiBaseUrl}${profilePhoto}`} 
                alt="Photo de profil" 
                className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 border-4 border-gray-300 flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
            {uploadingPhoto && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            )}
          </div>
          
          {/* Bouton d'upload */}
          <div className="flex-1">
            <div className="flex gap-3 mb-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploadingPhoto}
                />
                <div className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {uploadingPhoto ? 'Upload en cours...' : 'Changer la photo'}
                </div>
              </label>
              
              {/* Bouton supprimer */}
              {profilePhoto && (
                <button
                  onClick={handleDeletePhoto}
                  disabled={uploadingPhoto}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingPhoto ? 'Suppression...' : 'Supprimer'}
                </button>
              )}
            </div>
            <p className="text-sm text-gray-500">
              Formats acceptés: JPG, PNG, GIF (max 1MB)
            </p>
          </div>
        </div>
      </div>

      {/* Modification du mot de passe */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Modifier le mot de passe</h2>
        
        {message && (
          <div className={`mb-4 p-4 rounded-md ${
            messageType === 'success' 
              ? 'bg-green-100 border border-green-400 text-green-700' 
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe actuel
            </label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              value={settings.currentPassword}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={settings.newPassword}
              onChange={handleInputChange}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirmer le nouveau mot de passe
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={settings.confirmPassword}
              onChange={handleInputChange}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Modification...' : 'Modifier le mot de passe'}
          </button>
        </form>
      </div>

      {/* Modification du profil */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Modifier identité</h2>

        <form onSubmit={handleProfileUpdate} className="space-y-4">
          {/* Informations de base */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Nom complet *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={settings.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={settings.email}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                Genre
              </label>
              <select
                id="gender"
                name="gender"
                value={settings.gender}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sélectionnez votre genre</option>
                <option value="MALE">Masculin</option>
                <option value="FEMALE">Féminin</option>
                <option value="OTHER">Autre</option>
              </select>
            </div>

            <div>
              <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de téléphone
              </label>
              <input
                type="tel"
                id="contact"
                name="contact"
                value={settings.contact}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Entrez votre numéro de téléphone"
              />
            </div>
          </div>

          <div>
            <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-2">
              Numéro WhatsApp
            </label>
            <input
              type="tel"
              id="whatsapp"
              name="whatsapp"
              value={settings.whatsapp}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Entrez votre numéro WhatsApp"
            />
          </div>

          {/* Informations géographiques */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Informations géographiques</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-2">
                  Province
                </label>
                <select
                  id="province"
                  name="province"
                  value={settings.province}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionnez votre province</option>
                  <option value="BAS_UELE">Bas-Uélé</option>
                  <option value="EQUATEUR">Équateur</option>
                  <option value="HAUT_KATANGA">Haut-Katanga</option>
                  <option value="HAUT_LOMAMI">Haut-Lomami</option>
                  <option value="HAUT_UELE">Haut-Uélé</option>
                  <option value="ITURI">Ituri</option>
                  <option value="KASAI">Kasaï</option>
                  <option value="KASAI_CENTRAL">Kasaï-Central</option>
                  <option value="KASAI_ORIENTAL">Kasaï-Oriental</option>
                  <option value="KINSHASA">Kinshasa</option>
                  <option value="KONGO_CENTRAL">Kongo-Central</option>
                  <option value="KWANGO">Kwango</option>
                  <option value="KWILU">Kwilu</option>
                  <option value="LOMAMI">Lomami</option>
                  <option value="LUALABA">Lualaba</option>
                  <option value="MAI_NDOMBE">Maï-Ndombe</option>
                  <option value="MANIEMA">Maniema</option>
                  <option value="MONGALA">Mongala</option>
                  <option value="NORD_KIVU">Nord-Kivu</option>
                  <option value="NORD_UBANGI">Nord-Ubangi</option>
                  <option value="SANKURU">Sankuru</option>
                  <option value="SUD_KIVU">Sud-Kivu</option>
                  <option value="SUD_UBANGI">Sud-Ubangi</option>
                  <option value="TANGANYIKA">Tanganyika</option>
                  <option value="TSHOPO">Tshopo</option>
                  <option value="TSHUAPA">Tshuapa</option>
                </select>
              </div>

              {settings.province && (
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                    Ville
                  </label>
                  <select
                    id="city"
                    name="city"
                    value={settings.city}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionnez votre ville</option>
                    {getCitiesByProvince(settings.province).map((city, index) => (
                      <option key={index} value={city.name}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {settings.city && (
                <div>
                  <label htmlFor="commune" className="block text-sm font-medium text-gray-700 mb-2">
                    Commune
                  </label>
                  <select
                    id="commune"
                    name="commune"
                    value={settings.commune}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionnez votre commune</option>
                    {getCommunesByCity(settings.province, settings.city).map((commune, index) => (
                      <option key={index} value={commune}>
                        {commune}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {settings.commune && (
                <div>
                  <label htmlFor="quartier" className="block text-sm font-medium text-gray-700 mb-2">
                    Quartier
                  </label>
                  <select
                    id="quartier"
                    name="quartier"
                    value={settings.quartier}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionnez votre quartier</option>
                    {getQuartiersByCommune(settings.province, settings.city, settings.commune).map((quartier, index) => (
                      <option key={index} value={quartier}>
                        {quartier}
                      </option>
                    ))}
                    <option value="CUSTOM">Mon quartier n'est pas dans la liste</option>
                  </select>
                </div>
              )}
            </div>

            {showCustomQuartier && (
              <div className="mt-4">
                <label htmlFor="customQuartier" className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de votre quartier
                </label>
                <input
                  id="customQuartier"
                  name="customQuartier"
                  type="text"
                  value={customQuartier}
                  onChange={(e) => setCustomQuartier(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Entrez le nom de votre quartier"
                />
              </div>
            )}
          </div>

          {/* Informations spécifiques aux Project Managers */}
          {user?.role === 'PROJECT_MANAGER' && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informations du projet</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-2">
                    Organisation
                  </label>
                  <input
                    type="text"
                    id="organization"
                    name="organization"
                    value={settings.organization}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nom de votre organisation"
                  />
                </div>

                <div>
                  <label htmlFor="targetProvince" className="block text-sm font-medium text-gray-700 mb-2">
                    Province cible
                  </label>
                  <select
                    id="targetProvince"
                    name="targetProvince"
                    value={settings.targetProvince}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionnez la province cible</option>
                    <option value="BAS_UELE">Bas-Uélé</option>
                    <option value="EQUATEUR">Équateur</option>
                    <option value="HAUT_KATANGA">Haut-Katanga</option>
                    <option value="HAUT_LOMAMI">Haut-Lomami</option>
                    <option value="HAUT_UELE">Haut-Uélé</option>
                    <option value="ITURI">Ituri</option>
                    <option value="KASAI">Kasaï</option>
                    <option value="KASAI_CENTRAL">Kasaï-Central</option>
                    <option value="KASAI_ORIENTAL">Kasaï-Oriental</option>
                    <option value="KINSHASA">Kinshasa</option>
                    <option value="KONGO_CENTRAL">Kongo-Central</option>
                    <option value="KWANGO">Kwango</option>
                    <option value="KWILU">Kwilu</option>
                    <option value="LOMAMI">Lomami</option>
                    <option value="LUALABA">Lualaba</option>
                    <option value="MAI_NDOMBE">Maï-Ndombe</option>
                    <option value="MANIEMA">Maniema</option>
                    <option value="MONGALA">Mongala</option>
                    <option value="NORD_KIVU">Nord-Kivu</option>
                    <option value="NORD_UBANGI">Nord-Ubangi</option>
                    <option value="SANKURU">Sankuru</option>
                    <option value="SUD_KIVU">Sud-Kivu</option>
                    <option value="SUD_UBANGI">Sud-Ubangi</option>
                    <option value="TANGANYIKA">Tanganyika</option>
                    <option value="TSHOPO">Tshopo</option>
                    <option value="TSHUAPA">Tshuapa</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label htmlFor="campaignDuration" className="block text-sm font-medium text-gray-700 mb-2">
                    Durée de campagne
                  </label>
                  <input
                    type="text"
                    id="campaignDuration"
                    name="campaignDuration"
                    value={settings.campaignDuration}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: 6 mois, 1 an..."
                  />
                </div>

                <div>
                  <label htmlFor="numberOfEnumerators" className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre d'enquêteurs
                  </label>
                  <input
                    type="number"
                    id="numberOfEnumerators"
                    name="numberOfEnumerators"
                    value={settings.numberOfEnumerators}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nombre d'enquêteurs prévu"
                    min="1"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="campaignDescription" className="block text-sm font-medium text-gray-700 mb-2">
                  Description de campagne
                </label>
                <textarea
                  id="campaignDescription"
                  name="campaignDescription"
                  value={settings.campaignDescription}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange(e as any)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Décrivez votre campagne..."
                />
              </div>

              <div className="mt-4">
                <label htmlFor="selectedODD" className="block text-sm font-medium text-gray-700 mb-2">
                  ODD sélectionné
                </label>
                <select
                  id="selectedODD"
                  name="selectedODD"
                  value={settings.selectedODD}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionnez un ODD</option>
                  <option value="1">ODD 1 - Éliminer la pauvreté</option>
                  <option value="2">ODD 2 - Éliminer la faim</option>
                  <option value="3">ODD 3 - Bonne santé et bien-être</option>
                  <option value="4">ODD 4 - Éducation de qualité</option>
                  <option value="5">ODD 5 - Égalité des sexes</option>
                  <option value="6">ODD 6 - Eau propre et assainissement</option>
                  <option value="7">ODD 7 - Énergie propre</option>
                  <option value="8">ODD 8 - Travail décent</option>
                  <option value="9">ODD 9 - Industrie, innovation</option>
                  <option value="10">ODD 10 - Inégalités réduites</option>
                  <option value="11">ODD 11 - Villes durables</option>
                  <option value="12">ODD 12 - Consommation responsable</option>
                  <option value="13">ODD 13 - Lutte contre le changement climatique</option>
                  <option value="14">ODD 14 - Vie aquatique</option>
                  <option value="15">ODD 15 - Vie terrestre</option>
                  <option value="16">ODD 16 - Paix et justice</option>
                  <option value="17">ODD 17 - Partenariats</option>
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Mise à jour...' : 'Mettre à jour l\'identité'}
          </button>
        </form>
      </div>

      {/* Suppression des données de campagne */}
      <div className="bg-white p-6 rounded-lg shadow border border-red-100 mb-6">
        <h2 className="text-xl font-semibold mb-2 text-red-700">Suppression des données de campagne</h2>
        <p className="text-sm text-gray-600 mb-4">
          Efface toutes les soumissions liées à une campagne <strong>publiée et en cours</strong>
          (enquêteurs + formulaires publics). La campagne, ses formulaires et ses utilisateurs sont conservés.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <label htmlFor="purgeCampaignId" className="block text-sm font-medium text-gray-700 mb-2">
              Campagne en cours
            </label>
            <select
              id="purgeCampaignId"
              value={purgeCampaignId}
              onChange={(e) => setPurgeCampaignId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Sélectionnez une campagne</option>
              {activeCampaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.title}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handlePurgeCampaignData}
            disabled={!purgeCampaignId || purgingData}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {purgingData ? 'Suppression...' : 'Supprimer toutes les données'}
          </button>
        </div>
      </div>

      {/* Informations système */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Informations système</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Version de l'application
            </label>
            <div className="px-3 py-2 bg-gray-100 rounded-md text-sm text-gray-600">
              FikiriCollect v1.0.0
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dernière connexion
            </label>
            <div className="px-3 py-2 bg-gray-100 rounded-md text-sm text-gray-600">
              {new Date().toLocaleString('fr-FR')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;