import React from 'react';
import { Bar, Line } from '../lib/chartSetup';
import { getChartColor, CompatibleColors } from '../utils/colors';

interface DailyObjective {
  surveyId: string;
  surveyTitle: string;
  totalTarget: number;
  dailyTarget: number;
  campaignDays: number;
  currentProgress: {
    totalSubmitted: number;
    totalValidated: number;
    totalNeedsReview: number;
  };
  todayProgress: {
    date: string;
    submitted: number;
    target: number;
    achieved: boolean;
  };
  history: Array<{
    date: string;
    submitted: number;
    target: number;
    status: string;
  }>;
  recommendations: {
    avgPerDay: number;
    requiredPerDay: number;
    remainingDays: number;
    onTrack: boolean;
  };
}

interface ControllerDailyObjectivesProps {
  objectives: DailyObjective[];
  loading: boolean;
}

export default function ControllerDailyObjectives({ objectives, loading }: ControllerDailyObjectivesProps) {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Chargement des objectifs...</p>
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
              label: 'Soumis',
              data: submittedData,
              backgroundColor: getChartColor(CompatibleColors.chart.green, 0.5),
              borderColor: getChartColor(CompatibleColors.chart.green, 1),
              borderWidth: 2,
              type: 'bar' as const
            },
            {
              label: 'Objectif',
              data: targetData,
              backgroundColor: getChartColor(CompatibleColors.chart.blue, 0.2),
              borderColor: getChartColor(CompatibleColors.chart.blue, 1),
              borderWidth: 2,
              borderDash: [5, 5],
              type: 'line' as const,
              tension: 0.4
            }
          ]
        };

        // Calculer le pourcentage d'atteinte de l'objectif
        const achievementPercentage = objective.totalTarget > 0 
          ? ((objective.currentProgress.totalSubmitted / objective.totalTarget) * 100).toFixed(1)
          : 0;

        return (
          <div key={objective.surveyId} className="bg-white rounded-lg shadow-lg p-6">
            {/* En-tête de la campagne */}
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-2">{objective.surveyTitle}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Total Soumis</div>
                  <div className="text-2xl font-bold text-blue-600">{objective.currentProgress.totalSubmitted} / {objective.totalTarget}</div>
                  <div className="text-xs text-gray-500 mt-1">{achievementPercentage}% de l'objectif</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Aujourd'hui</div>
                  <div className="text-2xl font-bold text-green-600">
                    {objective.todayProgress.submitted} / {objective.todayProgress.target}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {objective.todayProgress.achieved ? '✅ Objectif atteint' : '⚠️ Objectif non atteint'}
                  </div>
                </div>
                <div className={`rounded-lg p-4 ${objective.recommendations.onTrack ? 'bg-green-50' : 'bg-orange-50'}`}>
                  <div className="text-sm text-gray-600">Temps restant</div>
                  <div className="text-2xl font-bold">{objective.recommendations.remainingDays} jours</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {objective.recommendations.onTrack ? '✅ Sur la bonne voie' : '⚠️ Accélération nécessaire'}
                  </div>
                </div>
              </div>
            </div>

            {/* Graphique d'évolution */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-700 mb-4">Évolution Quotidienne</h4>
              <div style={{ height: '300px' }}>
                <Bar
                  data={chartData as any}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: true,
                        position: 'top' as const
                      },
                      tooltip: {
                        callbacks: {
                          afterLabel: (context) => {
                            const index = context.dataIndex;
                            const status = objective.history[index]?.status === 'achieved' ? '✅ Objectif atteint' : '⚠️ Sous objectif';
                            return status;
                          }
                        }
                      }
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
                          text: 'Date'
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Recommandations */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
              <h4 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
                Recommandations
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-2">Moyenne quotidienne</div>
                  <div className="text-2xl font-bold text-blue-600">{objective.recommendations.avgPerDay}</div>
                  <div className="text-xs text-gray-500">formulaires/jour</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-2">Nécessaire par jour</div>
                  <div className="text-2xl font-bold text-orange-600">{objective.recommendations.requiredPerDay}</div>
                  <div className="text-xs text-gray-500">pour atteindre l'objectif</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-2">Statut</div>
                  <div className={`text-xl font-bold ${objective.recommendations.onTrack ? 'text-green-600' : 'text-red-600'}`}>
                    {objective.recommendations.onTrack ? 'Sur la bonne voie ✓' : 'Accélération requise'}
                  </div>
                </div>
              </div>

              {objective.recommendations.requiredPerDay > 0 && (
                <div className="mt-4 p-4 bg-white rounded-lg border-l-4 border-blue-600">
                  <p className="text-sm text-gray-700">
                    <strong>Conseil:</strong> Pour atteindre l'objectif de {objective.totalTarget} formulaires avec {objective.recommendations.remainingDays} jours restants, 
                    vous devez soumettre environ <strong>{Math.ceil(objective.recommendations.requiredPerDay)}</strong> formulaires par jour.
                  </p>
                </div>
              )}
            </div>

            {/* Historique quotidien */}
            <div className="mt-6">
              <h4 className="text-lg font-semibold text-gray-700 mb-4">Historique des 7 derniers jours</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Soumis</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Objectif</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {objective.history.slice(-7).map((day, index) => (
                      <tr key={index} className={day.status === 'achieved' ? 'bg-green-50' : ''}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(day.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{day.submitted}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{day.target}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            day.status === 'achieved' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {day.status === 'achieved' ? '✓ Objectif atteint' : '⚠ Sous objectif'}
                          </span>
                        </td>
                      </tr>
                    ))}
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

