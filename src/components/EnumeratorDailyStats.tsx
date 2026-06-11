import React, { useState, useEffect } from 'react';
import enhancedApiService from '../services/enhancedApiService';

interface EnumeratorDailyStatsProps {
  enumeratorId: string;
  enumeratorName: string;
  onBack: () => void;
  onViewForms: (enumeratorId: string) => void;
}

export default function EnumeratorDailyStats({ 
  enumeratorId, 
  enumeratorName, 
  onBack,
  onViewForms 
}: EnumeratorDailyStatsProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await enhancedApiService.get<any>(
          `/validation/enumerator-daily/${enumeratorId}`,
          { skipCache: true },
        );
        setStats(data);
      } catch (err) {
        console.error('Erreur lors de la récupération des stats:', err);
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [enumeratorId]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Chargement des statistiques...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={onBack}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Retour
        </button>
      </div>
    );
  }

  if (!stats || stats.dailyStats.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Statistiques quotidiennes - {enumeratorName}</h2>
          <button
            onClick={onBack}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            Retour
          </button>
        </div>
        <p className="text-gray-500 text-center py-8">Aucune soumission trouvée</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">{enumeratorName}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => onViewForms(enumeratorId)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Voir ses formulaires
          </button>
          <button
            onClick={onBack}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            Retour
          </button>
        </div>
      </div>

      {/* Résumé global */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">Total formulaires</div>
          <div className="text-2xl font-bold text-blue-600">{stats.totalForms}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">Validés</div>
          <div className="text-2xl font-bold text-green-600">{stats.totalValidated}</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">À revoir</div>
          <div className="text-2xl font-bold text-orange-600">{stats.totalNeedsReview}</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">En attente</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.totalPending}</div>
        </div>
      </div>

      {/* Statistiques quotidiennes */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Soumis</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Validés</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">À revoir</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">En attente</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {stats.dailyStats.map((day: any, index: number) => (
              <tr key={index}>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {new Date(day.date).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">{day.total}</td>
                <td className="px-4 py-3 text-sm text-green-600">{day.validated}</td>
                <td className="px-4 py-3 text-sm text-orange-600">{day.needsReview}</td>
                <td className="px-4 py-3 text-sm text-yellow-600">{day.pending}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

