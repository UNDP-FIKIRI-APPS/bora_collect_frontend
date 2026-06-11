import React from 'react';
import { Bar, Doughnut } from '../lib/chartSetup';
import { getChartColor, CompatibleColors } from '../utils/colors';

interface ValidationStats {
  totalValidated?: number;
  totalPending?: number;
  totalNeedsReview?: number;
  pendingByEnumerator?: Array<{ enumeratorName: string; count: number }>;
}

interface AnalystValidationChartsProps {
  validationStats: ValidationStats | null;
}

const AnalystValidationCharts: React.FC<AnalystValidationChartsProps> = ({ validationStats }) => (
  <>
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg mb-6 sm:mb-8">
      <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-center">
        Répartition des Formulaires par Statut de Validation
      </h3>
      <div className="flex justify-center">
        <div style={{ width: '300px', height: '300px' }} className="sm:w-96 sm:h-96">
          <Doughnut
            data={{
              labels: ['Validés', 'En attente', 'Demandes de correction'],
              datasets: [{
                data: [
                  validationStats?.totalValidated || 0,
                  validationStats?.totalPending || 0,
                  validationStats?.totalNeedsReview || 0,
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
              }],
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
                    font: { size: 14 },
                  },
                },
                tooltip: {
                  callbacks: {
                    label(context) {
                      const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                      const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                      return `${context.label}: ${context.parsed} (${percentage}%)`;
                    },
                  },
                },
              },
            }}
          />
        </div>
      </div>
    </div>

    {validationStats?.pendingByEnumerator && validationStats.pendingByEnumerator.length > 0 && (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h3 className="text-lg font-bold mb-4 text-center">Formulaires en Attente par Enquêteur</h3>
        <div style={{ height: '400px' }}>
          <Bar
            data={{
              labels: validationStats.pendingByEnumerator.map((e) => e.enumeratorName),
              datasets: [{
                label: 'Nombre de formulaires en attente',
                data: validationStats.pendingByEnumerator.map((e) => e.count),
                backgroundColor: getChartColor(CompatibleColors.chart.blue, 0.8),
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: {
                  beginAtZero: true,
                  title: { display: true, text: 'Nombre de formulaires' },
                },
                x: {
                  title: { display: true, text: 'Enquêteurs' },
                },
              },
            }}
          />
        </div>
      </div>
    )}
  </>
);

export default AnalystValidationCharts;
