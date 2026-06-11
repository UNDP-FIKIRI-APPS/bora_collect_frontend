import React, { lazy, Suspense } from 'react';
import type { AnalystView } from './useAnalystHome';

const EnumeratorListWithDailyStats = lazy(() => import('../../components/EnumeratorListWithDailyStats'));

export interface AnalystStatsViewProps {
  setSelectedEnumeratorId: (id: string | null) => void;
  setSearch: (search: string) => void;
  setCommuneFilter: (filter: string) => void;
  setView: (view: AnalystView) => void;
}

export default function AnalystStatsView({
  setSelectedEnumeratorId,
  setSearch,
  setCommuneFilter,
  setView,
}: AnalystStatsViewProps) {
  return (
    <div>
      <Suspense fallback={<div className="text-center py-8 text-gray-500">Chargement des statistiques...</div>}>
        <EnumeratorListWithDailyStats
          onViewForms={(enumeratorId) => {
            setSelectedEnumeratorId(enumeratorId);
            setSearch('');
            setCommuneFilter('');
            setView('enquetes');
          }}
        />
      </Suspense>
    </div>
  );
}
