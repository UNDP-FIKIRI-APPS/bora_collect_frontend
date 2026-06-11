import React, { lazy, Suspense } from 'react';
import { Bar, Doughnut } from '../../lib/chartSetup';
import { getChartColor, CompatibleColors } from '../../utils/colors';
import { flipCardStyles } from './flipCardStyles';
import type { AnalystView } from './useAnalystHome';

const AnalystValidationCharts = lazy(() => import('../../components/AnalystValidationCharts'));

export interface AnalystDashboardViewProps {
  validationLoading: boolean;
  flippedCards: Record<string, boolean>;
  toggleCardFlip: (cardId: string) => void;
  validationStats: any;
  analystStats: any;
  setView: (view: AnalystView) => void;
}

export default function AnalystDashboardView({
  validationLoading,
  flippedCards,
  toggleCardFlip,
  validationStats,
  analystStats,
  setView,
}: AnalystDashboardViewProps) {
  return (
    <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center">Tableau de Bord - Interface Analyste</h1>
            
            {/* Chargement */}
            {validationLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Chargement des statistiques de validation...</p>
              </div>
            ) : (
              <>
                {/* Styles CSS pour les animations */}
                <style>{flipCardStyles}</style>
                
                {/* Statistiques de validation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8 max-w-6xl mx-auto">
                  {/* Carte Validés */}
                  <div 
                    className="relative w-full h-24 cursor-pointer perspective-1000 hover:scale-105 transition-transform duration-300"
                    onClick={() => toggleCardFlip('validated')}
                  >
                    <div className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
                      flippedCards.validated ? 'rotate-y-180' : ''
                    }`}>
                      {/* Recto */}
                      <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow duration-300">
                        <div className="text-center text-white">
                          <div className="mb-2 hover:scale-110 transition-transform duration-200 relative">
                            <div className="absolute inset-0 bg-white opacity-20 rounded-full blur-sm"></div>
                            <svg className="w-6 h-6 mx-auto relative z-10 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                          </div>
                          <div className="text-xs font-semibold">Validés</div>
                          <div className="text-xs opacity-80 mt-1 animate-pulse">Cliquez pour voir</div>
                        </div>
                      </div>
                      {/* Verso */}
                      <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg flex items-center justify-center rotate-y-180">
                        <div className="text-center text-white">
                          <div className="text-2xl font-bold mb-1 animate-bounce">
                            {validationStats?.totalValidated || 0}
                          </div>
                          <div className="text-xs font-semibold">Formulaires validés</div>
                          <div className="text-xs opacity-80 mt-1">
                            {validationStats && validationStats.totalRecords > 0 
                              ? `${((validationStats.totalValidated / validationStats.totalRecords) * 100).toFixed(1)}% du total`
                              : '0% du total'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Carte En attente */}
                  <div 
                    className="relative w-full h-24 cursor-pointer perspective-1000 hover:scale-105 transition-transform duration-300"
                    onClick={() => toggleCardFlip('pending')}
                  >
                    <div className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
                      flippedCards.pending ? 'rotate-y-180' : ''
                    }`}>
                      {/* Recto */}
                      <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow duration-300">
                        <div className="text-center text-white">
                          <div className="mb-2 hover:scale-110 transition-transform duration-200 relative">
                            <div className="absolute inset-0 bg-white opacity-20 rounded-full blur-sm"></div>
                            <svg className="w-6 h-6 mx-auto relative z-10 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2M13,17h-2v-6h2v6zM13,9h-2V7h2v2z"/>
                            </svg>
                          </div>
                          <div className="text-xs font-semibold">En attente</div>
                          <div className="text-xs opacity-80 mt-1 animate-pulse">Cliquez pour voir</div>
                        </div>
                      </div>
                      {/* Verso */}
                      <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg flex items-center justify-center rotate-y-180">
                        <div className="text-center text-white">
                          <div className="text-2xl font-bold mb-1 animate-bounce">
                            {validationStats?.totalPending || 0}
                          </div>
                          <div className="text-xs font-semibold">En attente de validation</div>
                          <div className="text-xs opacity-80 mt-1">
                            {validationStats && validationStats.totalRecords > 0 
                              ? `${((validationStats.totalPending / validationStats.totalRecords) * 100).toFixed(1)}% du total`
                              : '0% du total'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Carte Demandes de correction */}
                  <div 
                    className="relative w-full h-24 cursor-pointer perspective-1000 hover:scale-105 transition-transform duration-300"
                    onClick={() => toggleCardFlip('needsReview')}
                  >
                    <div className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
                      flippedCards.needsReview ? 'rotate-y-180' : ''
                    }`}>
                      {/* Recto */}
                      <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow duration-300">
                        <div className="text-center text-white">
                          <div className="mb-2 hover:scale-110 transition-transform duration-200 relative">
                            <div className="absolute inset-0 bg-white opacity-20 rounded-full blur-sm"></div>
                            <svg className="w-6 h-6 mx-auto relative z-10 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z"/>
                            </svg>
                          </div>
                          <div className="text-xs font-semibold">À revoir</div>
                          <div className="text-xs opacity-80 mt-1 animate-pulse">Cliquez pour voir</div>
                        </div>
                      </div>
                      {/* Verso */}
                      <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg flex items-center justify-center rotate-y-180">
                        <div className="text-center text-white">
                          <div className="text-2xl font-bold mb-1 animate-bounce">
                            {validationStats?.totalNeedsReview || 0}
                          </div>
                          <div className="text-xs font-semibold">Nécessitent révision</div>
                          <div className="text-xs opacity-80 mt-1">
                            {validationStats && validationStats.totalRecords > 0 
                              ? `${((validationStats.totalNeedsReview / validationStats.totalRecords) * 100).toFixed(1)}% du total`
                              : '0% du total'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Carte Total formulaires */}
                  <div 
                    className="relative w-full h-24 cursor-pointer perspective-1000 hover:scale-105 transition-transform duration-300"
                    onClick={() => toggleCardFlip('total')}
                  >
                    <div className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
                      flippedCards.total ? 'rotate-y-180' : ''
                    }`}>
                      {/* Recto */}
                      <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow duration-300">
                        <div className="text-center text-white">
                          <div className="mb-2 hover:scale-110 transition-transform duration-200 relative">
                            <div className="absolute inset-0 bg-white opacity-20 rounded-full blur-sm"></div>
                            <svg className="w-6 h-6 mx-auto relative z-10 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                            </svg>
                          </div>
                          <div className="text-xs font-semibold">Total</div>
                          <div className="text-xs opacity-80 mt-1 animate-pulse">Cliquez pour voir</div>
                        </div>
                      </div>
                      {/* Verso */}
                      <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg flex items-center justify-center rotate-y-180">
                        <div className="text-center text-white px-2">
                          <div className="text-2xl font-bold mb-1 animate-bounce">
                            {analystStats?.totalRecords || 0}
                          </div>
                          <div className="text-xs font-semibold mb-2">Formulaires totaux</div>
                          <div className="text-xs opacity-90 space-y-1">
                            <div>📱 Application: {analystStats?.totalByApplication || 0}</div>
                            <div>🔗 Lien public: {analystStats?.totalByPublicLink || 0}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Graphique en cercle - Répartition des statuts */}
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg mb-6 sm:mb-8">
                  <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-center">Répartition des Formulaires par Statut de Validation</h3>
                  <div className="flex justify-center">
                    <div style={{ width: '300px', height: '300px' }} className="sm:w-96 sm:h-96">
                      <Doughnut
                        data={{
                          labels: ['Validés', 'En attente', 'Demandes de correction'],
                          datasets: [{
                            data: [
                              validationStats?.totalValidated || 0,
                              validationStats?.totalPending || 0,
                              validationStats?.totalNeedsReview || 0
                            ],
                            backgroundColor: [
                              getChartColor(CompatibleColors.chart.green, 0.8),
                              getChartColor(CompatibleColors.chart.blue, 0.8),
                              getChartColor('#f97316', 0.8),
                            ],
                            borderColor: [
                              getChartColor(CompatibleColors.chart.green, 1),
                              getChartColor(CompatibleColors.chart.blue, 1),
                              getChartColor('#f97316', 1),
                            ],
                            borderWidth: 2,
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom' as const,
                              labels: {
                                padding: 20,
                                usePointStyle: true,
                                font: {
                                  size: 14
                                }
                              }
                            },
                            tooltip: {
                              callbacks: {
                                label: function(context) {
                                  const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                                  const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                                  return `${context.label}: ${context.parsed} (${percentage}%)`;
                                }
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Graphique en barres - Formulaires en attente par enquêteur */}
                {validationStats?.pendingByEnumerator && validationStats.pendingByEnumerator.length > 0 && (
                  <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                    <h3 className="text-lg font-bold mb-4 text-center">Formulaires en Attente par Enquêteur</h3>
                    <div style={{ height: '400px' }}>
                      <Bar
                        data={{
                          labels: validationStats.pendingByEnumerator.map((e: any) => e.enumeratorName),
                          datasets: [{
                            label: 'Nombre de formulaires en attente',
                            data: validationStats.pendingByEnumerator.map((e: any) => e.count),
                            backgroundColor: getChartColor(CompatibleColors.chart.blue, 0.8),
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                          },
                          scales: {
                            y: { 
                              beginAtZero: true,
                              title: {
                                display: true,
                                text: 'Nombre de formulaires'
                              }
                            },
                            x: { 
                              title: {
                                display: true,
                                text: 'Enquêteurs'
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Bouton pour aller aux enquêtes */}
                <div className="text-center mt-8">
                  <button
                    onClick={() => setView('enquetes')}
                    className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm sm:text-base"
                  >
                    Voir toutes les enquêtes
                  </button>
                </div>
                </>
            )}
    </div>
  );
}
