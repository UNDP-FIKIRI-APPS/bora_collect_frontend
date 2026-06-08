import React from 'react';
import { Bar } from '../lib/chartSetup';
import { getChartColor, CompatibleColors } from '../utils/colors';

interface PMDailyObjective {
  surveyId: string;
  surveyTitle: string;
  totalTarget: number;
  dailyTarget: number;
  totalEnumerators: number;
  currentProgress: {
    totalSubmitted: number;
    totalValidated: number;
  };
  history: Array<{
    date: string;
    submitted: number;
    target: number;
  }>;
  recommendations: {
    avgPerDay: number;
    requiredPerDay: number;
    remainingDays: number;
    onTrack: boolean;
  };
}

interface PMDailyObjectivesProps {
  objectives: PMDailyObjective[];
  loading: boolean;
}

export default function PMDailyObjectives({ objectives, loading }: PMDailyObjectivesProps) {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Chargement des statistiques de campagne...</p>
      </div>
    );
  }

  if (!objectives || objectives.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <p className="text-gray-500">Aucune campagne active avec objectifs définis</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {objectives.map((objective) => {
        // Données pour le graphique d'évolution quotidienne
        const historyLabels = objective.history.map(h => new Date(h.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }));
        const submittedData = objective.history.map(h => h.submitted);
        const targetData = objective.history.map(h => h.target);

        const chartData = {
          labels: historyLabels,
          datasets: [
            {
              label: 'Soumis (total équipe)',
              data: submittedData,
              backgroundColor: getChartColor(CompatibleColors.chart.green, 0.6),
              borderColor: getChartColor(CompatibleColors.chart.green, 1),
              borderWidth: 2
            },
            {
              label: 'Objectif quotidien',
              data: targetData,
              backgroundColor: getChartColor(CompatibleColors.chart.blue, 0.6),
              borderColor: getChartColor(CompatibleColors.chart.blue, 1),
              borderWidth: 2,
              borderDash: [5, 5]
            }
          ]
        };

        // Calculer le pourcentage d'atteinte
        const achievementPercentage = objective.totalTarget > 0 
          ? ((objective.currentProgress.totalSubmitted / objective.totalTarget) * 100).toFixed(1)
          : 0;

        // Calculer le taux de soumission nécessaire
        const submissionRate = objective.totalEnumerators > 0 
          ? objective.recommendations.requiredPerDay / objective.totalEnumerators 
          : 0;

        return (
          <div key={objective.surveyId} className="bg-white rounded-lg shadow-lg p-6">
            {/* En-tête de la campagne */}
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">{objective.surveyTitle}</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Total Soumis</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {objective.currentProgress.totalSubmitted} / {objective.totalTarget}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{achievementPercentage}% de l'objectif</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Validés</div>
                  <div className="text-2xl font-bold text-green-600">
                    {objective.currentProgress.totalValidated}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {objective.currentProgress.totalValidated > 0 
                      ? `${((objective.currentProgress.totalValidated / objective.currentProgress.totalSubmitted) * 100).toFixed(0)}% du total`
                      : 'Aucun validé'}
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Enquêteurs</div>
                  <div className="text-2xl font-bold text-purple-600">{objective.totalEnumerators}</div>
                  <div className="text-xs text-gray-500 mt-1">enquêteurs actifs</div>
                </div>
                <div className={`rounded-lg p-4 ${objective.recommendations.onTrack ? 'bg-green-50' : 'bg-orange-50'}`}>
                  <div className="text-sm text-gray-600">Temps restant</div>
                  <div className="text-2xl font-bold">{objective.recommendations.remainingDays} jours</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {objective.recommendations.onTrack ? '✓ Sur la bonne voie' : '⚠ Accélération nécessaire'}
                  </div>
                </div>
              </div>
            </div>

            {/* Graphique d'évolution */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-700 mb-4">
                Évolution Quotidienne des Soumissions
              </h4>
              {objective.history && objective.history.length > 0 ? (
                <div style={{ height: '350px', position: 'relative' }}>
                  <Bar
                    data={chartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: true,
                          position: 'top' as const,
                          labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                              size: 12
                            }
                          }
                        },
                        tooltip: {
                          enabled: true,
                          callbacks: {
                            afterLabel: (context) => {
                              const index = context.dataIndex;
                              const submitted = objective.history[index]?.submitted || 0;
                              const target = objective.history[index]?.target || 0;
                              const percentage = target > 0 ? ((submitted / target) * 100).toFixed(0) : 0;
                              return `${percentage}% de l'objectif`;
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Nombre de formulaires soumis',
                            font: {
                              size: 12,
                              weight: 'bold'
                            }
                          },
                          ticks: {
                            stepSize: 1
                          }
                        },
                        x: {
                          title: {
                            display: true,
                            text: 'Date',
                            font: {
                              size: 12,
                              weight: 'bold'
                            }
                          },
                          ticks: {
                            maxRotation: 45,
                            minRotation: 45
                          }
                        }
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <p className="text-gray-500">Aucune donnée d'historique disponible pour le moment</p>
                  <p className="text-sm text-gray-400 mt-2">Le graphique s'affichera une fois que des soumissions auront été enregistrées</p>
                </div>
              )}
            </div>

            {/* Statistiques et Recommandations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Statistiques de performance */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.03.82 1.87 2 1.87 1.03 0 1.73-.56 1.73-1.35 0-.95-.84-1.45-2.21-1.87l-.8-.22C6.31 10.39 6.5 9.09 8.09 9.09c1.59 0 2.61.91 2.68 2.46h-1.97c-.06-.82-.67-1.44-1.39-1.44-.76 0-1.31.58-1.31 1.24 0 .87.8 1.32 2.11 1.7l.82.2c1.99.48 2.78 1.78 2.78 3.15 0 1.96-1.57 3.16-3.89 3.16z"/>
                  </svg>
                  Statistiques de Performance
                </h4>
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-sm text-gray-600">Moyenne quotidienne</div>
                    <div className="text-xl font-bold text-blue-600">
                      {objective.recommendations.avgPerDay} formulaires/jour
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-sm text-gray-600">Nécessaire par jour</div>
                    <div className="text-xl font-bold text-orange-600">
                      {objective.recommendations.requiredPerDay} formulaires/jour
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-sm text-gray-600">Par enquêteur</div>
                    <div className="text-xl font-bold text-purple-600">
                      {Math.ceil(submissionRate * 10) / 10} formulaires/jour/enquêteur
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommandations */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Recommandations
                </h4>
                <div className="space-y-3">
                  <div className={`p-4 rounded-lg ${objective.recommendations.onTrack ? 'bg-white' : 'bg-red-50 border border-red-200'}`}>
                    <div className="text-sm font-semibold text-gray-700 mb-2">Statut global</div>
                    <div className={`text-xl font-bold ${objective.recommendations.onTrack ? 'text-green-600' : 'text-red-600'}`}>
                      {objective.recommendations.onTrack ? '✓ Campagne sur la bonne voie' : '⚠ Action requise'}
                    </div>
                  </div>
                  {objective.recommendations.requiredPerDay > 0 && (
                    <div className="bg-white rounded-lg p-4 border-l-4 border-green-600">
                      <p className="text-sm text-gray-700">
                        <strong>Objectif:</strong> Pour atteindre l'objectif de {objective.totalTarget} formulaires 
                        avec {objective.recommendations.remainingDays} jours restants et {objective.totalEnumerators} enquêteur(s),
                        l'équipe doit soumettre en moyenne <strong>{Math.ceil(objective.recommendations.requiredPerDay)} formulaires par jour</strong>
                        , soit environ <strong>{Math.ceil(submissionRate * 10) / 10} formulaires par enquêteur par jour</strong>.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Progression détaillée */}
            <div className="mt-6">
              <h4 className="text-lg font-semibold text-gray-700 mb-4">Progression Détailée (14 derniers jours)</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Soumis</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Objectif</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">% Atteint</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {objective.history.slice(-14).map((day, index) => {
                      const percentage = day.target > 0 ? ((day.submitted / day.target) * 100).toFixed(0) : 0;
                      const isAchieved = day.submitted >= day.target;
                      return (
                        <tr key={index} className={isAchieved ? 'bg-green-50' : 'bg-orange-50'}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(day.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">{day.submitted}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{day.target}</td>
                          <td className="px-4 py-3 text-sm font-semibold">
                            <span className={isAchieved ? 'text-green-600' : 'text-orange-600'}>
                              {percentage}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              isAchieved 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {isAchieved ? '✓ Objectif atteint' : '⚠ Sous objectif'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

