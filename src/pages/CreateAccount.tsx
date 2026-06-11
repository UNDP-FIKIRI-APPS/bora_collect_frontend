import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { APP_LOGO_URL } from '../config/branding';
import { environment } from '../config/environment';
import { getCitiesByProvince, getCommunesByCity } from '../data/citiesData';
import { useQuartiers } from '../hooks/useQuartiers';
import ProjectManagerRegistration from './ProjectManagerRegistration';
import enhancedApiService from '../services/enhancedApiService';

const CreateAccount = () => {
  const [step, setStep] = useState<'select-role' | 'form'>('select-role');
  const [selectedRole, setSelectedRole] = useState<'CONTROLLER' | 'ANALYST' | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    gender: '',
    contact: '',
    whatsapp: '',
    province: '',
    city: '',
    commune: '',
    quartier: '',
    campaignId: ''
  });
  const [customCity, setCustomCity] = useState('');
  const [showCustomCity, setShowCustomCity] = useState(false);
  const [customCommune, setCustomCommune] = useState('');
  const [showCustomCommune, setShowCustomCommune] = useState(false);
  const [customQuartier, setCustomQuartier] = useState('');
  const [showCustomQuartier, setShowCustomQuartier] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const quartiers = useQuartiers(
    showCustomCommune || showCustomCity ? '' : formData.province,
    showCustomCommune || showCustomCity ? '' : formData.city,
    showCustomCommune || showCustomCity ? '' : formData.commune,
  );

  // Charger les campagnes disponibles
  useEffect(() => {
    const loadCampaigns = async () => {
      setLoadingCampaigns(true);
      try {
        // Utilisation du nouveau service API (skipAuth car pas encore connecté)
        const campaignsData = await enhancedApiService.get<any[]>('/users/campaigns', {
          skipAuth: true,
        });
        setCampaigns(campaignsData);
      } catch (error) {
        console.error('Erreur lors du chargement des campagnes:', error);
      } finally {
        setLoadingCampaigns(false);
      }
    };

    loadCampaigns();
  }, []);

  const handleRoleSelection = (role: 'CONTROLLER' | 'ANALYST') => {
    if (role === 'ANALYST') {
      // Rediriger vers le formulaire spécifique des Project Managers
      navigate('/project-manager-registration');
      return;
    }
    setSelectedRole(role);
    setStep('form');
  };

  const handleBackToRoleSelection = () => {
    setStep('select-role');
    setSelectedRole(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'province') {
      // Réinitialiser ville, commune et quartier quand la province change
      setFormData(prev => ({
        ...prev,
        province: value,
        city: '',
        commune: '',
        quartier: ''
      }));
      setShowCustomCity(false);
      setCustomCity('');
      setShowCustomCommune(false);
      setCustomCommune('');
      setShowCustomQuartier(false);
      setCustomQuartier('');
    } else if (name === 'city') {
      if (value === 'CUSTOM') {
        setShowCustomCity(true);
        setFormData(prev => ({
          ...prev,
          city: '',
          commune: '',
          quartier: ''
        }));
        setShowCustomCommune(false);
        setCustomCommune('');
        setShowCustomQuartier(false);
        setCustomQuartier('');
      } else {
        setShowCustomCity(false);
        setCustomCity('');
        // Réinitialiser commune et quartier quand la ville change
        setFormData(prev => ({
          ...prev,
          city: value,
          commune: '',
          quartier: ''
        }));
        setShowCustomCommune(false);
        setCustomCommune('');
        setShowCustomQuartier(false);
        setCustomQuartier('');
      }
    } else if (name === 'commune') {
      if (value === 'CUSTOM') {
        setShowCustomCommune(true);
        setFormData(prev => ({
          ...prev,
          commune: '',
          quartier: ''
        }));
        setShowCustomQuartier(false);
        setCustomQuartier('');
      } else {
        setShowCustomCommune(false);
        setCustomCommune('');
        // Réinitialiser quartier quand la commune change
        setFormData(prev => ({
          ...prev,
          commune: value,
          quartier: ''
        }));
        setShowCustomQuartier(false);
        setCustomQuartier('');
      }
    } else if (name === 'quartier') {
      if (value === 'CUSTOM') {
        setShowCustomQuartier(true);
        setFormData(prev => ({
          ...prev,
          quartier: ''
        }));
      } else {
        setShowCustomQuartier(false);
        setCustomQuartier('');
        setFormData(prev => ({
          ...prev,
          quartier: value
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return false;
    }
    if (!formData.name.trim()) {
      setError('Le nom est requis');
      return false;
    }
    if (!formData.email.trim()) {
      setError('L\'email est requis');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Utilisation du nouveau service API (skipAuth car pas encore connecté)
      await enhancedApiService.post('/users/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: selectedRole,
        gender: formData.gender || undefined,
        contact: formData.contact || undefined,
        whatsapp: formData.whatsapp || undefined,
        province: formData.province || undefined,
        city: showCustomCity ? customCity : (formData.city || undefined),
        commune: showCustomCommune ? customCommune : (formData.commune || undefined),
        quartier: showCustomQuartier ? customQuartier : (formData.quartier || undefined),
        campaignId: formData.campaignId || undefined
      }, {
        skipAuth: true,
      });

      // Rediriger vers la page de succès avec l'email
      navigate('/account-created', { 
        state: { email: formData.email } 
      });
    } catch (err: any) {
      const message = err?.message || 'Erreur de connexion au serveur';
      if (
        message.includes('fetch') ||
        message.includes('network') ||
        message.includes('Failed to fetch')
      ) {
        setError('Connexion au serveur impossible. Vérifiez votre réseau et réessayez.');
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl px-6 py-8">
        {/* Logo et Titre */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block cursor-pointer hover:opacity-80 transition-opacity">
            <img 
              src={APP_LOGO_URL}
              alt="Logo Fikiri Collect" 
              className="mx-auto h-16 w-auto mb-4"
            />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {step === 'select-role' ? 'Choisissez votre rôle' : 'Créer votre profil'}
          </h1>
          <p className="text-gray-600 text-sm">
            {step === 'select-role' 
              ? 'Sélectionnez le type de compte que vous souhaitez créer'
              : `Création d'un compte ${selectedRole === 'CONTROLLER' ? 'Enquêteur' : 'Project Manager'}`
            }
          </p>
        </div>

        {/* Étape de sélection du rôle */}
        {step === 'select-role' && (
          <div className="space-y-4">
            {/* Bouton Retour */}
            <div className="mb-4">
              <button
                onClick={() => navigate('/login')}
                className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="font-medium">Retour à la connexion</span>
              </button>
            </div>

            <div className="text-center mb-6">
              <p className="text-gray-700 font-medium mb-4">
                Quel type de compte souhaitez-vous créer ?
              </p>
            </div>

            {/* Option Enquêteur */}
            <button
              onClick={() => handleRoleSelection('CONTROLLER')}
              className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 text-left group shadow-sm hover:shadow-md"
            >
              <div className="flex items-center space-x-5">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center group-hover:from-blue-200 group-hover:to-blue-300 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                    <svg className="w-8 h-8 text-blue-600 group-hover:text-blue-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {/* Icône simple d'enquêteur avec questionnaire */}
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors">Enquêteur</h3>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    Collecte de données sur le terrain, remplissage de formulaires et soumission des enquêtes
                  </p>
                  <div className="mt-2 flex items-center text-xs text-blue-600 font-medium">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Collecte de données
                  </div>
                </div>
              </div>
            </button>

            {/* Option Project Manager */}
            <button
              onClick={() => handleRoleSelection('ANALYST')}
              className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all duration-300 text-left group shadow-sm hover:shadow-md"
            >
              <div className="flex items-center space-x-5">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center group-hover:from-green-200 group-hover:to-green-300 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                    <svg className="w-8 h-8 text-green-600 group-hover:text-green-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-green-700 transition-colors">Project Manager</h3>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    Gestion des projets, analyse des données, validation des enquêtes et rapports
                  </p>
                  <div className="mt-2 flex items-center text-xs text-green-600 font-medium">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Gestion d'équipe
                  </div>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Étape du formulaire */}
        {step === 'form' && (
          <>
            {/* Bouton retour */}
            <div className="mb-4">
              <button
                type="button"
                onClick={handleBackToRoleSelection}
                className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Retour à la sélection du rôle
              </button>
            </div>

        {/* Formulaire de création de compte */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nom complet *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Entrez votre nom complet"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Adresse email *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Entrez votre adresse email"
              required
            />
          </div>

          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
              Genre
            </label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Sélectionnez votre genre</option>
              <option value="MALE">Masculin</option>
              <option value="FEMALE">Féminin</option>
              <option value="OTHER">Autre</option>
            </select>
          </div>

          <div>
            <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-1">
              Numéro de téléphone
            </label>
            <input
              id="contact"
              name="contact"
              type="tel"
              value={formData.contact}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Entrez votre numéro de téléphone"
            />
          </div>

          <div>
            <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-1">
              Numéro WhatsApp
            </label>
            <input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              value={formData.whatsapp}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Entrez votre numéro WhatsApp"
            />
          </div>

          <div>
            <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-1">
              Province *
            </label>
            <select
              id="province"
              name="province"
              value={formData.province}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
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

          {formData.province && (
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                Ville ou Territoire *
              </label>
              <select
                id="city"
                name="city"
                value={showCustomCity ? 'CUSTOM' : formData.city}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Sélectionnez votre ville ou territoire</option>
                {getCitiesByProvince(formData.province).map((city, index) => (
                  <option key={index} value={city.name}>
                    {city.name}
                  </option>
                ))}
                <option value="CUSTOM">Ma ville n'est pas dans la liste</option>
              </select>
            </div>
          )}

          {showCustomCity && (
            <div>
              <label htmlFor="customCity" className="block text-sm font-medium text-gray-700 mb-1">
                Nom de votre ville ou territoire *
              </label>
              <input
                id="customCity"
                name="customCity"
                type="text"
                value={customCity}
                onChange={(e) => setCustomCity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Entrez le nom de votre ville ou territoire"
                required
              />
            </div>
          )}

          {(formData.city || showCustomCity) && (
            <div>
              <label htmlFor="commune" className="block text-sm font-medium text-gray-700 mb-1">
                Commune *
              </label>
              <select
                id="commune"
                name="commune"
                value={showCustomCommune ? 'CUSTOM' : formData.commune}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Sélectionnez votre commune</option>
                {!showCustomCity && getCommunesByCity(formData.province, formData.city).map((commune, index) => (
                  <option key={index} value={commune}>
                    {commune}
                  </option>
                ))}
                <option value="CUSTOM">Ma commune n'est pas dans la liste</option>
              </select>
            </div>
          )}

          {showCustomCommune && (
            <div>
              <label htmlFor="customCommune" className="block text-sm font-medium text-gray-700 mb-1">
                Nom de votre commune *
              </label>
              <input
                id="customCommune"
                name="customCommune"
                type="text"
                value={customCommune}
                onChange={(e) => setCustomCommune(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Entrez le nom de votre commune"
                required
              />
            </div>
          )}

          {(formData.commune || showCustomCommune) && (
            <div>
              <label htmlFor="quartier" className="block text-sm font-medium text-gray-700 mb-1">
                Quartier *
              </label>
              <select
                id="quartier"
                name="quartier"
                value={showCustomQuartier ? 'CUSTOM' : formData.quartier}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Sélectionnez votre quartier</option>
                {!showCustomCommune && !showCustomCity && quartiers.map((quartier, index) => (
                  <option key={index} value={quartier}>
                    {quartier}
                  </option>
                ))}
                <option value="CUSTOM">Mon quartier n'est pas dans la liste</option>
              </select>
            </div>
          )}

          {showCustomQuartier && (
            <div>
              <label htmlFor="customQuartier" className="block text-sm font-medium text-gray-700 mb-1">
                Nom de votre quartier *
              </label>
              <input
                id="customQuartier"
                name="customQuartier"
                type="text"
                value={customQuartier}
                onChange={(e) => setCustomQuartier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Entrez le nom de votre quartier"
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="campaignId" className="block text-sm font-medium text-gray-700 mb-1">
              Campagne *
            </label>
            {loadingCampaigns ? (
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Chargement des campagnes...
              </div>
            ) : (
              <select
                id="campaignId"
                name="campaignId"
                value={formData.campaignId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Sélectionnez une campagne</option>
                {campaigns.map((campaign: any) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.title} - {campaign.location || 'Toutes zones'}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe *
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Entrez votre mot de passe"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirmer le mot de passe *
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirmez votre mot de passe"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showConfirmPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
              {error}
            </div>
          )}



          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isLoading ? 'Création en cours...' : 'Créer mon compte'}
          </button>
        </form>

            {/* Lien vers la connexion */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Vous avez déjà un compte ?{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Se connecter
                </button>
              </p>
            </div>
          </>
        )}

        {/* Signature */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Développé avec le soutien du <strong>PNUD</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreateAccount; 
