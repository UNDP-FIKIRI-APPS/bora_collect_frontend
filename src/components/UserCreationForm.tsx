import React, { useState, useEffect } from 'react';
import { environment } from '../config/environment';
import { getCitiesByProvince, getCommunesByCity } from '../data/citiesData';
import { useQuartiers } from '../hooks/useQuartiers';

interface UserCreationFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  title?: string;
  showRoleSelection?: boolean;
  defaultRole?: 'CONTROLLER' | 'ANALYST';
  campaigns?: any[];
  loadingCampaigns?: boolean;
}

const UserCreationForm: React.FC<UserCreationFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
  title = "Créer un utilisateur",
  showRoleSelection = false,
  defaultRole,
  campaigns = [],
  loadingCampaigns = false
}) => {
  const [step, setStep] = useState<'select-role' | 'form'>(showRoleSelection ? 'select-role' : 'form');
  const [selectedRole, setSelectedRole] = useState<'CONTROLLER' | 'ANALYST' | null>(defaultRole || null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    gender: '',
    contact: '',
    province: '',
    city: '',
    commune: '',
    quartier: '',
    campaignId: ''
  });
  const [customQuartier, setCustomQuartier] = useState('');
  const [showCustomQuartier, setShowCustomQuartier] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const quartiers = useQuartiers(formData.province, formData.city, formData.commune);

  const handleRoleSelection = (role: 'CONTROLLER' | 'ANALYST') => {
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
      // Réinitialiser ville et commune quand la province change
      setFormData(prev => ({
        ...prev,
        province: value,
        city: '',
        commune: ''
      }));
    } else if (name === 'city') {
      // Réinitialiser commune et quartier quand la ville change
      setFormData(prev => ({
        ...prev,
        city: value,
        commune: '',
        quartier: ''
      }));
      setShowCustomQuartier(false);
      setCustomQuartier('');
    } else if (name === 'commune') {
      // Réinitialiser quartier quand la commune change
      setFormData(prev => ({
        ...prev,
        commune: value,
        quartier: ''
      }));
      setShowCustomQuartier(false);
      setCustomQuartier('');
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

    try {
      await onSubmit({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: selectedRole || defaultRole,
        gender: formData.gender || undefined,
        contact: formData.contact || undefined,
        province: formData.province || undefined,
        city: formData.city || undefined,
        commune: formData.commune || undefined,
        quartier: showCustomQuartier ? customQuartier : (formData.quartier || undefined),
        campaignId: formData.campaignId || undefined
      });
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création de l\'utilisateur');
    }
  };

  return (
    <div className="space-y-6">
      {/* Titre */}
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          {step === 'select-role' ? 'Choisissez le rôle' : title}
        </h3>
        <p className="text-gray-600 text-sm">
          {step === 'select-role' 
            ? 'Sélectionnez le type de compte à créer'
            : `Création d'un compte ${selectedRole === 'CONTROLLER' ? 'Enquêteur' : 'Analyste'}`
          }
        </p>
      </div>

      {/* Étape de sélection du rôle */}
      {step === 'select-role' && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <p className="text-gray-700 font-medium mb-4">
              Quel type de compte souhaitez-vous créer ?
            </p>
          </div>

          {/* Option Enquêteur */}
          <button
            type="button"
            onClick={() => handleRoleSelection('CONTROLLER')}
            className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 text-left group shadow-sm hover:shadow-md"
          >
            <div className="flex items-center space-x-5">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center group-hover:from-blue-200 group-hover:to-blue-300 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                  <svg className="w-8 h-8 text-blue-600 group-hover:text-blue-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

          {/* Option Projet Manager */}
          <button
            type="button"
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
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-green-700 transition-colors">Analyste</h3>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                  Analyse des données, validation des enquêtes et génération de rapports
                </p>
                <div className="mt-2 flex items-center text-xs text-green-600 font-medium">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Analyse de données
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
          {showRoleSelection && (
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
          )}

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
                placeholder="Entrez le nom complet"
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
                placeholder="Entrez l'adresse email"
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
                <option value="">Sélectionnez le genre</option>
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
                placeholder="Entrez le numéro de téléphone"
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
                <option value="">Sélectionnez la province</option>
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
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Sélectionnez la ville ou territoire</option>
                  {getCitiesByProvince(formData.province).map((city, index) => (
                    <option key={index} value={city.name}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {formData.city && (
              <div>
                <label htmlFor="commune" className="block text-sm font-medium text-gray-700 mb-1">
                  Commune *
                </label>
                <select
                  id="commune"
                  name="commune"
                  value={formData.commune}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Sélectionnez la commune</option>
                  {getCommunesByCity(formData.province, formData.city).map((commune, index) => (
                    <option key={index} value={commune}>
                      {commune}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {formData.commune && (
              <div>
                <label htmlFor="quartier" className="block text-sm font-medium text-gray-700 mb-1">
                  Quartier *
                </label>
                <select
                  id="quartier"
                  name="quartier"
                  value={formData.quartier}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Sélectionnez le quartier</option>
                  {quartiers.map((quartier, index) => (
                    <option key={index} value={quartier}>
                      {quartier}
                    </option>
                  ))}
                  <option value="CUSTOM">Le quartier n'est pas dans la liste</option>
                </select>
              </div>
            )}

            {showCustomQuartier && (
              <div>
                <label htmlFor="customQuartier" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du quartier *
                </label>
                <input
                  id="customQuartier"
                  name="customQuartier"
                  type="text"
                  value={customQuartier}
                  onChange={(e) => setCustomQuartier(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Entrez le nom du quartier"
                  required
                />
              </div>
            )}

            {campaigns.length > 0 && (
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
                    {campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.title} - {campaign.location || 'Toutes zones'} 
                        {campaign.maxApplicants && ` (${campaign._count?.applications || 0}/${campaign.maxApplicants} places)`}
                      </option>
                    ))}
                  </select>
                )}
                {campaigns.length > 0 && (
                  <div className="mt-2 text-xs text-gray-600">
                    <p className="font-medium mb-1">Informations sur les campagnes :</p>
                    {campaigns.slice(0, 3).map((campaign) => (
                      <div key={campaign.id} className="mb-1 p-2 bg-gray-50 rounded text-xs">
                        <div className="font-medium text-blue-600">{campaign.title}</div>
                        <div className="text-gray-600">{campaign.description}</div>
                        {campaign.compensation && (
                          <div className="text-green-600 font-medium">Compensation: {campaign.compensation}</div>
                        )}
                      </div>
                    ))}
                    {campaigns.length > 3 && (
                      <div className="text-gray-500 italic">... et {campaigns.length - 3} autres campagnes</div>
                    )}
                  </div>
                )}
              </div>
            )}

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
                  placeholder="Entrez le mot de passe"
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
                  placeholder="Confirmez le mot de passe"
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

            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={onCancel}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-md shadow-md transition-colors font-medium"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md shadow-md transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Création en cours...' : 'Créer l\'utilisateur'}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default UserCreationForm;
