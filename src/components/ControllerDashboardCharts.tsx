import React, { useState, useEffect } from 'react';
import { Bar } from '../lib/chartSetup';
import { environment } from '../config/environment';
import { getChartColor, CompatibleColors } from '../utils/colors';
import enhancedApiService from '../services/enhancedApiService';

interface ControllerDashboardChartsProps {
  personalStats?: any;
}

export default function ControllerDashboardCharts({ personalStats }: ControllerDashboardChartsProps) {
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [flippedCards, setFlippedCards] = useState<{ [key: string]: boolean }>({});

  const toggleCardFlip = (cardId: string) => {
    setFlippedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  // Styles CSS pour les animations 3D
  const flipCardStyles = `
    .perspective-1000 {
      perspective: 1000px;
    }
    .transform-style-preserve-3d {
      transform-style: preserve-3d;
    }
    .backface-hidden {
      backface-visibility: hidden;
    }
    .rotate-y-180 {
      transform: rotateY(180deg);
    }
  `;

  useEffect(() => {
    const fetchRealData = async () => {
      try {
        // Récupérer les vraies données depuis l'API
        const token = localStorage.getItem('token');
        if (!token) return;

        // Utilisation du nouveau service API
        const responseData = await enhancedApiService.get<any>('/records/controller', {
          skipCache: true, // Forcer le refresh pour les données critiques
        });
        
        console.log('📊 ControllerDashboardCharts - Données reçues:', responseData);
          
          // L'API retourne un objet avec { data: [...], pagination: {...} }
          // Extraire le tableau de records
          const records = Array.isArray(responseData) ? responseData : (responseData?.data || []);
          
          // Si pas d'enregistrements, afficher un état vide
          if (!records || !Array.isArray(records) || records.length === 0) {
            console.log('📊 ControllerDashboardCharts - Aucun enregistrement trouvé');
            setChartData({
              recordsByMonth: []
            });
            return;
          }
          
          // Calculer les vraies statistiques - 6 mois à partir du mois actuel
          const now = new Date();
          const currentMonth = now.getMonth(); // Mois actuel (0-indexed)
          const currentYear = now.getFullYear();
          const last6Months = [];
          
          for (let i = 0; i < 6; i++) {
            const date = new Date(currentYear, currentMonth + i, 1);
            const monthName = date.toLocaleDateString('fr-FR', { month: 'short' });
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            
            const count = records.filter((record: any) => {
              const recordDate = new Date(record.createdAt);
              return recordDate >= monthStart && recordDate <= monthEnd;
            }).length;
            
            last6Months.push({ month: monthName, count });
          }

          setChartData({
            recordsByMonth: last6Months
          });
      } catch (error) {
        console.error('❌ Erreur lors de la récupération des données:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRealData();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Chargement des graphiques...</p>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Aucune donnée disponible pour les graphiques</p>
      </div>
    );
  }

  // Données pour le graphique en barres - Évolution mensuelle
  const monthlyData = {
    labels: chartData.recordsByMonth.map((item: any) => item.month),
    datasets: [
      {
        label: 'Sondages par mois',
        data: chartData.recordsByMonth.map((item: any) => item.count),
        backgroundColor: getChartColor(CompatibleColors.chart.blue, 0.8),
        borderColor: getChartColor(CompatibleColors.chart.blue, 1),
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  return (
    <div className="space-y-8">
      <style dangerouslySetInnerHTML={{ __html: flipCardStyles }} />
      
      {/* Graphique en barres - Évolution mensuelle */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold mb-4 text-center">Total des sondages (6 mois)</h3>
        <div className="h-80">
          <Bar
            data={monthlyData}
            options={{
              ...chartOptions,
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    stepSize: 1,
                  },
                },
              },
            }}
          />
        </div>
      </div>

      {/* Carte Total des sondages avec effet de retournement */}
      <div className="grid grid-cols-1 gap-4">
        <div
          className="relative w-full h-32 cursor-pointer perspective-1000 hover:scale-105 transition-transform duration-300"
          onClick={() => toggleCardFlip('totalSurveys6Months')}
        >
          <div className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
            flippedCards.totalSurveys6Months ? 'rotate-y-180' : ''
          }`}>
            {/* Recto */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow duration-300">
              <div className="text-center text-white">
                <div className="mb-2 hover:scale-110 transition-transform duration-200 relative">
                  <div className="absolute inset-0 bg-white opacity-20 rounded-full blur-sm"></div>
                  <svg className="w-8 h-8 mx-auto relative z-10 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                  </svg>
                </div>
                <div className="text-sm font-semibold">Total des sondages</div>
                <div className="text-xs opacity-80 mt-1 animate-pulse">Cliquez pour voir</div>
              </div>
            </div>
            {/* Verso */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg flex items-center justify-center rotate-y-180">
              <div className="text-center text-white">
                <div className="text-3xl font-bold mb-2">
                  <span className="animate-bounce">
                    {chartData.recordsByMonth.reduce((sum: number, item: any) => sum + item.count, 0)}
                  </span>
                </div>
                <div className="text-sm">Sondages (6 mois)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
