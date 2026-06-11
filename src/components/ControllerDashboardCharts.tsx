import React, { lazy, Suspense, useMemo } from 'react';
import { getChartColor, CompatibleColors } from '../utils/colors';

const Bar = lazy(async () => {
  const module = await import('../lib/chartSetup');
  return { default: module.Bar };
});

interface ControllerDashboardChartsProps {
  personalStats?: {
    recordsByMonth?: Array<{ month: string; count: number }>;
    totalFormsSubmitted?: number;
  };
}

function ChartFallback() {
  return (
    <div className="h-48 sm:h-56 flex items-center justify-center">
      <div className="inline-block animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
    </div>
  );
}

export default function ControllerDashboardCharts({ personalStats }: ControllerDashboardChartsProps) {
  const recordsByMonth = personalStats?.recordsByMonth || [];

  const monthlyData = useMemo(
    () => ({
      labels: recordsByMonth.map((item) => item.month),
      datasets: [
        {
          label: 'Sondages par mois',
          data: recordsByMonth.map((item) => item.count),
          backgroundColor: getChartColor(CompatibleColors.chart.blue, 0.8),
          borderColor: getChartColor(CompatibleColors.chart.blue, 1),
          borderWidth: 1,
        },
      ],
    }),
    [recordsByMonth],
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, precision: 0 },
        },
      },
    }),
    [],
  );

  const totalSixMonths = recordsByMonth.reduce((sum, item) => sum + item.count, 0);

  if (!recordsByMonth.length) {
    return (
      <div className="text-center py-6 text-gray-500 text-sm">
        Aucune donnée disponible pour les graphiques
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-100 p-3 sm:p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3 text-center">
          Évolution sur 6 mois
        </h4>
        <div className="h-48 sm:h-56">
          <Suspense fallback={<ChartFallback />}>
            <Bar data={monthlyData} options={chartOptions} />
          </Suspense>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-purple-50 border border-purple-100 p-3 text-center">
          <div className="text-xs text-purple-700">6 derniers mois</div>
          <div className="text-2xl font-bold text-purple-900">{totalSixMonths}</div>
        </div>
        <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-center">
          <div className="text-xs text-blue-700">Total enregistré</div>
          <div className="text-2xl font-bold text-blue-900">
            {personalStats?.totalFormsSubmitted ?? 0}
          </div>
        </div>
      </div>
    </div>
  );
}
