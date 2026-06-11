import React from 'react';
import { Download, RefreshCw } from 'lucide-react';
import Pagination from '../../components/Pagination';
import { exportEnquetesToExcel } from '../../utils/excelExport';

const communesKinshasa = [
  'Gombe', 'Kinshasa', 'Kintambo', 'Ngaliema', 'Mont-Ngafula',
  'Selembao', 'Bumbu', 'Makala', 'Ngiri-Ngiri', 'Kalamu',
  'Kasa-Vubu', 'Bandalungwa', 'Lingwala', 'Barumbu', 'Matete',
  'Lemba', 'Ngaba', 'Kisenso', 'Limete', 'Masina',
  'Nsele', 'Maluku', 'Kimbaseke', 'Ndjili'
];

export interface AnalystEnquetesViewProps {
  selectedEnumeratorId: string | null;
  analystStats: any;
  selectedCampaignId: string | null;
  setShowDeleteConfirmModal: (show: boolean) => void;
  enumeratorSubmissions: any;
  setSelectedEnumeratorId: (id: string | null) => void;
  setEnumeratorSubmissions: (data: any) => void;
  setSearch: (search: string) => void;
  setCommuneFilter: (filter: string) => void;
  fetchEnumeratorStats: (campaignId: string) => Promise<void>;
  enumeratorSubmissionsLoading: boolean;
  campaignData: any;
  exportAllEnumeratorsSubmissions: (campaignId?: string) => Promise<void>;
  enumeratorStats: any[];
  enumeratorStatsLoading: boolean;
  search: string;
  communeFilter: string;
  provinceFilter: string;
  setProvinceFilter: (filter: string) => void;
  handleEnumeratorClick: (enumeratorId: string, campaignId: string) => Promise<void>;
  records: any[];
  setSelectedCampaignId: (id: string | null) => void;
  fetchRecords: (page?: number, append?: boolean) => Promise<void>;
  fetchAnalystCampaignData: () => Promise<void>;
  setSelectedRecord: (record: any) => void;
  setShowDetailModal: (show: boolean) => void;
  setExportNotification: React.Dispatch<React.SetStateAction<{
    isVisible: boolean;
    isSuccess: boolean;
    message: string;
  }>>;
  hasMore: boolean;
  observerTarget: React.RefObject<HTMLDivElement | null>;
  recordsLoading: boolean;
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
  setCurrentPage: (page: number) => void;
}

export default function AnalystEnquetesView({
  selectedEnumeratorId,
  analystStats,
  selectedCampaignId,
  setShowDeleteConfirmModal,
  enumeratorSubmissions,
  setSelectedEnumeratorId,
  setEnumeratorSubmissions,
  setSearch,
  setCommuneFilter,
  fetchEnumeratorStats,
  enumeratorSubmissionsLoading,
  campaignData,
  exportAllEnumeratorsSubmissions,
  enumeratorStats,
  enumeratorStatsLoading,
  search,
  communeFilter,
  provinceFilter,
  setProvinceFilter,
  handleEnumeratorClick,
  records,
  setSelectedCampaignId,
  fetchRecords,
  fetchAnalystCampaignData,
  setSelectedRecord,
  setShowDetailModal,
  setExportNotification,
  hasMore,
  observerTarget,
  recordsLoading,
  currentPage,
  totalPages,
  totalRecords,
  pageSize,
  setCurrentPage,
}: AnalystEnquetesViewProps) {
  return (
    <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center">
              {selectedEnumeratorId ? 'Formulaires de l\'enquêteur' : 'Liste des Enquêteurs'}
            </h1>

            {/* Compteurs globaux - affichés seulement si aucun enquêteur n'est sélectionné */}
            {!selectedEnumeratorId && analystStats && (
              <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
                <h2 className="text-lg font-semibold mb-4 text-center">Statistiques globales</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {analystStats.totalByApplication || 0}
                    </div>
                    <div className="text-blue-800 font-medium">Formulaires par enquêteur (Application)</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {analystStats.totalByPublicLink || 0}
                    </div>
                    <div className="text-green-800 font-medium">Formulaires par lien public</div>
                  </div>
                </div>
              </div>
            )}

            {/* Bouton pour supprimer les doublons */}
            {!selectedEnumeratorId && selectedCampaignId && (
              <div className="mb-4 flex justify-end">
                <button
                  onClick={() => {
                    if (!selectedCampaignId) return;
                    setShowDeleteConfirmModal(true);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Supprimer les doublons
                </button>
              </div>
            )}
            
            {/* Bouton de retour si un enquêteur est sélectionné */}
            {selectedEnumeratorId && enumeratorSubmissions && (
              <div className="mb-4">
                <button
                  onClick={() => {
                    setSelectedEnumeratorId(null);
                    setEnumeratorSubmissions(null);
                    setSearch('');
                    setCommuneFilter('');
                    // Recharger les stats des enquêteurs
                    if (selectedCampaignId) {
                      fetchEnumeratorStats(selectedCampaignId);
                    }
                  }}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Retour à la liste des enquêteurs
                </button>
              </div>
            )}
            
            {/* Si un enquêteur est sélectionné, afficher ses formulaires */}
            {selectedEnumeratorId && enumeratorSubmissions ? (
                <div>
                {/* Statistiques de l'enquêteur */}
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg mb-4 sm:mb-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600 mb-2">
                          {enumeratorSubmissions.appSubmissions?.length || 0}
                </div>
                        <div className="text-blue-800 font-medium">Par application</div>
                </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600 mb-2">
                          {enumeratorSubmissions.publicSubmissions?.length || 0}
              </div>
                        <div className="text-green-800 font-medium">Par lien public</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600 mb-2">
                          {enumeratorSubmissions.total || 0}
                        </div>
                        <div className="text-purple-800 font-medium">Total</div>
                      </div>
                    </div>
                    {/* Bouton d'export Excel */}
                 <button
                   onClick={() => {
                        const allSubmissions = [
                          ...(enumeratorSubmissions.appSubmissions || []).map((s: any) => ({
                            ...s,
                            authorName: s.author?.name || 'N/A',
                            source: 'application'
                          })),
                          ...(enumeratorSubmissions.publicSubmissions || []).map((s: any) => ({
                            ...s,
                            authorName: s.author?.name || s.submitterName || 'N/A',
                            source: 'public_link'
                          }))
                        ];
                        const fileName = `formulaires_${enumeratorSubmissions.enumeratorName || 'enqueteur'}_${new Date().toISOString().split('T')[0]}`;
                        const success = exportEnquetesToExcel(allSubmissions, fileName);
                        if (success) {
                          setExportNotification({
                            isVisible: true,
                            isSuccess: true,
                            message: 'Export Excel réussi !'
                          });
                        }
                      }}
                      className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold"
                 >
                   <Download className="h-4 w-4" />
                   Exporter en Excel
                 </button>
               </div>
            </div>

                {/* Liste des formulaires par application */}
                {enumeratorSubmissions.appSubmissions && enumeratorSubmissions.appSubmissions.length > 0 && (
                  <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
                    <h3 className="text-lg font-semibold mb-4 text-blue-800">
                      Formulaires soumis par application ({
                        enumeratorSubmissions.appSubmissions.filter((s: any) => {
                          if (!search) return true;
                          const nomOuCode = s.formData?.['identification.nomOuCode'] || s.formData?.household?.nomOuCode || '';
                          return nomOuCode.toLowerCase().includes(search.toLowerCase());
                        }).length
                      })
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {enumeratorSubmissions.appSubmissions.filter((s: any) => {
                        if (!search) return true;
                        const nomOuCode = s.formData?.['identification.nomOuCode'] || s.formData?.household?.nomOuCode || '';
                        return nomOuCode.toLowerCase().includes(search.toLowerCase());
                      }).map((submission: any) => (
                        <div
                          key={submission.id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => {
                            setSelectedRecord(submission);
                            setShowDetailModal(true);
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Application</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              submission.analystValidationStatus === 'VALIDATED' ? 'bg-green-100 text-green-800' :
                              submission.analystValidationStatus === 'NEEDS_REVIEW' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {submission.analystValidationStatus === 'VALIDATED' ? 'Validé' :
                               submission.analystValidationStatus === 'NEEDS_REVIEW' ? 'À revoir' :
                               'En attente'}
                            </span>
                      </div>
                          <p className="text-sm font-medium text-gray-900 mt-2">
                            {submission.formData?.['identification.nomOuCode'] || submission.formData?.household?.nomOuCode || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(submission.createdAt).toLocaleDateString('fr-FR')}
                          </p>
                      </div>
                      ))}
                    </div>
                      </div>
                )}

                {/* Liste des formulaires par lien public */}
                {enumeratorSubmissions.publicSubmissions && enumeratorSubmissions.publicSubmissions.length > 0 && (
                  <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
                    <h3 className="text-lg font-semibold mb-4 text-green-800">
                      Formulaires soumis par lien public ({
                        enumeratorSubmissions.publicSubmissions.filter((s: any) => {
                          if (!search) return true;
                          const nomOuCode = s.formData?.['identification.nomOuCode'] || s.formData?.household?.nomOuCode || '';
                          return nomOuCode.toLowerCase().includes(search.toLowerCase());
                        }).length
                      })
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {enumeratorSubmissions.publicSubmissions.filter((s: any) => {
                        if (!search) return true;
                        const nomOuCode = s.formData?.['identification.nomOuCode'] || s.formData?.household?.nomOuCode || '';
                        return nomOuCode.toLowerCase().includes(search.toLowerCase());
                      }).map((submission: any) => (
                        <div
                          key={submission.id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => {
                            setSelectedRecord(submission);
                            setShowDetailModal(true);
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Lien public</span>
                            {submission.submitterName && (
                              <span className="text-xs text-gray-600">{submission.submitterName}</span>
                            )}
                      </div>
                          <p className="text-sm font-medium text-gray-900 mt-2">
                            {submission.formData?.['identification.nomOuCode'] || submission.formData?.household?.nomOuCode || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(submission.createdAt).toLocaleDateString('fr-FR')}
                          </p>
                      </div>
                      ))}
                    </div>
              </div>
            )}

                {enumeratorSubmissionsLoading && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-600">Chargement des formulaires...</p>
                  </div>
                )}
              </div>
            ) : (
              /* Liste des enquêteurs avec leurs stats */
              <div>
                {/* Afficher la campagne actuelle */}
                {selectedCampaignId && campaignData?.campaign && (
                  <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg mb-4 sm:mb-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          Campagne : {campaignData.campaign.title}
                  </h3>
                        <p className="text-sm text-gray-600">
                          {campaignData.campaign.description}
                        </p>
                </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                        onClick={() => {
                            if (selectedCampaignId) {
                              fetchEnumeratorStats(selectedCampaignId);
                            }
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Actualiser
                        </button>
                          </div>
                        </div>
                          </div>
                )}

                {/* Bouton d'export global - visible même si la campagne n'est pas chargée */}
                {selectedCampaignId && enumeratorStats.length > 0 && (
                  <div className="mb-4 flex justify-end">
                    <button
                      onClick={() => {
                        if (selectedCampaignId) {
                          exportAllEnumeratorsSubmissions(selectedCampaignId);
                        }
                      }}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl"
                    >
                      <Download className="h-5 w-5" />
                      <span className="hidden sm:inline">Exporter tous les formulaires</span>
                      <span className="sm:hidden">Exporter tout</span>
                    </button>
                          </div>
                )}

                {/* Filtres de recherche */}
                <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-4">
                  <h3 className="text-lg font-semibold mb-4">Filtres de recherche</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Recherche par nom d'enquêteur */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rechercher par nom d'enquêteur
                      </label>
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Nom de l'enquêteur..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    {/* Recherche par nom de personne (pour les formulaires) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rechercher par nom de personne (formulaires)
                      </label>
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Nom de la personne concernée..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    {/* Filtre par commune */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Filtrer par commune
                      </label>
                      <select
                        value={communeFilter}
                        onChange={(e) => setCommuneFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Toutes les communes</option>
                        {communesKinshasa.map((commune) => (
                          <option key={commune} value={commune}>
                            {commune}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Filtre par province */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Filtrer par province
                      </label>
                      <select
                        value={provinceFilter}
                        onChange={(e) => setProvinceFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Toutes les provinces</option>
                        <option value="KINSHASA">Kinshasa</option>
                        <option value="BAS_UELE">Bas-Uélé</option>
                        <option value="EQUATEUR">Équateur</option>
                        <option value="HAUT_KATANGA">Haut-Katanga</option>
                        <option value="HAUT_LOMAMI">Haut-Lomami</option>
                        <option value="HAUT_UELE">Haut-Uélé</option>
                        <option value="ITURI">Ituri</option>
                        <option value="KASAI">Kasaï</option>
                        <option value="KASAI_CENTRAL">Kasaï-Central</option>
                        <option value="KASAI_ORIENTAL">Kasaï-Oriental</option>
                        <option value="KONGO_CENTRAL">Kongo Central</option>
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
                  </div>
                </div>

                {/* Chargement des stats */}
                {enumeratorStatsLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-600">Chargement des enquêteurs...</p>
                  </div>
                ) : enumeratorStats.length > 0 ? (
                  <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
                    <h3 className="text-lg font-semibold mb-4">Enquêteurs ({enumeratorStats.filter((e: any) => {
                      const matchesSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase());
                      return matchesSearch;
                    }).length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {enumeratorStats.filter((enumerator: any) => {
                        const matchesSearch = !search || enumerator.name.toLowerCase().includes(search.toLowerCase()) || enumerator.email.toLowerCase().includes(search.toLowerCase());
                        return matchesSearch;
                      }).map((enumerator: any) => (
                        <div
                          key={enumerator.id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => {
                            if (selectedCampaignId) {
                              handleEnumeratorClick(enumerator.id, selectedCampaignId);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-blue-600 font-bold">
                                  {enumerator.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{enumerator.name}</p>
                                <p className="text-xs text-gray-500">{enumerator.email}</p>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            <div className="text-center p-2 bg-blue-50 rounded">
                              <div className="text-lg font-bold text-blue-600">{enumerator.appSubmissionsCount || 0}</div>
                              <div className="text-xs text-blue-800">Par app</div>
                            </div>
                            <div className="text-center p-2 bg-green-50 rounded">
                              <div className="text-lg font-bold text-green-600">{enumerator.publicLinkSubmissionsCount || 0}</div>
                              <div className="text-xs text-green-800">Par lien</div>
                            </div>
                        </div>
                      </div>
                    ))}
                    </div>
                  </div>
                ) : selectedCampaignId ? (
                  <div className="text-center py-8 text-gray-500">
                    Aucun enquêteur trouvé pour cette campagne
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">Veuillez sélectionner une campagne pour voir les enquêteurs</p>
                      {campaignData?.campaign && (
                        <button
                          onClick={() => {
                            const campaignId = campaignData.campaign.id;
                            setSelectedCampaignId(campaignId);
                            fetchEnumeratorStats(campaignId);
                          }}
                          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                        >
                          Charger la campagne : {campaignData.campaign.title}
                        </button>
                      )}
                      {records.length > 0 && !campaignData?.campaign && (
                        <div className="mt-4">
                          <p className="text-sm text-gray-600 mb-2">Sélectionner une campagne depuis vos enregistrements :</p>
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                setSelectedCampaignId(e.target.value);
                                fetchEnumeratorStats(e.target.value);
                              }
                            }}
                            className="w-full max-w-md mx-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">-- Sélectionner une campagne --</option>
                            {Array.from(new Set(records.map((r: any) => r.surveyId || r.campaignId).filter(Boolean))).map((surveyId: string) => {
                              const record = records.find((r: any) => (r.surveyId || r.campaignId) === surveyId);
                              const surveyTitle = record?.survey?.title || `Campagne ${surveyId.substring(0, 8)}...`;
                              return (
                                <option key={surveyId} value={surveyId}>
                                  {surveyTitle}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}
                      {analystStats && analystStats.totalRecords > 0 && records.length === 0 && !campaignData?.campaign && (
                        <div className="mt-4">
                          <p className="text-sm text-gray-600 mb-2">
                            Vous avez {analystStats.totalRecords} enregistrements mais aucune campagne assignée.
                          </p>
                          <p className="text-xs text-gray-500 mb-4">
                            Veuillez contacter un administrateur pour vous assigner une campagne, ou rechargez la page pour voir si les enregistrements se chargent.
                          </p>
                          <button
                            onClick={() => {
                              fetchRecords(1);
                              fetchAnalystCampaignData();
                            }}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                          >
                            Recharger les données
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Élément d'observation pour le chargement au scroll (infinite scroll) */}
            {!selectedEnumeratorId && hasMore && (
              <div ref={observerTarget} className="h-10 flex items-center justify-center">
                {recordsLoading && (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-sm text-gray-600">Chargement...</p>
                  </div>
                )}
              </div>
            )}

            {/* Pagination pour les records - affichée même s'il n'y a qu'une seule page */}
            {!selectedEnumeratorId && records.length > 0 && (
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages || 1}
                  totalItems={totalRecords || records.length}
                  pageSize={pageSize}
                  onPageChange={(page) => {
                    setCurrentPage(page);
                    fetchRecords(page, false); // Ne pas append lors du changement de page manuel
                  }}
                  loading={false}
                />
              </div>
            )}
    </div>
  );
}
