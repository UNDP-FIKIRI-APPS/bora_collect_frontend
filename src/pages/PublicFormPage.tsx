import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2, Send, ArrowLeft } from 'lucide-react';
import { environment } from '../config/environment';
import { APP_LOGO_URL } from '../config/branding';
import enhancedApiService from '../services/enhancedApiService';
import { getCitiesByProvince, getCommunesByCity } from '../data/citiesData';
import { getQuartiersByCommune } from '../data/quartiersData';
import PublicFormSchemaView, { usesFormSchemaV1 } from './PublicFormSchemaView';
import { extractFieldsFromFormSchema } from '../utils/formSchema';

interface FormField {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  description?: string;
  section?: string; // Pour les champs dans des sections
  fieldKey?: string; // Clé originale du champ
  conditional?: {
    field: string;
    value: any;
    operator?: string;
  };
  helpText?: string; // Pour l'explication quand la réponse est "Non"
  rankingOptions?: string[]; // Options de rang pour les champs ranking (ex: ["1er", "2e", "3e"])
}

interface FormTemplate {
  id: string;
  name: string;
  description: string;
  fields: FormField[];
}

interface Survey {
  id: string;
  title: string;
  description: string;
  formTemplates: FormTemplate[];
}

interface LinkData {
  linkId: string;
  survey: Survey;
  enumerator: {
    id: string;
    name: string;
  };
}

const parseFormTemplate = (template: FormTemplate | null): FormTemplate | null => {
  if (!template) return null;

  const flatFields: FormField[] = [];
  let lastSection = '';

  for (const field of extractFieldsFromFormSchema(template.fields)) {
    if (field.section !== lastSection) {
      flatFields.push({
        id: `section_${field.section}`,
        label: field.sectionLabel,
        type: 'section',
        required: false,
        section: field.section,
      });
      lastSection = field.section;
    }

    flatFields.push({
      id: field.id,
      label: field.label,
      type: field.type === 'info' ? 'info' : field.type,
      required: field.required,
      options: field.options?.length ? field.options : undefined,
      placeholder: field.placeholder,
      description: field.helpText,
      section: field.section,
      fieldKey: field.id.includes('.') ? field.id.split('.').pop() : field.id,
      conditional: field.conditional
        ? {
            field: field.conditional.fieldId,
            operator: field.conditional.operator,
            value: field.conditional.value,
          }
        : undefined,
      helpText: field.helpText,
      rankingOptions: field.rankingOptions || undefined,
    });
  }

  return { ...template, fields: flatFields };
};

interface PublicFormPageProps {
  embedMode?: boolean;
}

const PublicFormPage = ({ embedMode = false }: PublicFormPageProps) => {
  const { token } = useParams<{ token: string }>();
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitterName, setSubmitterName] = useState('');
  const [submitterContact, setSubmitterContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // État pour le choix de localisation (GPS ou Adresse manuelle)
  const [locationType, setLocationType] = useState<'gps' | 'address'>('gps');
  const [addressData, setAddressData] = useState({
    province: '',
    city: '',
    commune: '',
    quartier: ''
  });
  const [customCity, setCustomCity] = useState('');
  const [showCustomCity, setShowCustomCity] = useState(false);
  const [customCommune, setCustomCommune] = useState('');
  const [showCustomCommune, setShowCustomCommune] = useState(false);
  const [customQuartier, setCustomQuartier] = useState('');
  const [showCustomQuartier, setShowCustomQuartier] = useState(false);

  useEffect(() => {
    const validateLink = async () => {
      try {
        // Utilisation du nouveau service API (skipAuth car c'est un lien public)
        const data = await enhancedApiService.get<LinkData>(`/public-links/form/${token}`, {
          skipAuth: true,
        });
        // Logs réduits pour améliorer les performances
        setLinkData(data);
      } catch (err: any) {
        // Logs réduits pour améliorer les performances
        setError(err.message || 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      validateLink();
    }
  }, [token]);

  // Optimiser handleInputChange avec useCallback
  const handleInputChange = useCallback((fieldId: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  }, []);

  // Fonction pour vérifier si un champ doit être affiché selon les conditions (mémorisée)
  const shouldShowField = useCallback((field: FormField): boolean => {
    if (!field.conditional) return true;
    
    const { field: conditionalField, value: conditionalValue, operator = 'equals' } = field.conditional;
    
    // Construire l'ID complet du champ conditionnel
    const conditionalFieldId = conditionalField.includes('.') 
      ? conditionalField 
      : field.section 
        ? `${field.section}.${conditionalField}` 
        : conditionalField;
    
    const fieldValue = formData[conditionalFieldId];
    
    switch (operator) {
      case 'equals':
        return fieldValue === conditionalValue;
      case 'not_equals':
        return fieldValue !== conditionalValue;
      case 'contains':
        return Array.isArray(fieldValue) ? fieldValue.includes(conditionalValue) : fieldValue?.includes(conditionalValue);
      default:
        return fieldValue === conditionalValue;
    }
  }, [formData]);

  // Fonction pour valider soit GPS soit adresse manuelle
  const validateLocation = (data: Record<string, any>, useAddressData: boolean = false): { isValid: boolean; message?: string } => {
    // Si on utilise les données d'adresse depuis le state (locationType === 'address')
    if (useAddressData) {
      // La validation des données d'adresse est faite avant l'appel à cette fonction
      // On vérifie juste qu'il y a des données d'adresse dans data
      const provinceKeys = Object.keys(data).filter(key => /province/i.test(key));
      const communeKeys = Object.keys(data).filter(key => /commune/i.test(key) || /quartier/i.test(key));
      if (provinceKeys.length > 0 && communeKeys.length > 0) {
        return { isValid: true };
      }
      return {
        isValid: false,
        message: '❌ Pour utiliser une adresse manuelle, veuillez compléter tous les champs requis : province et commune/quartier.'
      };
    }
    // Vérifier si GPS est présent
    const hasGPS = Object.keys(data).some(key => {
      const value = data[key];
      if (!value) return false;
      const valueStr = String(value).trim();
      // Vérifier si c'est une coordonnée GPS (format latitude,longitude ou séparés)
      if (/geolocalisation/i.test(key) || /GPS/i.test(key)) {
        if (valueStr.includes(',') || valueStr.includes(';')) {
          const coords = valueStr.split(/[,;]/).map(c => parseFloat(c.trim()));
          if (coords.length >= 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
            return true;
          }
        }
        // Vérifier si c'est un objet avec latitude/longitude
        if (typeof value === 'object' && (value.latitude || value.longitude)) {
          return true;
        }
      }
      return false;
    });

    if (hasGPS) {
      return { isValid: true };
    }

    // Vérifier si une adresse complète est fournie
    // Les champs peuvent être au format "sectionKey.fieldKey" (ex: "household.communeQuartier", "identification.province")
    const provinceKeys: string[] = [];
    const communeQuartierKeys: string[] = [];
    
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (!value) return;
      const valueStr = String(value).trim();
      if (valueStr === '') return;
      
      // Chercher "province" dans la clé
      if (/province/i.test(key)) {
        provinceKeys.push(key);
      }
      
      // Chercher commune, quartier, ville, city, ou communeQuartier dans la clé
      if (/commune/i.test(key) || /quartier/i.test(key) || /ville/i.test(key) || /city/i.test(key)) {
        communeQuartierKeys.push(key);
      }
    });

    // Si l'utilisateur a commencé à remplir des champs d'adresse, tous les champs requis doivent être remplis
    const hasAnyAddressField = provinceKeys.length > 0 || communeQuartierKeys.length > 0;
    
    if (hasAnyAddressField) {
      // Si au moins un champ d'adresse est rempli, tous les champs requis doivent l'être
      if (provinceKeys.length === 0) {
        return {
          isValid: false,
          message: '❌ Pour utiliser une adresse manuelle, veuillez compléter tous les champs requis : province et commune/quartier.'
        };
      }
      
      if (communeQuartierKeys.length === 0) {
        return {
          isValid: false,
          message: '❌ Pour utiliser une adresse manuelle, veuillez compléter tous les champs requis : province et commune/quartier.'
        };
      }
      
      // Vérifier que les valeurs ne sont pas vides
      const hasValidProvince = provinceKeys.some(key => {
        const value = data[key];
        return value && String(value).trim() !== '';
      });
      
      const hasValidCommuneQuartier = communeQuartierKeys.some(key => {
        const value = data[key];
        return value && String(value).trim() !== '';
      });
      
      if (hasValidProvince && hasValidCommuneQuartier) {
        return { isValid: true };
      }
      
      return {
        isValid: false,
        message: '❌ Pour utiliser une adresse manuelle, veuillez compléter tous les champs requis : province et commune/quartier.'
      };
    }

    return {
      isValid: false,
      message: '❌ Veuillez soit capturer votre position GPS, soit compléter une adresse complète (province et commune/quartier) avant de soumettre le formulaire.'
    };
  };

  // Fonction pour valider tous les champs obligatoires
  const validateRequiredFields = (data: Record<string, any>, fields: FormField[], locationType: 'gps' | 'address', addressData: { province: string; commune: string }): { isValid: boolean; message?: string; missingField?: string } => {
    if (!fields || fields.length === 0) {
      return { isValid: true };
    }

    // Vérifier si l'adresse est complète (pour ignorer le GPS si adresse choisie)
    const hasCompleteAddress = locationType === 'address' && addressData.province && addressData.commune;

    for (const field of fields) {
      // Ignorer les champs de section et info
      if (field.type === 'section' || field.type === 'info') {
        continue;
      }

      // Si le champ est obligatoire
      if (field.required) {
        // Ignorer le champ GPS si l'utilisateur a choisi l'adresse manuelle et que l'adresse est complète
        if (field.type === 'gps' && hasCompleteAddress) {
          continue; // Le GPS n'est pas obligatoire si l'adresse est complète
        }

        const fieldValue = data[field.id];
        
        // Vérifier si le champ est vide
        let isEmpty = false;
        
        if (fieldValue === undefined || fieldValue === null) {
          isEmpty = true;
        } else if (typeof fieldValue === 'string') {
          isEmpty = fieldValue.trim() === '';
        } else if (Array.isArray(fieldValue)) {
          isEmpty = fieldValue.length === 0;
        } else if (typeof fieldValue === 'object') {
          // Pour les objets (comme ranking), vérifier s'il a au moins une propriété non vide
          isEmpty = Object.keys(fieldValue).length === 0 || 
                   Object.values(fieldValue).every(v => !v || (typeof v === 'string' && v.trim() === ''));
        }

        if (isEmpty) {
          return {
            isValid: false,
            message: `❌ Le champ "${field.label || field.id}" est obligatoire. Veuillez le remplir avant de soumettre le formulaire.`,
            missingField: field.id
          };
        }
      }
    }

    return { isValid: true };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Transformer les données pour correspondre au format attendu (avec clés pointées)
      // Les données sont déjà dans le format sectionKey.fieldKey grâce à parseFormTemplate
      // Mais pour les champs ranking et autres cas spéciaux, on doit les transformer
      const transformedFormData: Record<string, any> = { ...formData };
      
      // Nettoyer les clés temporaires (comme les clés de province GPS)
      Object.keys(transformedFormData).forEach(key => {
        if (key.endsWith('_province')) {
          delete transformedFormData[key];
        }
      });
      
      // Traiter les champs ranking - les données sont déjà dans le format { option: rank }
      // Pas besoin de transformation car elles sont déjà stockées correctement
      if (formTemplate?.fields) {
        formTemplate.fields.forEach((field) => {
          if (field.type === 'ranking') {
            // Les données de ranking sont déjà dans le format { "Bois": "1er", "Charbon de bois": "2e" }
            // On s'assure juste que le champ existe dans transformedFormData
            if (formData[field.id] && typeof formData[field.id] === 'object') {
              transformedFormData[field.id] = formData[field.id];
            }
          }
          
          // Traiter les champs checkbox pour s'assurer qu'ils sont des tableaux
          if (field.type === 'checkbox') {
            if (!transformedFormData[field.id]) {
              transformedFormData[field.id] = [];
            } else if (!Array.isArray(transformedFormData[field.id])) {
              transformedFormData[field.id] = [transformedFormData[field.id]];
            }
          }
        });
      }

      // Valider tous les champs obligatoires (en excluant le GPS si l'adresse est complète)
      const requiredFieldsValidation = validateRequiredFields(transformedFormData, formTemplate?.fields || [], locationType, addressData);
      if (!requiredFieldsValidation.isValid) {
        setError(requiredFieldsValidation.message || 'Champs obligatoires manquants');
        setSubmitting(false);
        // Faire défiler vers le champ manquant si possible
        if (requiredFieldsValidation.missingField) {
          const fieldElement = document.getElementById(requiredFieldsValidation.missingField);
          if (fieldElement) {
            fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            fieldElement.focus();
          }
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
      }

      // Vérifier si GPS est présent dans formData
      const hasGPS = Object.keys(transformedFormData).some(key => {
        const value = transformedFormData[key];
        if (!value) return false;
        const valueStr = String(value).trim();
        if (/geolocalisation/i.test(key) || /GPS/i.test(key)) {
          if (valueStr.includes(',') || valueStr.includes(';')) {
            const coords = valueStr.split(/[,;]/).map(c => parseFloat(c.trim()));
            if (coords.length >= 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
              return true;
            }
          }
          if (typeof value === 'object' && (value.latitude || value.longitude)) {
            return true;
          }
        }
        return false;
      });

      // Ajouter les données d'adresse si locationType === 'address'
      if (locationType === 'address') {
        // Vérifier que l'adresse est complète
        if (!addressData.province || !addressData.commune) {
          setError('❌ Pour utiliser une adresse manuelle, veuillez compléter tous les champs requis : province et commune/quartier.');
          setSubmitting(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        // Ajouter les données d'adresse dans formData avec les clés appropriées
        // Chercher les clés existantes pour province et commune/quartier
        const provinceKeys = Object.keys(transformedFormData).filter(key => /province/i.test(key));
        const communeKeys = Object.keys(transformedFormData).filter(key => /commune/i.test(key) || /quartier/i.test(key));
        
        // Si on trouve des clés existantes, utiliser la première
        if (provinceKeys.length > 0) {
          transformedFormData[provinceKeys[0]] = addressData.province;
        } else {
          // Sinon, utiliser le format standard
          transformedFormData['identification.province'] = addressData.province;
        }
        
        if (communeKeys.length > 0) {
          transformedFormData[communeKeys[0]] = showCustomCommune ? customCommune : addressData.commune;
        } else {
          transformedFormData['identification.communeQuartier'] = showCustomCommune ? customCommune : addressData.commune;
        }
        
        // Ajouter city et quartier si disponibles
        if (addressData.city || showCustomCity) {
          transformedFormData['identification.city'] = showCustomCity ? customCity : addressData.city;
        }
        if (addressData.quartier || showCustomQuartier) {
          transformedFormData['identification.quartier'] = showCustomQuartier ? customQuartier : addressData.quartier;
        }
      }

      // Valider la localisation : GPS OU adresse complète (l'un ou l'autre)
      // Si GPS est présent, c'est valide
      if (hasGPS) {
        // GPS présent, validation OK
      } else if (locationType === 'address') {
        // Vérifier que l'adresse est complète (déjà vérifié plus haut)
        // Si on arrive ici, l'adresse est complète
      } else {
        // Pas de GPS et locationType === 'gps' mais GPS non capturé
        // Vérifier si une adresse complète est présente dans formData
        const provinceKeys = Object.keys(transformedFormData).filter(key => /province/i.test(key));
        const communeKeys = Object.keys(transformedFormData).filter(key => /commune/i.test(key) || /quartier/i.test(key));
        
        const hasValidProvince = provinceKeys.some(key => {
          const value = transformedFormData[key];
          return value && String(value).trim() !== '';
        });
        
        const hasValidCommune = communeKeys.some(key => {
          const value = transformedFormData[key];
          return value && String(value).trim() !== '';
        });
        
        if (!hasValidProvince || !hasValidCommune) {
          setError('❌ Veuillez soit capturer votre position GPS, soit compléter une adresse complète (province et commune/quartier) avant de soumettre le formulaire.');
          setSubmitting(false);
          const locationField = document.querySelector('[placeholder*="GPS"], [placeholder*="gps"], [placeholder*="Géolocalisation"], [name*="province"], [name*="commune"]');
          if (locationField) {
            locationField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            (locationField as HTMLElement).focus();
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
          return;
        }
      }

      // Vérifier que les données GPS sont présentes (pour logging)
      const gpsKeys = Object.keys(transformedFormData).filter(key => 
        key.includes('geolocalisation') || key.includes('GPS')
      );
      if (gpsKeys.length > 0) {
        console.log('📊 GPS trouvé dans formData:', gpsKeys.map(key => ({ key, value: transformedFormData[key] })));
      } else {
        console.log('📍 Adresse manuelle utilisée pour la localisation');
      }

      // Utilisation du nouveau service API (skipAuth car c'est un lien public)
      await enhancedApiService.post(`/public-links/form/${token}/submit`, {
        formData: transformedFormData,
        submitterName: submitterName || undefined,
        submitterContact: submitterContact || undefined,
      }, {
        skipAuth: true,
      });

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  // Mémoriser le formTemplate pour éviter les recalculs
  const formTemplate = useMemo(() => {
    const formTemplates = linkData?.survey?.formTemplates;
    const rawFormTemplate =
      Array.isArray(formTemplates) && formTemplates.length > 0 ? formTemplates[0] : null;
    return parseFormTemplate(rawFormTemplate);
  }, [linkData]);

  // Mémoriser les champs visibles pour éviter les recalculs
  const visibleFields = useMemo(() => {
    if (!formTemplate || !Array.isArray(formTemplate.fields)) return [];
    return formTemplate.fields.filter((field: FormField) => shouldShowField(field));
  }, [formTemplate, shouldShowField]);

  // Capture GPS simplifiée - sans détermination automatique de la province
  const captureGPS = useCallback((fieldId: string) => {
    if (!navigator.geolocation) {
      alert('La géolocalisation n\'est pas supportée par votre navigateur.');
      return;
    }
    
    // Options GPS optimisées pour une capture simple et fiable
    const gpsOptions = {
      enableHighAccuracy: true,  // Activer la haute précision GPS
      timeout: 1500000,          // 25 minutes pour laisser suffisamment de temps à la capture
      maximumAge: 0              // Forcer une nouvelle capture (pas de cache)
    };
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        
        // Vérifier que les coordonnées sont valides
        if (isNaN(latitude) || isNaN(longitude) || latitude === 0 || longitude === 0) {
          alert('❌ Coordonnées GPS invalides. Veuillez réessayer.');
          return;
        }
        
        const accuracyMeters = Math.round(accuracy);
        const coordsValue = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        
        // Log pour débogage
        console.log(`📍 GPS capturé: ${coordsValue}, Précision: ${accuracyMeters}m`);
        
        // Enregistrer simplement les coordonnées GPS
        handleInputChange(fieldId, coordsValue);
        console.log('✅ Coordonnées GPS enregistrées avec succès');
      },
      (error) => {
        let errorMessage = 'Impossible de capturer la position GPS.';
        if (error && typeof error === 'object') {
          switch ((error as any).code) {
            case 1: 
              errorMessage = 'Permission GPS refusée. Veuillez autoriser l\'accès à la localisation dans les paramètres de votre navigateur.';
              break;
            case 2: 
              errorMessage = 'Position GPS indisponible. Vérifiez votre connexion internet et que le GPS est activé sur votre appareil.';
              break;
            case 3: 
              errorMessage = 'Délai de capture GPS dépassé. Veuillez réessayer.';
              break;
          }
        }
        alert(`❌ ${errorMessage}`);
      },
      gpsOptions
    );
  }, [handleInputChange]);

  const renderField = useCallback((field: FormField) => {
    const commonClasses =
      'w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all';

    switch (field.type) {
      case 'section':
        return (
          <div className="border-t-2 border-blue-200 pt-4 mt-6">
            <h3 className="text-lg font-semibold text-blue-700">{field.label}</h3>
          </div>
        );
      
      case 'info':
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-700 text-sm">
            {field.label}
          </div>
        );
      
      case 'gps':
        // Ne rendre le champ GPS que si locationType === 'gps'
        if (locationType !== 'gps') {
          return null;
        }
        return (
          <div className="space-y-3">
            <input
              type="text"
              id={field.id}
              placeholder="Latitude, Longitude"
              value={formData[field.id] || ''}
              readOnly
              required={field.required && locationType === 'gps'}
              className={`${commonClasses} bg-slate-50`}
            />
            <button
              type="button"
              onClick={() => captureGPS(field.id)}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-green-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="3"/>
                <line x1="12" y1="2" x2="12" y2="4"/>
                <line x1="12" y1="20" x2="12" y2="22"/>
                <line x1="2" y1="12" x2="4" y2="12"/>
                <line x1="20" y1="12" x2="22" y2="12"/>
              </svg>
              Capturer ma position GPS
            </button>
            {/* Afficher des conseils pour améliorer la précision GPS */}
            {!formData[field.id] && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <p className="font-medium mb-1">💡 Pour une meilleure précision GPS :</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Activez le GPS de votre appareil</li>
                  <li>Sortez à l'extérieur si possible</li>
                  <li>Attendez quelques secondes après avoir cliqué sur "Capturer"</li>
                </ul>
              </div>
            )}
          </div>
        );
      
      case 'ranking':
        const rankOptions = field.options || [];
        const rankingOptions = field.rankingOptions || ['1er', '2e', '3e', '4e', '5e'];
        
        return (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 mb-3">
              Sélectionnez les combustibles utilisés et classez-les par ordre d'importance (1er, 2e, 3e, etc.)
            </p>
            {rankOptions.map((option: string, optIndex: number) => {
              // Obtenir les rangs déjà utilisés
              const currentRankings = formData[field.id] || {};
              const usedRanks = Object.values(currentRankings).filter((rank: any) => rank !== '');
              const currentRank = currentRankings[option] || '';
              
              return (
                <div key={optIndex} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    checked={currentRank !== ''}
                    onChange={(e) => {
                      const currentRankings = formData[field.id] || {};
                      let newRankings = { ...currentRankings };
                      
                      if (e.target.checked) {
                        // Si on coche, assigner le premier rang disponible
                        const availableRanks = rankingOptions.filter((rank: string) => !usedRanks.includes(rank));
                        if (availableRanks.length > 0) {
                          newRankings[option] = availableRanks[0];
                        }
                      } else {
                        // Si on décoche, retirer le rang
                        newRankings[option] = '';
                      }
                      
                      handleInputChange(field.id, newRankings);
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700 flex-1">{option}</span>
                  <select
                    value={currentRank}
                    onChange={(e) => {
                      const newRank = e.target.value;
                      const currentRankings = formData[field.id] || {};
                      
                      // Si on sélectionne un rang déjà utilisé par un autre combustible, on le retire d'abord
                      let newRankings = { ...currentRankings };
                      if (newRank !== '') {
                        // Retirer ce rang de tous les autres combustibles
                        Object.keys(newRankings).forEach(key => {
                          if (key !== option && newRankings[key] === newRank) {
                            newRankings[key] = '';
                          }
                        });
                      }
                      
                      // Assigner le nouveau rang au combustible actuel
                      newRankings[option] = newRank;
                      handleInputChange(field.id, newRankings);
                    }}
                    className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                    disabled={currentRank === ''}
                  >
                    <option value="">-- Non utilisé --</option>
                    {rankingOptions.map((rank: string, rankIndex: number) => {
                      const isUsed = usedRanks.includes(rank) && rank !== currentRank;
                      return (
                        <option 
                          key={rankIndex} 
                          value={rank}
                          disabled={isUsed}
                          style={{ color: isUsed ? '#999' : 'inherit' }}
                        >
                          {rank} {isUsed ? '(déjà utilisé)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              );
            })}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700">
                💡 Astuce : Cochez les combustibles que vous utilisez, puis classez-les par ordre d'importance en sélectionnant un rang pour chacun.
              </p>
            </div>
          </div>
        );
      case 'text':
      case 'email':
      case 'tel':
      case 'number':
        return (
          <input
            type={field.type}
            id={field.id}
            placeholder={field.placeholder || ''}
            required={field.required}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className={commonClasses}
          />
        );

      case 'textarea':
        return (
          <textarea
            id={field.id}
            placeholder={field.placeholder || ''}
            required={field.required}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            rows={4}
            className={commonClasses}
          />
        );

      case 'select':
        return (
          <select
            id={field.id}
            required={field.required}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className={commonClasses}
          >
            <option value="">Sélectionner...</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label key={option} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={formData[field.id] === option}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  required={field.required}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-slate-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label key={option} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  value={option}
                  checked={(formData[field.id] || []).includes(option)}
                  onChange={(e) => {
                    const currentValues = formData[field.id] || [];
                    if (e.target.checked) {
                      handleInputChange(field.id, [...currentValues, option]);
                    } else {
                      handleInputChange(
                        field.id,
                        currentValues.filter((v: string) => v !== option)
                      );
                    }
                  }}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-slate-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            id={field.id}
            required={field.required}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className={commonClasses}
          />
        );

      default:
        return (
          <input
            type="text"
            id={field.id}
            placeholder={field.placeholder || ''}
            required={field.required}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className={commonClasses}
          />
        );
    }
  }, [formData, handleInputChange, captureGPS]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Chargement du formulaire...</p>
        </div>
      </div>
    );
  }

  if (error && !linkData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Lien invalide</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          {!embedMode && (
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à l'accueil
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (linkData && usesFormSchemaV1(linkData as any) && token) {
    return (
      <div className={embedMode ? 'bg-white min-h-screen' : 'min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50'}>
        {!embedMode && (
          <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
            <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
              <Link to="/" className="flex items-center gap-3">
                <img src={APP_LOGO_URL} alt="Fikiri Collect" className="h-10 w-auto object-contain" />
                <div>
                  <p className="text-xs uppercase tracking-widest text-blue-600">Fikiri Collect</p>
                  <p className="text-sm font-semibold text-slate-900">Formulaire public</p>
                </div>
              </Link>
            </div>
          </header>
        )}
        <main className={embedMode ? 'p-2' : 'max-w-2xl mx-auto px-4 py-8'}>
          <PublicFormSchemaView token={token} linkData={linkData as any} embedMode={embedMode} />
        </main>
        {!embedMode && (
          <footer className="border-t border-slate-100 bg-white mt-12 py-6 text-center text-sm text-slate-500">
            <p>© {new Date().getFullYear()} Fikiri Collect</p>
          </footer>
        )}
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Merci !</h1>
          <p className="text-slate-600 mb-6">
            Votre formulaire a été soumis avec succès. Vos réponses ont été enregistrées.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setFormData({});
              setSubmitterName('');
              setSubmitterContact('');
            }}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            Soumettre un autre formulaire
          </button>
        </div>
      </div>
    );
  }

  // formTemplate et visibleFields sont maintenant mémorisés avec useMemo plus haut

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={APP_LOGO_URL} alt="Fikiri Collect" className="h-10 w-auto object-contain" />
            <div>
              <p className="text-xs uppercase tracking-widest text-blue-600">Fikiri Collect</p>
              <p className="text-sm font-semibold text-slate-900">Formulaire public</p>
            </div>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Survey Info */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{linkData?.survey?.title}</h1>
          <p className="text-slate-600 mb-4">{linkData?.survey?.description}</p>
          <p className="text-sm text-slate-500">
            Enquête partagée par <span className="font-medium text-blue-600">{linkData?.enumerator?.name}</span>
          </p>
        </div>

        {/* Form */}
        {formTemplate ? (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">{formTemplate.name}</h2>
            <p className="text-slate-600 text-sm mb-6">{formTemplate.description}</p>

            {/* Submitter Info (optional) */}
            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <p className="text-sm font-medium text-slate-700 mb-3">Informations (optionnel)</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Votre nom</label>
                  <input
                    type="text"
                    value={submitterName}
                    onChange={(e) => setSubmitterName(e.target.value)}
                    placeholder="Nom complet"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Contact</label>
                  <input
                    type="text"
                    value={submitterContact}
                    onChange={(e) => setSubmitterContact(e.target.value)}
                    placeholder="Téléphone ou email"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Choix de localisation : GPS ou Adresse manuelle */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Méthode de localisation *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setLocationType('gps');
                    // Nettoyer les données d'adresse si on passe à GPS
                    setAddressData({ province: '', city: '', commune: '', quartier: '' });
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    locationType === 'gps'
                      ? 'border-blue-600 bg-blue-100 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-medium">GPS</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setLocationType('address')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    locationType === 'address'
                      ? 'border-blue-600 bg-blue-100 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-medium">Adresse</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Champs d'adresse manuelle (si locationType === 'address') */}
            {locationType === 'address' && (
              <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Adresse complète</h3>
                
                {/* Province */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Province *
                  </label>
                  <select
                    value={addressData.province}
                    onChange={(e) => {
                      setAddressData(prev => ({
                        ...prev,
                        province: e.target.value,
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
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={locationType === 'address'}
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
                    <option value="MAI_NDOMBE">Mai-Ndombe</option>
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

                {/* Ville */}
                {addressData.province && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Ville ou Territoire *
                    </label>
                    <select
                      value={showCustomCity ? 'CUSTOM' : addressData.city}
                      onChange={(e) => {
                        if (e.target.value === 'CUSTOM') {
                          setShowCustomCity(true);
                          setAddressData(prev => ({
                            ...prev,
                            city: '',
                            commune: '',
                            quartier: ''
                          }));
                        } else {
                          setShowCustomCity(false);
                          setCustomCity('');
                          setAddressData(prev => ({
                            ...prev,
                            city: e.target.value,
                            commune: '',
                            quartier: ''
                          }));
                        }
                        setShowCustomCommune(false);
                        setCustomCommune('');
                        setShowCustomQuartier(false);
                        setCustomQuartier('');
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required={locationType === 'address'}
                    >
                      <option value="">Sélectionnez votre ville ou territoire</option>
                      {getCitiesByProvince(addressData.province).map((city, index) => (
                        <option key={index} value={city.name}>
                          {city.name}
                        </option>
                      ))}
                      <option value="CUSTOM">Ma ville n'est pas dans la liste</option>
                    </select>
                  </div>
                )}

                {/* Ville personnalisée */}
                {showCustomCity && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nom de votre ville ou territoire *
                    </label>
                    <input
                      type="text"
                      value={customCity}
                      onChange={(e) => setCustomCity(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Entrez le nom de votre ville ou territoire"
                      required={locationType === 'address' && showCustomCity}
                    />
                  </div>
                )}

                {/* Commune */}
                {(addressData.city || showCustomCity) && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Commune *
                    </label>
                    <select
                      value={showCustomCommune ? 'CUSTOM' : addressData.commune}
                      onChange={(e) => {
                        if (e.target.value === 'CUSTOM') {
                          setShowCustomCommune(true);
                          setAddressData(prev => ({
                            ...prev,
                            commune: '',
                            quartier: ''
                          }));
                        } else {
                          setShowCustomCommune(false);
                          setCustomCommune('');
                          setAddressData(prev => ({
                            ...prev,
                            commune: e.target.value,
                            quartier: ''
                          }));
                        }
                        setShowCustomQuartier(false);
                        setCustomQuartier('');
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required={locationType === 'address'}
                    >
                      <option value="">Sélectionnez votre commune</option>
                      {!showCustomCity && getCommunesByCity(addressData.province, addressData.city).map((commune, index) => (
                        <option key={index} value={commune}>
                          {commune}
                        </option>
                      ))}
                      <option value="CUSTOM">Ma commune n'est pas dans la liste</option>
                    </select>
                  </div>
                )}

                {/* Commune personnalisée */}
                {showCustomCommune && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nom de votre commune *
                    </label>
                    <input
                      type="text"
                      value={customCommune}
                      onChange={(e) => setCustomCommune(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Entrez le nom de votre commune"
                      required={locationType === 'address' && showCustomCommune}
                    />
                  </div>
                )}

                {/* Quartier */}
                {(addressData.commune || showCustomCommune) && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Quartier *
                    </label>
                    <select
                      value={showCustomQuartier ? 'CUSTOM' : addressData.quartier}
                      onChange={(e) => {
                        if (e.target.value === 'CUSTOM') {
                          setShowCustomQuartier(true);
                          setAddressData(prev => ({
                            ...prev,
                            quartier: ''
                          }));
                        } else {
                          setShowCustomQuartier(false);
                          setCustomQuartier('');
                          setAddressData(prev => ({
                            ...prev,
                            quartier: e.target.value
                          }));
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required={locationType === 'address'}
                    >
                      <option value="">Sélectionnez votre quartier</option>
                      {!showCustomCommune && !showCustomCity && getQuartiersByCommune(addressData.province, addressData.city, addressData.commune).map((quartier, index) => (
                        <option key={index} value={quartier}>
                          {quartier}
                        </option>
                      ))}
                      <option value="CUSTOM">Mon quartier n'est pas dans la liste</option>
                    </select>
                  </div>
                )}

                {/* Quartier personnalisé */}
                {showCustomQuartier && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nom de votre quartier *
                    </label>
                    <input
                      type="text"
                      value={customQuartier}
                      onChange={(e) => setCustomQuartier(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Entrez le nom de votre quartier"
                      required={locationType === 'address' && showCustomQuartier}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-6">
              {visibleFields.map((field: FormField) => {

                // Vérifier si on doit afficher l'explication pour "Non"
                // L'explication s'affiche si :
                // 1. Le champ a un helpText
                // 2. Le champ est de type radio/select avec des options Oui/Non
                // 3. La valeur sélectionnée est "Non"
                const fieldValue = formData[field.id];
                const showNonExplanation = field.helpText && 
                  fieldValue === 'Non' && 
                  (field.type === 'radio' || field.type === 'select') &&
                  field.options?.includes('Non');

                return (
                  <div key={field.id}>
                    {field.type === 'section' || field.type === 'info' ? (
                      renderField(field)
                    ) : (
                      <>
                        <label htmlFor={field.id} className="block text-sm font-medium text-slate-700 mb-2">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {field.description && (
                          <p className="text-xs text-slate-500 mb-2">{field.description}</p>
                        )}
                        {renderField(field)}
                        {/* Afficher l'explication si la réponse est "Non" */}
                        {showNonExplanation && (
                          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-700 text-sm">
                            <p className="font-medium mb-1">Explication pour l'enquêteur :</p>
                            <p>{field.helpText}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="mt-8 w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Soumettre le formulaire
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <p className="text-slate-600">Aucun formulaire disponible pour cette campagne.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white mt-12 py-6 text-center text-sm text-slate-500">
        <p>© {new Date().getFullYear()} Fikiri Collect — Collecte de données fiables</p>
      </footer>
    </div>
  );
};

export default PublicFormPage;

