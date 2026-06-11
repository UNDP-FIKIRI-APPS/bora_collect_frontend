import React, { useMemo, useState } from "react";
import { allProvincesSVGData } from "../data/allProvincesSVG";
import "./CarteRDCSVG.css";
import enhancedApiService from "../services/enhancedApiService";
import { devLogger } from '../utils/logger';


interface Campaign {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  publisher: {
    name: string;
    email: string;
  };
  applicationsCount: number;
  isOngoing: boolean;
  isCompleted: boolean;
}

interface ProvinceData {
  province: string;
  population?: number;
  capitale?: string;
  code?: string;
  region?: string;
  message?: string;
  statistics?: {
    totalUsers: number;
    totalProjectManagers: number;
    totalEnumerators: number;
    totalAnalysts: number;
    totalCampaigns: number;
    ongoingCampaigns: number;
    completedCampaigns: number;
    totalRespondentsMasculin: number;
    totalRespondentsFeminin: number;
  };
  pmStatistics?: {
    totalCampaigns: number;
    ongoingCampaigns?: number;
    completedCampaigns?: number;
    totalEnumerators: number;
    totalRespondentsMasculin: number;
    totalRespondentsFeminin: number;
  };
  campaigns?: Campaign[];
  lastUpdated?: string;
}

interface CarteRDCSVGProps {
  onProvinceSelect?: (province: string) => void;
}

function CarteRDCSVG({ onProvinceSelect }: CarteRDCSVGProps) {
  const [currentRole] = useState<string | null>(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) return null;
      const parsed = JSON.parse(storedUser);
      return parsed?.role || null;
    } catch {
      return null;
    }
  });

  const statsEndpoint = useMemo(() => {
    return currentRole === "PROJECT_MANAGER" ? "/users/pm-province-stats" : "/users/province-stats";
  }, [currentRole]);
  const isProjectManager = currentRole === "PROJECT_MANAGER";

  const convertProvinceNameToCode = (provinceName: string): string | null => {
    if (!provinceName) return null;
    const normalized = provinceName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/['’\- ]+/g, "_")
      .toUpperCase();
    return normalized || null;
  };

  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [provinceData, setProvinceData] = useState<ProvinceData | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  
  // Déterminer les stats à utiliser selon le rôle
  const pmStats = useMemo(() => {
    if (currentRole === 'PROJECT_MANAGER') {
      return provinceData?.pmStatistics || null;
    } else {
      // Pour Admin, utiliser statistics pour les stats générales
      return provinceData?.statistics ? {
        totalCampaigns: provinceData.statistics.totalCampaigns,
        ongoingCampaigns: provinceData.statistics.ongoingCampaigns,
        completedCampaigns: provinceData.statistics.completedCampaigns,
        totalEnumerators: provinceData.statistics.totalEnumerators,
        totalRespondentsMasculin: provinceData.statistics.totalRespondentsMasculin,
        totalRespondentsFeminin: provinceData.statistics.totalRespondentsFeminin
      } : null;
    }
  }, [provinceData, currentRole]);

  // Fonction pour calculer le zoom et le centrage adaptatif pour chaque province
  const getProvinceTransform = (provinceName: string) => {
    // Coordonnées optimisées pour l'interface de retournement (viewBox 0 0 1000 800) - ZOOM ENCORE RÉDUIT
    const provinceCenters: { [key: string]: { x: number; y: number; scale: number; viewBox: string } } = {
      'Kinshasa': { x: 500, y: 750, scale: 1.4, viewBox: "0 0 1000 800" },
      'Kongo Central': { x: 250, y: 700, scale: 1.3, viewBox: "0 0 1000 800" },
      'Kwango': { x: 375, y: 625, scale: 1.2, viewBox: "0 0 1000 800" },
      'Kwilu': { x: 437, y: 562, scale: 1.2, viewBox: "0 0 1000 800" },
      'Mai-Ndombe': { x: 500, y: 500, scale: 1.2, viewBox: "0 0 1000 800" },
      'Kasaï': { x: 562, y: 437, scale: 1.2, viewBox: "0 0 1000 800" },
      'Kasaï-Central': { x: 625, y: 375, scale: 1.2, viewBox: "0 0 1000 800" },
      'Kasaï-Oriental': { x: 687, y: 312, scale: 1.2, viewBox: "0 0 1000 800" },
      'Lomami': { x: 750, y: 250, scale: 1.2, viewBox: "0 0 1000 800" },
      'Sankuru': { x: 812, y: 187, scale: 1.2, viewBox: "0 0 1000 800" },
      'Maniema': { x: 875, y: 250, scale: 1.2, viewBox: "0 0 1000 800" },
      'Sud-Kivu': { x: 937, y: 312, scale: 1.2, viewBox: "0 0 1000 800" },
      'Nord-Kivu': { x: 937, y: 375, scale: 1.2, viewBox: "0 0 1000 800" },
      'Ituri': { x: 1000, y: 437, scale: 1.2, viewBox: "0 0 1000 800" },
      'Haut-Uele': { x: 1062, y: 375, scale: 1.2, viewBox: "0 0 1000 800" },
      'Bas-Uele': { x: 1000, y: 312, scale: 1.2, viewBox: "0 0 1000 800" },
      'Tshopo': { x: 937, y: 250, scale: 1.2, viewBox: "0 0 1000 800" },
      'Mongala': { x: 750, y: 125, scale: 1.2, viewBox: "0 0 1000 800" },
      'Nord-Ubangi': { x: 625, y: 62, scale: 1.2, viewBox: "0 0 1000 800" },
      'Sud-Ubangi': { x: 562, y: 125, scale: 1.2, viewBox: "0 0 1000 800" },
      'Équateur': { x: 500, y: 187, scale: 1.2, viewBox: "0 0 1000 800" },
      'Tshuapa': { x: 437, y: 250, scale: 1.2, viewBox: "0 0 1000 800" },
      'Tanganyika': { x: 812, y: 437, scale: 1.2, viewBox: "0 0 1000 800" },
      'Haut-Lomami': { x: 750, y: 500, scale: 1.2, viewBox: "0 0 1000 800" },
      'Lualaba': { x: 687, y: 562, scale: 1.2, viewBox: "0 0 1000 800" },
      'Haut-Katanga': { x: 625, y: 625, scale: 1.2, viewBox: "0 0 1000 800" }
    };

    const center = provinceCenters[provinceName] || { x: 500, y: 400, scale: 1.2, viewBox: "0 0 1000 800" };
    
    return {
      transform: `translate(${center.x}, ${center.y}) scale(${center.scale}) translate(-${center.x}, -${center.y})`,
      centerX: center.x,
      centerY: center.y,
      scale: center.scale,
      viewBox: center.viewBox
    };
  };

  const handleProvinceClick = async (provinceName: string) => {
    setSelectedProvince(provinceName);
    setIsCardFlipped(true); // Déclencher l'effet de retournement
    
    // Appeler le callback si fourni
    if (onProvinceSelect) {
      onProvinceSelect(provinceName);
    }
    
    try {
      const provinceCode = convertProvinceNameToCode(provinceName);
      if (!provinceCode) {
        setProvinceData({
          province: provinceName,
          message: "Province inconnue. Impossible de récupérer les données."
        });
        return;
      }

      const stats = await enhancedApiService.get<any>(
        `${statsEndpoint}?province=${encodeURIComponent(provinceName)}`,
        { skipCache: true },
      );

      if (stats) {
        devLogger.log('📊 Données reçues du backend:', stats);
        devLogger.log('👤 Rôle actuel:', currentRole);
        
        // Pour PM, utiliser pmStatistics directement
        // Pour Admin, utiliser statistics
        const dataToSet: ProvinceData = {
          province: stats.province || provinceName,
          campaigns: stats.campaigns || [],
          message: stats.message || `Statistiques pour ${stats.province || provinceName}`,
          lastUpdated: stats.lastUpdated
        };

        if (currentRole === 'PROJECT_MANAGER') {
          // Pour PM, prioriser pmStatistics
          dataToSet.pmStatistics = stats.pmStatistics || undefined;
          dataToSet.statistics = undefined; // PM n'a pas besoin de statistics
        } else {
          // Pour Admin, utiliser statistics
          dataToSet.statistics = stats.statistics || undefined;
          dataToSet.pmStatistics = stats.pmStatistics || undefined; // Garder aussi pmStatistics si disponible
        }

        devLogger.log('📦 Données à définir:', dataToSet);
        setProvinceData(dataToSet);
      }
    } catch (err: any) {
      console.error('Erreur lors de la récupération des données:', err);
      
      // Gestion des erreurs spécifiques
      if ((err as any).response?.status === 401) {
        setProvinceData({
          province: provinceName,
          message: "Session expirée. Veuillez vous reconnecter."
        });
      } else if ((err as any).response?.status === 404) {
        setProvinceData({
          province: provinceName,
          message: "Province non trouvée dans la base de données."
        });
      } else if ((err as any).code === 'NETWORK_ERROR' || !(err as any).response) {
        setProvinceData({
          province: provinceName,
          message: "Impossible de se connecter au serveur. Vérifiez que le backend est démarré."
        });
      } else {
        setProvinceData({
          province: provinceName,
          message: `Erreur serveur: ${(err as any).response?.status || 'Inconnue'}`
        });
      }
    }
  };

  const handleProvinceHover = (provinceName: string, event: React.MouseEvent) => {
    setHoveredProvince(provinceName);
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  const handleProvinceLeave = () => {
    setHoveredProvince(null);
  };

  const handleBackToFullMap = () => {
    setIsCardFlipped(false);
    setSelectedProvince(null);
    setProvinceData(null);
  };

  return (
    <div className="relative w-full">
      {/* Styles CSS pour l'effet de retournement et zoom professionnel */}
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
        .flipped {
          transform: rotateY(180deg);
        }
        .province-zoom-container {
          transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .province-path {
          transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
        }
        .province-path:hover {
          filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.2));
          transform: scale(1.02);
        }
      `}</style>

      {/* Titre de la carte */}
      <div className="text-center mb-4">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Carte Interactive de la RDC
        </h2>
        <p className="text-gray-600 text-lg">Cliquez sur une province pour voir les détails</p>
      </div>

      {/* Carte avec effet de retournement */}
      <div className="w-full flex justify-center perspective-1000">
        <div 
          className={`relative w-full max-w-4xl transition-transform duration-700 transform-style-preserve-3d ${
            isCardFlipped ? 'flipped' : ''
          }`}
        >
          {/* Recto - Carte complète de la RDC */}
          <div className="backface-hidden">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              xmlnsXlink="http://www.w3.org/1999/xlink" 
              version="1.1" 
              viewBox="10 10 760 690"
              className="w-full"
              style={{ height: 'auto', minHeight: '750px', maxHeight: '900px' }}
            >
              <g>
                {allProvincesSVGData.map((province) => (
                  <path
                    key={province.id}
                    id={province.id}
                    className={`land cursor-pointer transition-all duration-200 ${
                      selectedProvince === province.name ? "selected" : ""
                    } ${hoveredProvince === province.name ? "hovered" : ""}`}
                    d={province.path}
                    onClick={() => handleProvinceClick(province.name)}
                    onMouseEnter={(e) => handleProvinceHover(province.name, e)}
                    onMouseLeave={handleProvinceLeave}
                  />
                ))}
              </g>
            </svg>
          </div>

          {/* Verso - Carte de la province sélectionnée SANS FENÊTRE */}
          <div className="absolute inset-0 backface-hidden rotate-y-180">
            {selectedProvince && (
              <div className="w-full h-full">
                {/* Bouton retour - Positionné en overlay */}
                <div className="absolute top-4 left-4 z-10">
                  <button
                    onClick={handleBackToFullMap}
                    className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
                    title="Retour à la carte complète"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </button>
                </div>

                {/* Carte SVG de la province sélectionnée - INTERFACE OPTIMISÉE POUR RETOURNEMENT */}
                <div className="w-full flex justify-center province-zoom-container">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    xmlnsXlink="http://www.w3.org/1999/xlink" 
                    version="1.1" 
                    viewBox={getProvinceTransform(selectedProvince).viewBox}
                    className="w-full max-w-5xl h-auto"
                    style={{ minHeight: '500px', maxHeight: '600px' }}
                  >
                    <g transform={getProvinceTransform(selectedProvince).transform}>
                      {allProvincesSVGData
                        .filter(province => province.name === selectedProvince)
                        .map((province) => (
                          <path
                            key={province.id}
                            id={province.id}
                            className="land cursor-pointer province-path selected"
                            d={province.path}
                          />
                        ))}
                    </g>
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tooltip pour afficher le nom de la province au survol */}
      {hoveredProvince && (
        <div 
          className="fixed bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium pointer-events-none z-50"
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y - 30,
          }}
        >
          {hoveredProvince}
        </div>
      )}

      {/* Données de la province sélectionnée - Affichées dans tous les cas */}
      {provinceData && (
        <div className="mt-8 max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow-xl p-8 border border-gray-200 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-3xl font-bold text-gray-800">
                  Données de {provinceData.province}
                </h3>
                <button
                  onClick={() => setIsCardFlipped(true)}
                  className="ml-4 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Voir la carte de la province
                </button>
              </div>
            </div>
            
            {/* Statistiques globales pour l'administrateur */}
            {provinceData.statistics && !isProjectManager && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-xl border border-indigo-200 hover:shadow-lg hover:scale-105 transition-all duration-300 group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 transition-colors duration-300">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <span className="text-gray-600 font-semibold">Total utilisateurs</span>
                  </div>
                  <span className="font-bold text-indigo-700 text-xl">
                    {provinceData.statistics.totalUsers ?? 0}
                  </span>
                </div>

                <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-6 rounded-xl border border-teal-200 hover:shadow-lg hover:scale-105 transition-all duration-300 group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center group-hover:bg-teal-600 transition-colors duration-300">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857" />
                      </svg>
                    </div>
                    <span className="text-gray-600 font-semibold">Project Managers</span>
                  </div>
                  <span className="font-bold text-teal-700 text-xl">
                    {provinceData.statistics.totalProjectManagers ?? 0}
                  </span>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-xl border border-amber-200 hover:shadow-lg hover:scale-105 transition-all duration-300 group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center group-hover:bg-amber-600 transition-colors duration-300">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
                      </svg>
                    </div>
                    <span className="text-gray-600 font-semibold">Enquêteurs</span>
                  </div>
                  <span className="font-bold text-amber-700 text-xl">
                    {provinceData.statistics.totalEnumerators ?? 0}
                  </span>
                </div>

                <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-6 rounded-xl border border-pink-200 hover:shadow-lg hover:scale-105 transition-all duration-300 group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-pink-500 rounded-lg flex items-center justify-center group-hover:bg-pink-600 transition-colors duration-300">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
                      </svg>
                    </div>
                    <span className="text-gray-600 font-semibold">Analystes</span>
                  </div>
                  <span className="font-bold text-pink-700 text-xl">
                    {provinceData.statistics.totalAnalysts ?? 0}
                  </span>
                </div>
              </div>
            )}

            {/* Informations générales de la province */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 hover:shadow-lg hover:scale-105 transition-all duration-300 group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors duration-300">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <span className="text-gray-600 font-semibold">Campagnes</span>
                </div>
                <span className="font-bold text-blue-700 text-xl">
                  {pmStats?.totalCampaigns ?? 0}
                </span>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 hover:shadow-lg hover:scale-105 transition-all duration-300 group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center group-hover:bg-purple-600 transition-colors duration-300">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <span className="text-gray-600 font-semibold">Enquêteurs</span>
                </div>
                <span className="font-bold text-purple-700 text-xl">
                  {pmStats?.totalEnumerators ?? 0}
                </span>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200 hover:shadow-lg hover:scale-105 transition-all duration-300 group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center group-hover:bg-orange-600 transition-colors duration-300">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-gray-600 font-semibold">Masculin</span>
                </div>
                <span className="font-bold text-orange-700 text-xl">
                  {pmStats?.totalRespondentsMasculin ?? 0}
                </span>
              </div>
              
              <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl border border-red-200 hover:shadow-lg hover:scale-105 transition-all duration-300 group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center group-hover:bg-red-600 transition-colors duration-300">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-gray-600 font-semibold">Féminin</span>
                </div>
                <span className="font-bold text-red-700 text-xl">
                  {pmStats?.totalRespondentsFeminin ?? 0}
                </span>
              </div>
            </div>

            {/* Statistiques des campagnes et utilisateurs */}
            {pmStats && (
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h4 className="text-2xl font-bold text-gray-800">
                    {currentRole === 'PROJECT_MANAGER' ? 'Statistiques PM' : 'Statistiques Générales'}
                  </h4>
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
                  .flipped {
                    transform: rotateY(180deg);
                  }
                `}</style>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Carte Total Campagnes */}
                  <div 
                    className="relative w-full h-40 cursor-pointer perspective-1000 hover:scale-105 transition-transform duration-300"
                    onClick={() => {
                      const card = document.getElementById('totalCampaignsCard');
                      if (card) {
                        card.classList.toggle('flipped');
                      }
                    }}
                  >
                    <div id="totalCampaignsCard" className="relative w-full h-full transition-transform duration-700 transform-style-preserve-3d">
                      {/* Recto */}
                      <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow duration-300">
                        <div className="text-center text-white">
                          <div className="mb-3 hover:scale-110 transition-transform duration-200 relative">
                            <div className="absolute inset-0 bg-white opacity-20 rounded-full blur-sm"></div>
                            <svg className="w-10 h-10 mx-auto relative z-10 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                            </svg>
                          </div>
                          <div className="text-lg font-semibold">Total Campagnes</div>
                          <div className="text-sm opacity-80 mt-2 animate-pulse">Cliquez pour voir</div>
                        </div>
                      </div>
                      {/* Verso */}
                      <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg flex items-center justify-center rotate-y-180">
                        <div className="text-center text-white">
                          <div className="text-4xl font-bold mb-3">
                            <span className="animate-bounce hover:animate-pulse transition-all duration-300 hover:scale-110 hover:text-yellow-200">
                              {pmStats?.totalCampaigns ?? 0}
                            </span>
                          </div>
                          <div className="text-sm space-y-1">
                            <div>Enquêteurs: <span className="animate-bounce font-bold">{pmStats?.totalEnumerators ?? 0}</span></div>
                            <div>Répondants: <span className="animate-bounce font-bold">{(pmStats?.totalRespondentsMasculin ?? 0) + (pmStats?.totalRespondentsFeminin ?? 0)}</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Carte Détails Campagnes */}
                  <div 
                    className="relative w-full h-40 cursor-pointer perspective-1000 hover:scale-105 transition-transform duration-300"
                    onClick={() => {
                      const card = document.getElementById('detailsCampaignsCard');
                      if (card) {
                        card.classList.toggle('flipped');
                      }
                    }}
                  >
                    <div id="detailsCampaignsCard" className="relative w-full h-full transition-transform duration-700 transform-style-preserve-3d">
                      {/* Recto */}
                      <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow duration-300">
                        <div className="text-center text-white">
                          <div className="mb-3 hover:scale-110 transition-transform duration-200 relative">
                            <div className="absolute inset-0 bg-white opacity-20 rounded-full blur-sm"></div>
                            <svg className="w-10 h-10 mx-auto relative z-10 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                            </svg>
                          </div>
                          <div className="text-lg font-semibold">Répondants</div>
                          <div className="text-sm opacity-80 mt-2 animate-pulse">Cliquez pour voir</div>
                        </div>
                      </div>
                      {/* Verso */}
                      <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg flex items-center justify-center rotate-y-180">
                        <div className="text-center text-white">
                          <div className="text-sm space-y-2">
                            <div className="flex items-center justify-center gap-2">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                              </svg>
                              <span>Masculin: <span className="animate-bounce font-bold">{pmStats?.totalRespondentsMasculin ?? 0}</span></span>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                              </svg>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
                              </svg>
                              <span>Féminin: <span className="animate-bounce font-bold">{pmStats?.totalRespondentsFeminin ?? 0}</span></span>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
                              </svg>
                              <span>Total Enquêteurs: <span className="animate-bounce font-bold">{pmStats?.totalEnumerators ?? 0}</span></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Liste des campagnes */}
            {provinceData.campaigns && provinceData.campaigns.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h4 className="text-2xl font-bold text-gray-800">Liste des Campagnes</h4>
                </div>
                <div className="space-y-6">
                  {provinceData.campaigns.map((campaign) => (
                    <div key={campaign.id} className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group">
                      <div className="flex justify-between items-start mb-4">
                        <h5 className="font-bold text-gray-800 text-xl group-hover:text-gray-900 transition-colors duration-300">{campaign.title}</h5>
                        <div className="flex space-x-2">
                          {campaign.isOngoing && (
                            <span className="bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium border border-yellow-300">
                              En Cours
                            </span>
                          )}
                          {campaign.isCompleted && (
                            <span className="bg-gradient-to-r from-green-100 to-green-200 text-green-800 px-3 py-1 rounded-full text-sm font-medium border border-green-300">
                              Terminée
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-600 mb-4 text-lg">{campaign.description}</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-gray-500 font-medium">Date de début:</span>
                            <p className="text-gray-800 font-semibold">{new Date(campaign.startDate).toLocaleDateString('fr-FR')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-gray-500 font-medium">Date de fin:</span>
                            <p className="text-gray-800 font-semibold">{new Date(campaign.endDate).toLocaleDateString('fr-FR')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-gray-500 font-medium">Personnes interviewées:</span>
                            <p className="text-gray-800 font-bold text-lg">{campaign.applicationsCount}</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div>
                            <span className="text-gray-500 font-medium">Responsable:</span>
                            <p className="text-gray-800 font-semibold">
                              {campaign.publisher?.name || 'Non spécifié'} 
                              {campaign.publisher?.email && ` (${campaign.publisher.email})`}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message d'erreur */}
            {provinceData.message && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-700 font-medium">{provinceData.message}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CarteRDCSVG;
