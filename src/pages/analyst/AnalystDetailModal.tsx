import React from 'react';

export interface AnalystDetailModalProps {
  selectedRecord: any;
  showCommentField: boolean;
  reviewComment: string;
  setReviewComment: (comment: string) => void;
  recordActionLocked: boolean;
  recordActionMessage: string | null;
  onClose: () => void;
  onValidate: (recordId: string, status: 'VALIDATED' | 'NEEDS_REVIEW') => void;
  setShowCommentField: (show: boolean) => void;
}

export default function AnalystDetailModal({
  selectedRecord,
  showCommentField,
  reviewComment,
  setReviewComment,
  recordActionLocked,
  recordActionMessage,
  onClose,
  onValidate,
  setShowCommentField,
}: AnalystDetailModalProps) {
  return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              {/* En-tête du modal */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                  Détails de l'enquête - {selectedRecord.formData?.['identification.nomOuCode'] || selectedRecord.formData?.household?.nomOuCode || 'Ménage'}
                </h3>
                  <p className="text-sm text-gray-600">
                    Enquêteur : {selectedRecord.author?.name || selectedRecord.submitterName || 'N/A'} - Campagne : {selectedRecord.survey?.title || 'N/A'}
                  </p>
                  {selectedRecord.source === 'public_link' && selectedRecord.submitterName && (
                    <p className="text-xs text-gray-500 mt-1">
                      Soumis par : {selectedRecord.submitterName} {selectedRecord.submitterContact ? `(${selectedRecord.submitterContact})` : ''}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 ml-4"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Contenu du modal */}
              <div className="max-h-96 overflow-y-auto">
                {/* 1. Identification du ménage */}
                <div className="mb-6">
                  <h4 className="text-md font-semibold text-gray-800 mb-3 border-b pb-2 flex items-center">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold mr-2">1</span>
                    Identification du ménage
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <span className="font-medium text-gray-700">Nom ou code du ménage :</span>
                      <div className="mt-1 text-gray-900 font-semibold">{selectedRecord.formData?.['identification.nomOuCode'] || selectedRecord.formData?.household?.nomOuCode || 'N/A'}</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <span className="font-medium text-gray-700">Âge :</span>
                      <div className="mt-1 text-gray-900 font-semibold">{selectedRecord.formData?.['identification.age'] || selectedRecord.formData?.household?.age || 'N/A'} ans</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <span className="font-medium text-gray-700">Sexe :</span>
                      <div className="mt-1 text-gray-900 font-semibold">{selectedRecord.formData?.['identification.sexe'] || selectedRecord.formData?.household?.sexe || 'N/A'}</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <span className="font-medium text-gray-700">Taille du ménage :</span>
                      <div className="mt-1 text-gray-900 font-semibold">{selectedRecord.formData?.['identification.tailleMenage'] || selectedRecord.formData?.household?.tailleMenage || 'N/A'} personnes</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <span className="font-medium text-gray-700">Commune/Quartier :</span>
                      <div className="mt-1 text-gray-900 font-semibold">{selectedRecord.formData?.['identification.communeQuartier'] || selectedRecord.formData?.household?.communeQuartier || 'N/A'}</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <span className="font-medium text-gray-700">Géolocalisation :</span>
                      <div className="mt-1 text-gray-900 font-semibold font-mono text-sm">
                        {(() => {
                          const formData = selectedRecord.formData || {};
                          
                          // D'abord, chercher les coordonnées GPS
                          const gps1 = formData['identification.geolocalisation'];
                          if (gps1 && typeof gps1 === 'string' && gps1.trim() !== '' && gps1 !== 'N/A') return gps1;
                          
                          const gps2 = formData['household.geolocalisation'];
                          if (gps2 && typeof gps2 === 'string' && gps2.trim() !== '' && gps2 !== 'N/A') return gps2;
                          
                          const gps3 = formData?.identification?.geolocalisation;
                          if (gps3 && typeof gps3 === 'string' && gps3.trim() !== '' && gps3 !== 'N/A') return gps3;
                          
                          const gps4 = formData?.household?.geolocalisation;
                          if (gps4 && typeof gps4 === 'string' && gps4.trim() !== '' && gps4 !== 'N/A') return gps4;
                          
                          // Si pas de GPS, chercher l'adresse manuelle complète
                          const getAddressValue = (key: string): string | null => {
                            const value = formData[key] || formData?.identification?.[key.split('.')[1]] || formData?.household?.[key.split('.')[1]];
                            if (value && typeof value === 'string' && value.trim() !== '' && value.trim() !== 'N/A') {
                              return value.trim();
                            }
                            return null;
                          };
                          
                          // Chercher la province
                          const provinceKeys = ['identification.province', 'household.province', 'province'];
                          let province: string | null = null;
                          for (const key of provinceKeys) {
                            province = getAddressValue(key);
                            if (province) break;
                          }
                          
                          // Chercher commune/quartier/ville
                          const addressKeys = [
                            'identification.communeQuartier', 'household.communeQuartier', 'communeQuartier',
                            'identification.commune', 'household.commune', 'commune',
                            'identification.quartier', 'household.quartier', 'quartier',
                            'identification.ville', 'household.ville', 'ville',
                            'identification.city', 'household.city', 'city'
                          ];
                          let address: string | null = null;
                          for (const key of addressKeys) {
                            address = getAddressValue(key);
                            if (address) break;
                          }
                          
                          // Construire l'adresse complète si disponible
                          if (province && address) {
                            return `${province}, ${address}`;
                          } else if (address) {
                            return address;
                          } else if (province) {
                            return province;
                          }
                          
                          return 'N/A';
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Mode de cuisson actuelle */}
                {(selectedRecord.formData?.['modeCuisson.combustibles'] || selectedRecord.formData?.['modeCuisson.equipements'] || selectedRecord.formData?.['modeCuisson.autresCombustibles'] || selectedRecord.formData?.['modeCuisson.autresEquipements'] || selectedRecord.formData?.cooking) && (
                  <div className="mb-6">
                    <h4 className="text-md font-semibold text-gray-800 mb-3 border-b pb-2 flex items-center">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold mr-2">2</span>
                      Mode de cuisson actuelle
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-green-50 p-3 rounded-lg">
                        <span className="font-medium text-gray-700">2.1.1. Combustibles utilisés (par ordre d'importance) :</span>
                        <div className="mt-2">
                          {selectedRecord.formData?.['modeCuisson.combustibles'] ? (
                            typeof selectedRecord.formData['modeCuisson.combustibles'] === 'object' 
                              ? Object.entries(selectedRecord.formData['modeCuisson.combustibles'])
                                  .sort(([,a], [,b]) => {
                                    const order = ['1er', '2e', '3e', '4e', '5e'];
                                    return order.indexOf(a as string) - order.indexOf(b as string);
                                  })
                                  .map(([combustible, rang]) => (
                                    <div key={combustible} className="flex items-center gap-2 mb-1">
                                      <span className="bg-green-200 text-green-800 px-2 py-1 rounded text-xs font-bold">{String(rang)}</span>
                                      <span className="text-gray-900 font-medium">{combustible}</span>
                                    </div>
                                  ))
                              : selectedRecord.formData['modeCuisson.combustibles']
                          ) : (
                            Array.isArray(selectedRecord.formData?.cooking?.combustibles) 
                              ? selectedRecord.formData.cooking.combustibles.join(', ') 
                              : 'N/A'
                          )}
                        </div>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <span className="font-medium text-gray-700">2.1.2. Principal équipement de cuisson :</span>
                        <div className="mt-1 text-gray-900 font-semibold">
                          {selectedRecord.formData?.['modeCuisson.equipements'] || (
                            Array.isArray(selectedRecord.formData?.cooking?.equipements) 
                              ? selectedRecord.formData.cooking.equipements.join(', ') 
                              : 'N/A'
                          )}
                        </div>
                      </div>
                      {selectedRecord.formData?.['modeCuisson.autresCombustibles'] && (
                        <div className="bg-green-50 p-3 rounded-lg">
                          <span className="font-medium text-gray-700">Autres combustibles :</span>
                          <div className="mt-1 text-gray-900 font-semibold">{selectedRecord.formData['modeCuisson.autresCombustibles']}</div>
                        </div>
                      )}
                      {selectedRecord.formData?.['modeCuisson.autresEquipements'] && (
                        <div className="bg-green-50 p-3 rounded-lg">
                          <span className="font-medium text-gray-700">Autres équipements :</span>
                          <div className="mt-1 text-gray-900 font-semibold">{selectedRecord.formData['modeCuisson.autresEquipements']}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Connaissance des solutions de cuisson propres */}
                {(selectedRecord.formData?.['connaissance.connaissanceSolutions'] || selectedRecord.formData?.['connaissance.solutionsConnaissances'] || selectedRecord.formData?.['connaissance.avantages'] || selectedRecord.formData?.['connaissance.autresAvantages'] || selectedRecord.formData?.knowledge) && (
                  <div className="mb-6">
                    <h4 className="text-md font-semibold text-gray-800 mb-3 border-b pb-2 flex items-center">
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-bold mr-2">3</span>
                      Connaissance des solutions de cuisson propres
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <span className="font-medium text-gray-700">3.1. Connaissance des solutions propres :</span>
                        <div className="mt-1">
                          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                            (selectedRecord.formData?.['connaissance.connaissanceSolutions'] || selectedRecord.formData?.knowledge?.connaissanceSolutions) === 'Oui' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {selectedRecord.formData?.['connaissance.connaissanceSolutions'] || selectedRecord.formData?.knowledge?.connaissanceSolutions || 'N/A'}
                          </span>
                        </div>
                      </div>
                      {selectedRecord.formData?.['connaissance.solutionsConnaissances'] && (
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <span className="font-medium text-gray-700">Solutions connues :</span>
                          <div className="mt-1 text-gray-900 font-semibold">{selectedRecord.formData['connaissance.solutionsConnaissances']}</div>
                        </div>
                      )}
                      {selectedRecord.formData?.['connaissance.avantages'] && (
                        <div className="bg-purple-50 p-3 rounded-lg md:col-span-2">
                          <span className="font-medium text-gray-700">3.2. Avantages perçus :</span>
                          <div className="mt-2">
                            {Array.isArray(selectedRecord.formData['connaissance.avantages']) ? (
                              <div className="flex flex-wrap gap-2">
                                {selectedRecord.formData['connaissance.avantages'].map((avantage, index) => (
                                  <span key={index} className="inline-block bg-purple-200 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                                    ✓ {avantage}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-900 font-semibold">{selectedRecord.formData['connaissance.avantages']}</span>
                            )}
                          </div>
                        </div>
                      )}
                      {selectedRecord.formData?.['connaissance.autresAvantages'] && (
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <span className="font-medium text-gray-700">Autres avantages :</span>
                          <div className="mt-1 text-gray-900 font-semibold">{selectedRecord.formData['connaissance.autresAvantages']}</div>
                        </div>
                      )}
                      {!selectedRecord.formData?.['connaissance.avantages'] && selectedRecord.formData?.knowledge?.avantages && (
                        <div className="bg-purple-50 p-3 rounded-lg md:col-span-2">
                          <span className="font-medium text-gray-700">Avantages :</span>
                          <div className="mt-1 text-gray-900 font-semibold">
                            {Array.isArray(selectedRecord.formData.knowledge.avantages) 
                              ? selectedRecord.formData.knowledge.avantages.join(', ') 
                              : 'N/A'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. Perceptions et contraintes */}
                {(selectedRecord.formData?.['perceptions.obstacles'] || selectedRecord.formData?.['perceptions.autresObstacles'] || selectedRecord.formData?.['perceptions.pretA'] || selectedRecord.formData?.constraints) && (
                  <div className="mb-6">
                    <h4 className="text-md font-semibold text-gray-800 mb-3 border-b pb-2 flex items-center">
                      <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-bold mr-2">4</span>
                      Perceptions et contraintes
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedRecord.formData?.['perceptions.obstacles'] && (
                        <div className="bg-orange-50 p-3 rounded-lg md:col-span-2">
                          <span className="font-medium text-gray-700">4.1. Obstacles perçus :</span>
                          <div className="mt-2">
                            {Array.isArray(selectedRecord.formData['perceptions.obstacles']) ? (
                              <div className="flex flex-wrap gap-2">
                                {selectedRecord.formData['perceptions.obstacles'].map((obstacle, index) => (
                                  <span key={index} className="inline-block bg-orange-200 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                                    ⚠️ {obstacle}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-900 font-semibold">{selectedRecord.formData['perceptions.obstacles']}</span>
                            )}
                          </div>
                        </div>
                      )}
                      {selectedRecord.formData?.['perceptions.autresObstacles'] && (
                        <div className="bg-orange-50 p-3 rounded-lg">
                          <span className="font-medium text-gray-700">Autres obstacles :</span>
                          <div className="mt-1 text-gray-900 font-semibold">{selectedRecord.formData['perceptions.autresObstacles']}</div>
                        </div>
                      )}
                      {selectedRecord.formData?.['perceptions.pretA'] && (
                        <div className="bg-orange-50 p-3 rounded-lg">
                          <span className="font-medium text-gray-700">Je suis prêt(e) à :</span>
                          <div className="mt-1 text-gray-900 font-semibold">{selectedRecord.formData['perceptions.pretA']}</div>
                        </div>
                      )}
                      {!selectedRecord.formData?.['perceptions.obstacles'] && selectedRecord.formData?.constraints?.obstacles && (
                        <div className="bg-orange-50 p-3 rounded-lg md:col-span-2">
                          <span className="font-medium text-gray-700">Obstacles :</span>
                          <div className="mt-1 text-gray-900 font-semibold">
                            {Array.isArray(selectedRecord.formData.constraints.obstacles) 
                              ? selectedRecord.formData.constraints.obstacles.join(', ') 
                              : 'N/A'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. Intention d'adoption */}
                {(selectedRecord.formData?.['intentionAdoption.pretAcheterFoyer'] || selectedRecord.formData?.['intentionAdoption.pretAcheterGPL'] || selectedRecord.formData?.adoption) && (
                  <div className="mb-6">
                    <h4 className="text-md font-semibold text-gray-800 mb-3 border-b pb-2 flex items-center">
                      <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs font-bold mr-2">5</span>
                      Intention d'adoption
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-indigo-50 p-3 rounded-lg">
                        <span className="font-medium text-gray-700">5.1. Prêt(e) à acheter un foyer amélioré :</span>
                        <div className="mt-1">
                          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                            (selectedRecord.formData?.['intentionAdoption.pretAcheterFoyer'] || selectedRecord.formData?.adoption?.pretAcheterFoyer) === 'Oui' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {selectedRecord.formData?.['intentionAdoption.pretAcheterFoyer'] || selectedRecord.formData?.adoption?.pretAcheterFoyer || 'N/A'}
                          </span>
                        </div>
                      </div>
                      <div className="bg-indigo-50 p-3 rounded-lg">
                        <span className="font-medium text-gray-700">5.2. Prêt(e) à utiliser un réchaud GPL :</span>
                        <div className="mt-1">
                          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                            (selectedRecord.formData?.['intentionAdoption.pretAcheterGPL'] || selectedRecord.formData?.adoption?.pretAcheterGPL) === 'Oui' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {selectedRecord.formData?.['intentionAdoption.pretAcheterGPL'] || selectedRecord.formData?.adoption?.pretAcheterGPL || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Informations générales */}
                <div className="mb-6">
                  <h4 className="text-md font-semibold text-gray-800 mb-3 border-b pb-2 flex items-center">
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-bold mr-2">ℹ️</span>
                    Informations générales
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="font-medium text-gray-700">Enquêteur :</span>
                      <div className="mt-1 text-gray-900 font-semibold">
                        {selectedRecord.author?.name || selectedRecord.authorName || selectedRecord.submitterName || selectedRecord.authorId || 'N/A'}
                      </div>
                      {selectedRecord.author?.email && (
                        <div className="mt-1 text-xs text-gray-600">{selectedRecord.author.email}</div>
                      )}
                      {selectedRecord.source === 'public_link' && selectedRecord.submitterContact && (
                        <div className="mt-1 text-xs text-gray-600">Contact soumetteur : {selectedRecord.submitterContact}</div>
                      )}
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="font-medium text-gray-700">Date et heure de soumission :</span>
                      <div className="mt-1 text-gray-900 font-semibold">
                        {selectedRecord.createdAt ? new Date(selectedRecord.createdAt).toLocaleString('fr-FR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        }) : 'N/A'}
                      </div>
                    </div>
                    {selectedRecord.survey && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="font-medium text-gray-700">Campagne :</span>
                        <div className="mt-1 text-gray-900 font-semibold">{selectedRecord.survey.title}</div>
                        {selectedRecord.survey.description && (
                          <div className="mt-1 text-xs text-gray-600">{selectedRecord.survey.description}</div>
                        )}
                      </div>
                    )}
                    {selectedRecord.source && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="font-medium text-gray-700">Source :</span>
                        <div className="mt-1">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                            selectedRecord.source === 'public_link' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {selectedRecord.source === 'public_link' ? 'Lien public' : 'Application'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex justify-between gap-3 mt-6 pt-4 border-t">
                {/* Boutons de validation */}
                <div className="flex flex-col gap-3">
                  {!recordActionLocked && showCommentField && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <label className="block text-sm font-semibold text-orange-800 mb-2">
                        Commentaire pour le Project Manager (obligatoire):
                      </label>
                      <p className="text-xs text-orange-700 mb-2">
                        Ce formulaire sera marqué "À revoir" et attirera l'attention du Project Manager pour une analyse approfondie.
                      </p>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Expliquez pourquoi ce formulaire doit être revu..."
                        className="w-full h-24 px-3 py-2 border border-orange-300 rounded-lg resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                  )}

                  {!recordActionLocked ? (
                    <div className="flex justify-end gap-3">
                      {!showCommentField ? (
                        <>
                          <button
                            onClick={() => onValidate(selectedRecord.id, 'VALIDATED')}
                            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold"
                          >
                            ✓ Valider
                          </button>
                          <button
                            onClick={() => setShowCommentField(true)}
                            className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors font-semibold"
                          >
                            ⚠ À revoir
                          </button>
                          <button
                            onClick={onClose}
                            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                          >
                            Annuler
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => onValidate(selectedRecord.id, 'NEEDS_REVIEW')}
                            disabled={!reviewComment.trim()}
                            className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            ✓ Confirmer "À revoir"
                          </button>
                          <button
                            onClick={() => {
                              setShowCommentField(false);
                              setReviewComment('');
                            }}
                            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                          >
                            Annuler
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      {recordActionMessage && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
                          {recordActionMessage}
                        </div>
                      )}
                      <div className="flex justify-end">
                        <button
                          onClick={onClose}
                          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                        >
                          Fermer
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
  );
}
