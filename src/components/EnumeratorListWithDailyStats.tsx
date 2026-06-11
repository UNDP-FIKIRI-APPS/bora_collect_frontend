import React, { useState, useEffect, useMemo } from 'react';
import { environment } from '../config/environment';
import EnumeratorDailyStats from './EnumeratorDailyStats';
import { Bar } from 'react-chartjs-2';
import Pagination from './Pagination';
import enhancedApiService from '../services/enhancedApiService';

interface Enumerator {
  id: string;
  name: string;
  email: string;
  commune?: string;
  province?: string;
  totalForms: number;
  validatedForms: number;
  needsReviewForms: number;
  pendingForms: number;
  formsLast7Days: number;
  dailyStats: Array<{
    date: string;
    count: number;
  }>;
}

interface EnumeratorListWithDailyStatsProps {
  onViewForms?: (enumeratorId: string) => void;
}

export default function EnumeratorListWithDailyStats({ onViewForms }: EnumeratorListWithDailyStatsProps) {
  const [loading, setLoading] = useState(true);
  const [enumerators, setEnumerators] = useState<Enumerator[]>([]);
  const [selectedEnumerator, setSelectedEnumerator] = useState<Enumerator | null>(null);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);

  // Tous les hooks doivent être appelés AVANT les returns conditionnels
  const filteredEnumerators = useMemo(() => enumerators.filter(e =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.commune?.toLowerCase().includes(searchTerm.toLowerCase())
  ), [enumerators, searchTerm]);

  // Calculer les enquêteurs paginés
  const paginatedEnumerators = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredEnumerators.slice(startIndex, endIndex);
  }, [filteredEnumerators, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredEnumerators.length / pageSize);

  // Réinitialiser à la page 1 quand la recherche change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    const fetchEnumerators = async () => {
      try {
        // Utilisation du nouveau service API
        const data = await enhancedApiService.get<{ enumerators: any[] }>('/validation/enumerators-stats', {
          skipCache: true, // Forcer le refresh pour les stats
        });
        
        const normalizedEnumerators = (data.enumerators || []).map((enumerator: any) => ({
          ...enumerator,
          totalForms: Number(enumerator.totalForms ?? 0),
          validatedForms: Number(enumerator.validatedForms ?? 0),
          needsReviewForms: Number(enumerator.needsReviewForms ?? 0),
          pendingForms: Number(enumerator.pendingForms ?? 0),
          formsLast7Days: Number(enumerator.formsLast7Days ?? 0),
        }));
        setEnumerators(normalizedEnumerators);
      } catch (err) {
        console.error('Erreur:', err);
        setError('Erreur de connexion au serveur');
      } finally {
        setLoading(false);
      }
    };

    fetchEnumerators();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Chargement des enquêteurs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (selectedEnumerator) {
    return (
      <EnumeratorDailyStats
        enumeratorId={selectedEnumerator.id}
        enumeratorName={selectedEnumerator.name}
        onBack={() => setSelectedEnumerator(null)}
        onViewForms={(id) => onViewForms?.(id)}
      />
    );
  }

  const totalForms = enumerators.reduce((sum, e) => sum + (e.totalForms ?? 0), 0);
  const totalValidatedForms = enumerators.reduce((sum, e) => sum + (e.validatedForms ?? 0), 0);
  const totalPendingForms = enumerators.reduce((sum, e) => sum + (e.pendingForms ?? 0), 0);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Liste des Enquêteurs</h2>
        
        {/* Recherche */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Rechercher par nom, email ou commune..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">Total enquêteurs</div>
            <div className="text-2xl font-bold text-blue-600">{enumerators.length}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">Total formulaires</div>
            <div className="text-2xl font-bold text-green-600">{totalForms}</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">Validés</div>
            <div className="text-2xl font-bold text-orange-600">{totalValidatedForms}</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">En attente</div>
            <div className="text-2xl font-bold text-yellow-600">{totalPendingForms}</div>
          </div>
        </div>
      </div>

      {/* Liste des enquêteurs */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enquêteur</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Localisation</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Validés</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">À revoir</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">En attente</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">7 derniers jours</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedEnumerators.map((enumerator) => {
              const totalForEnumerator = enumerator.totalForms ?? 0;
              const validatedForEnumerator = enumerator.validatedForms ?? 0;
              const validationRate = totalForEnumerator > 0 
                ? ((validatedForEnumerator / totalForEnumerator) * 100).toFixed(1)
                : '0.0';

              return (
                <tr key={enumerator.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="text-sm font-semibold text-gray-900">{enumerator.name}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-600">{enumerator.email}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-600">
                      {enumerator.commune || '-'} {enumerator.province ? `(${enumerator.province})` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-semibold text-gray-900">{enumerator.totalForms}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-semibold text-green-600">{enumerator.validatedForms}</div>
                    <div className="text-xs text-gray-500">{validationRate}%</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-semibold text-orange-600">{enumerator.needsReviewForms}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-semibold text-yellow-600">{enumerator.pendingForms}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-semibold text-blue-600">{enumerator.formsLast7Days}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedEnumerator(enumerator)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                      >
                        Stats quotidiennes
                      </button>
                      <button
                        onClick={() => onViewForms?.(enumerator.id)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                      >
                        Voir formulaires
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredEnumerators.length > 0 && totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredEnumerators.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            loading={loading}
          />
        </div>
      )}

      {filteredEnumerators.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {searchTerm ? 'Aucun enquêteur trouvé pour cette recherche' : 'Aucun enquêteur trouvé'}
        </div>
      )}
    </div>
  );
}

