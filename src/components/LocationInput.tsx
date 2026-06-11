import { useState } from 'react';
import { getCitiesByProvince, getCommunesByCity } from '../data/citiesData';
import { useQuartiers } from '../hooks/useQuartiers';

interface LocationInputProps {
  fieldId: string;
  value: string;
  onChange: (fieldId: string, value: any) => void;
  onGPSCapture?: (fieldId: string) => void;
  required?: boolean;
  gpsProvince?: string | null;
  gpsProvinceStatus?: 'idle' | 'loading' | 'success' | 'error';
  className?: string;
}

const LocationInput: React.FC<LocationInputProps> = ({
  fieldId,
  value,
  onChange,
  onGPSCapture,
  required = false,
  gpsProvince,
  gpsProvinceStatus = 'idle',
  className = ''
}) => {
  const [locationMethod, setLocationMethod] = useState<'gps' | 'manual'>('gps');
  const [manualAddress, setManualAddress] = useState({
    province: '',
    city: '',
    commune: '',
    quartier: ''
  });
  const [showCustomCity, setShowCustomCity] = useState(false);
  const [showCustomCommune, setShowCustomCommune] = useState(false);
  const [showCustomQuartier, setShowCustomQuartier] = useState(false);
  const [customCity, setCustomCity] = useState('');
  const [customCommune, setCustomCommune] = useState('');
  const [customQuartier, setCustomQuartier] = useState('');
  const quartiers = useQuartiers(
    showCustomCommune ? '' : manualAddress.province,
    showCustomCommune ? '' : manualAddress.city,
    showCustomCommune ? '' : manualAddress.commune,
  );

  const commonClasses = `w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${className}`;

  return (
    <div className="space-y-4">
      {/* Choix de la méthode de localisation */}
      <div className="flex gap-4 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={`${fieldId}_method`}
            value="gps"
            checked={locationMethod === 'gps'}
            onChange={(e) => {
              setLocationMethod('gps');
              setManualAddress({ province: '', city: '', commune: '', quartier: '' });
              if (value) {
                onChange(fieldId, value);
              }
            }}
            className="w-4 h-4 text-blue-600"
          />
          <span className="text-sm font-medium">Capturer GPS</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={`${fieldId}_method`}
            value="manual"
            checked={locationMethod === 'manual'}
            onChange={(e) => {
              setLocationMethod('manual');
              onChange(fieldId, '');
            }}
            className="w-4 h-4 text-blue-600"
          />
          <span className="text-sm font-medium">Compléter l'adresse</span>
        </label>
      </div>

      {/* Option GPS */}
      {locationMethod === 'gps' && (
        <div className="space-y-3">
          <input
            type="text"
            id={fieldId}
            placeholder="Latitude, Longitude"
            value={value || ''}
            readOnly
            required={required && locationMethod === 'gps'}
            className={`${commonClasses} bg-slate-50`}
          />
          {onGPSCapture && (
            <button
              type="button"
              onClick={() => onGPSCapture(fieldId)}
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
              {gpsProvinceStatus === 'loading' ? 'Capture en cours...' : 'Capturer ma position GPS'}
            </button>
          )}
          {gpsProvinceStatus === 'success' && gpsProvince && (
            <p className="text-sm text-green-600">Province détectée : {gpsProvince}</p>
          )}
          {gpsProvinceStatus === 'error' && (
            <p className="text-sm text-red-600">Impossible de déterminer la province. Veuillez réessayer.</p>
          )}
        </div>
      )}

      {/* Option Adresse manuelle */}
      {locationMethod === 'manual' && (
        <div className="space-y-4">
          {/* Province */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Province {required && <span className="text-red-500">*</span>}
            </label>
            <select
              value={manualAddress.province}
              onChange={(e) => {
                const newProvince = e.target.value;
                setManualAddress({
                  province: newProvince,
                  city: '',
                  commune: '',
                  quartier: ''
                });
                setShowCustomCity(false);
                setShowCustomCommune(false);
                setShowCustomQuartier(false);
                onChange(`${fieldId}_province`, newProvince);
              }}
              required={required && locationMethod === 'manual'}
              className={commonClasses}
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

          {/* Ville ou Territoire */}
          {manualAddress.province && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ville ou Territoire {required && <span className="text-red-500">*</span>}
              </label>
              <select
                value={showCustomCity ? 'CUSTOM' : manualAddress.city}
                onChange={(e) => {
                  if (e.target.value === 'CUSTOM') {
                    setShowCustomCity(true);
                    setManualAddress({ ...manualAddress, city: '', commune: '', quartier: '' });
                  } else {
                    setShowCustomCity(false);
                    setManualAddress({
                      ...manualAddress,
                      city: e.target.value,
                      commune: '',
                      quartier: ''
                    });
                    onChange(`${fieldId}_city`, e.target.value);
                  }
                  setShowCustomCommune(false);
                  setShowCustomQuartier(false);
                }}
                required={required && locationMethod === 'manual'}
                className={commonClasses}
              >
                <option value="">Sélectionnez votre ville ou territoire</option>
                {getCitiesByProvince(manualAddress.province).map((city, index) => (
                  <option key={index} value={city.name}>
                    {city.name}
                  </option>
                ))}
                <option value="CUSTOM">Ma ville/territoire n'est pas dans la liste</option>
              </select>
            </div>
          )}

          {showCustomCity && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de votre ville ou territoire {required && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                value={customCity}
                onChange={(e) => {
                  setCustomCity(e.target.value);
                  onChange(`${fieldId}_city`, e.target.value);
                }}
                required={required && locationMethod === 'manual'}
                className={commonClasses}
                placeholder="Entrez le nom de votre ville ou territoire"
              />
            </div>
          )}

          {/* Commune */}
          {(manualAddress.city || showCustomCity) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commune {required && <span className="text-red-500">*</span>}
              </label>
              <select
                value={showCustomCommune ? 'CUSTOM' : manualAddress.commune}
                onChange={(e) => {
                  if (e.target.value === 'CUSTOM') {
                    setShowCustomCommune(true);
                    setManualAddress({ ...manualAddress, commune: '', quartier: '' });
                  } else {
                    setShowCustomCommune(false);
                    setManualAddress({
                      ...manualAddress,
                      commune: e.target.value,
                      quartier: ''
                    });
                    onChange(`${fieldId}_commune`, e.target.value);
                  }
                  setShowCustomQuartier(false);
                }}
                required={required && locationMethod === 'manual'}
                className={commonClasses}
              >
                <option value="">Sélectionnez votre commune</option>
                {!showCustomCity && getCommunesByCity(manualAddress.province, manualAddress.city).map((commune, index) => (
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de votre commune {required && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                value={customCommune}
                onChange={(e) => {
                  setCustomCommune(e.target.value);
                  onChange(`${fieldId}_commune`, e.target.value);
                }}
                required={required && locationMethod === 'manual'}
                className={commonClasses}
                placeholder="Entrez le nom de votre commune"
              />
            </div>
          )}

          {/* Quartier */}
          {(manualAddress.commune || showCustomCommune) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quartier {required && <span className="text-red-500">*</span>}
              </label>
              <select
                value={showCustomQuartier ? 'CUSTOM' : manualAddress.quartier}
                onChange={(e) => {
                  if (e.target.value === 'CUSTOM') {
                    setShowCustomQuartier(true);
                    setManualAddress({ ...manualAddress, quartier: '' });
                  } else {
                    setShowCustomQuartier(false);
                    setManualAddress({ ...manualAddress, quartier: e.target.value });
                    onChange(`${fieldId}_quartier`, e.target.value);
                  }
                }}
                required={required && locationMethod === 'manual'}
                className={commonClasses}
              >
                <option value="">Sélectionnez votre quartier</option>
                      {!showCustomCommune && quartiers.map((quartier, index) => (
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de votre quartier {required && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                value={customQuartier}
                onChange={(e) => {
                  setCustomQuartier(e.target.value);
                  onChange(`${fieldId}_quartier`, e.target.value);
                }}
                required={required && locationMethod === 'manual'}
                className={commonClasses}
                placeholder="Entrez le nom de votre quartier"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationInput;

