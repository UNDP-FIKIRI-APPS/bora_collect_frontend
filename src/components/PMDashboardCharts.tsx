import React, { useState, useEffect } from 'react';
import { Bar } from '../lib/chartSetup';
import enhancedApiService from '../services/enhancedApiService';
import { getChartColor, CompatibleColors } from '../utils/colors';
import { devLogger } from '../utils/logger';


interface PMDashboardChartsProps {
  personalStats?: any;
  selectedPeriod?: string;
  startDate?: string;
  endDate?: string;
  selectedCampaign?: string;
  selectedRespondentType?: string;
}

export default function PMDashboardCharts({ 
  personalStats, 
  selectedPeriod = 'month',
  startDate,
  endDate,
  selectedCampaign,
  selectedRespondentType = 'all'
}: PMDashboardChartsProps) {
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [flippedCards, setFlippedCards] = useState<{ [key: string]: boolean }>({});
  
  // Déterminer le type de graphique à afficher
  const getChartType = () => {
    // Si un type de répondant spécifique est sélectionné, afficher le graphique des répondants par sexe
    if (selectedRespondentType && selectedRespondentType !== 'all') {
      return 'respondents-by-gender';
    }
    // Sinon, afficher le graphique des objectifs de campagne
    return 'campaign-objectives';
  };
  
  const chartType = getChartType();

  const toggleCardFlip = (cardId: string) => {
    setFlippedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  // Fonction pour générer les données des objectifs de campagne
  const generateCampaignObjectivesData = (period: string, start?: string, end?: string) => {
    const now = new Date();
    let data: any[] = [];
    let title = '';
    let xAxisLabel = '';

    switch (period) {
      case 'week':
        // 7 derniers jours
        data = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(now);
          date.setDate(date.getDate() - (6 - i));
          return {
            label: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
            date: date,
            count: 0
          };
        });
        title = 'Objectifs de campagne par jour (7 derniers jours)';
        xAxisLabel = 'Jours';
        break;

      case 'month':
        // 12 derniers mois
        data = Array.from({ length: 12 }, (_, i) => {
          const date = new Date(now);
          date.setMonth(date.getMonth() - (11 - i));
          return {
            label: date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
            date: date,
            count: 0
          };
        });
        title = 'Objectifs de campagne par mois (12 derniers mois)';
        xAxisLabel = 'Mois';
        break;

      case 'year':
        // 12 mois de l'année actuelle
        data = Array.from({ length: 12 }, (_, i) => {
          const date = new Date(now.getFullYear(), i, 1);
          return {
            label: date.toLocaleDateString('fr-FR', { month: 'short' }),
            date: date,
            count: 0
          };
        });
        title = `Objectifs de campagne par mois (${now.getFullYear()})`;
        xAxisLabel = 'Mois';
        break;

      case 'custom':
        if (start && end) {
          const startDate = new Date(start);
          const endDate = new Date(end);
          const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 7) {
            // Par jour
            data = Array.from({ length: diffDays + 1 }, (_, i) => {
              const date = new Date(startDate);
              date.setDate(date.getDate() + i);
              return {
                label: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
                date: date,
                count: 0
              };
            });
            title = `Objectifs de campagne par jour (${startDate.toLocaleDateString('fr-FR')} - ${endDate.toLocaleDateString('fr-FR')})`;
            xAxisLabel = 'Jours';
          } else if (diffDays <= 90) {
            // Par semaine
            const weeks = Math.ceil(diffDays / 7);
            data = Array.from({ length: weeks }, (_, i) => {
              const date = new Date(startDate);
              date.setDate(date.getDate() + (i * 7));
              return {
                label: `Sem. ${i + 1}`,
                date: date,
                count: 0
              };
            });
            title = `Objectifs de campagne par semaine (${startDate.toLocaleDateString('fr-FR')} - ${endDate.toLocaleDateString('fr-FR')})`;
            xAxisLabel = 'Semaines';
          } else {
            // Par mois
            const months = Math.ceil(diffDays / 30);
            data = Array.from({ length: months }, (_, i) => {
              const date = new Date(startDate);
              date.setMonth(date.getMonth() + i);
              return {
                label: date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
                date: date,
                count: 0
              };
            });
            title = `Objectifs de campagne par mois (${startDate.toLocaleDateString('fr-FR')} - ${endDate.toLocaleDateString('fr-FR')})`;
            xAxisLabel = 'Mois';
          }
        } else {
          // Fallback vers mois si pas de dates
          data = Array.from({ length: 12 }, (_, i) => {
            const date = new Date(now);
            date.setMonth(date.getMonth() - (11 - i));
            return {
              label: date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
              date: date,
              count: 0
            };
          });
          title = 'Enquêtes par mois (12 derniers mois)';
          xAxisLabel = 'Mois';
        }
        break;

      default:
        data = Array.from({ length: 12 }, (_, i) => {
          const date = new Date(now);
          date.setMonth(date.getMonth() - (11 - i));
          return {
            label: date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
            date: date,
            count: 0
          };
        });
        title = 'Enquêtes par mois (12 derniers mois)';
        xAxisLabel = 'Mois';
    }

    return { data, title, xAxisLabel };
  };

  // Fonction pour générer les données des répondants par sexe
  const generateRespondentsByGenderData = (period: string, start?: string, end?: string) => {
    const now = new Date();
    let data: any[] = [];
    let title = '';
    let xAxisLabel = '';

    switch (period) {
      case 'week':
        // 7 derniers jours
        data = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(now);
          date.setDate(date.getDate() - (6 - i));
          return {
            label: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
            date: date,
            masculin: 0,
            feminin: 0,
            autre: 0
          };
        });
        title = `Répondants ${selectedRespondentType === 'masculin' ? 'Masculins' : selectedRespondentType === 'feminin' ? 'Féminins' : 'Autres'} par jour (7 derniers jours)`;
        xAxisLabel = 'Jours';
        break;

      case 'month':
        // 12 derniers mois
        data = Array.from({ length: 12 }, (_, i) => {
          const date = new Date(now);
          date.setMonth(date.getMonth() - (11 - i));
          return {
            label: date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
            date: date,
            masculin: 0,
            feminin: 0,
            autre: 0
          };
        });
        title = `Répondants ${selectedRespondentType === 'masculin' ? 'Masculins' : selectedRespondentType === 'feminin' ? 'Féminins' : 'Autres'} par mois (12 derniers mois)`;
        xAxisLabel = 'Mois';
        break;

      case 'year':
        // 12 mois de l'année actuelle
        data = Array.from({ length: 12 }, (_, i) => {
          const date = new Date(now.getFullYear(), i, 1);
          return {
            label: date.toLocaleDateString('fr-FR', { month: 'short' }),
            date: date,
            masculin: 0,
            feminin: 0,
            autre: 0
          };
        });
        title = `Répondants ${selectedRespondentType === 'masculin' ? 'Masculins' : selectedRespondentType === 'feminin' ? 'Féminins' : 'Autres'} par mois (${now.getFullYear()})`;
        xAxisLabel = 'Mois';
        break;

      case 'custom':
        if (start && end) {
          const startDate = new Date(start);
          const endDate = new Date(end);
          const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 7) {
            // Par jour
            data = Array.from({ length: diffDays + 1 }, (_, i) => {
              const date = new Date(startDate);
              date.setDate(date.getDate() + i);
              return {
                label: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
                date: date,
                masculin: 0,
                feminin: 0,
                autre: 0
              };
            });
            title = `Répondants ${selectedRespondentType === 'masculin' ? 'Masculins' : selectedRespondentType === 'feminin' ? 'Féminins' : 'Autres'} par jour (${startDate.toLocaleDateString('fr-FR')} - ${endDate.toLocaleDateString('fr-FR')})`;
            xAxisLabel = 'Jours';
          } else if (diffDays <= 90) {
            // Par semaine
            const weeks = Math.ceil(diffDays / 7);
            data = Array.from({ length: weeks }, (_, i) => {
              const date = new Date(startDate);
              date.setDate(date.getDate() + (i * 7));
              return {
                label: `Sem. ${i + 1}`,
                date: date,
                masculin: 0,
                feminin: 0,
                autre: 0
              };
            });
            title = `Répondants ${selectedRespondentType === 'masculin' ? 'Masculins' : selectedRespondentType === 'feminin' ? 'Féminins' : 'Autres'} par semaine (${startDate.toLocaleDateString('fr-FR')} - ${endDate.toLocaleDateString('fr-FR')})`;
            xAxisLabel = 'Semaines';
          } else {
            // Par mois
            const months = Math.ceil(diffDays / 30);
            data = Array.from({ length: months }, (_, i) => {
              const date = new Date(startDate);
              date.setMonth(date.getMonth() + i);
              return {
                label: date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
                date: date,
                masculin: 0,
                feminin: 0,
                autre: 0
              };
            });
            title = `Répondants ${selectedRespondentType === 'masculin' ? 'Masculins' : selectedRespondentType === 'feminin' ? 'Féminins' : 'Autres'} par mois (${startDate.toLocaleDateString('fr-FR')} - ${endDate.toLocaleDateString('fr-FR')})`;
            xAxisLabel = 'Mois';
          }
        } else {
          // Fallback vers mois si pas de dates
          data = Array.from({ length: 12 }, (_, i) => {
            const date = new Date(now);
            date.setMonth(date.getMonth() - (11 - i));
            return {
              label: date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
              date: date,
              masculin: 0,
              feminin: 0,
              autre: 0
            };
          });
          title = `Répondants ${selectedRespondentType === 'masculin' ? 'Masculins' : selectedRespondentType === 'feminin' ? 'Féminins' : 'Autres'} par mois (12 derniers mois)`;
          xAxisLabel = 'Mois';
        }
        break;

      default:
        // Fallback vers mois
        data = Array.from({ length: 12 }, (_, i) => {
          const date = new Date(now);
          date.setMonth(date.getMonth() - (11 - i));
          return {
            label: date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
            date: date,
            masculin: 0,
            feminin: 0,
            autre: 0
          };
        });
        title = `Répondants ${selectedRespondentType === 'masculin' ? 'Masculins' : selectedRespondentType === 'feminin' ? 'Féminins' : 'Autres'} par mois (12 derniers mois)`;
        xAxisLabel = 'Mois';
    }

    return { data, title, xAxisLabel };
  };

  useEffect(() => {
    const fetchRealData = async () => {
      try {
        setLoading(true);
        
        // Générer la structure de données selon le type de graphique
        const periodInfo = chartType === 'campaign-objectives' 
          ? generateCampaignObjectivesData(selectedPeriod, startDate, endDate)
          : generateRespondentsByGenderData(selectedPeriod, startDate, endDate);
        
        // Récupérer les vraies données depuis l'API
        const params = new URLSearchParams();
        if (selectedCampaign && selectedCampaign !== 'all') {
          params.append('campaignId', selectedCampaign);
        }
        const recordsPath = `/records/pm-records${params.toString() ? `?${params.toString()}` : ''}`;
        devLogger.log('📊 PMDashboardCharts - URL des records:', recordsPath);

        const records = await enhancedApiService.get<any[]>(recordsPath, { skipCache: true });
          const recordsArray = Array.isArray(records) ? records : [];

          devLogger.log('📊 PMDashboardCharts - Records reçus:', recordsArray);
          devLogger.log('📊 PMDashboardCharts - Période sélectionnée:', selectedPeriod);
          devLogger.log('📊 PMDashboardCharts - Type de répondant:', selectedRespondentType);
          devLogger.log('📊 PMDashboardCharts - Campagne sélectionnée:', selectedCampaign);
          
          // Si pas de records, afficher un état vide avec message informatif
          if (!recordsArray.length) {
            devLogger.log('📊 PMDashboardCharts - Aucun record trouvé');
            devLogger.log('💡 Cela signifie qu\'aucun enquêteur n\'a encore soumis de formulaires pour vos campagnes');
            setChartData({
              campaignsByPeriod: periodInfo.data,
              title: periodInfo.title,
              xAxisLabel: periodInfo.xAxisLabel,
              total: 0,
              noData: true,
              message: 'Aucune enquête soumise par les enquêteurs pour le moment'
            });
            return;
          }
          
          // Filtrer les records selon le type de répondant (le filtrage par statut se fait côté backend)
          let filteredRecords = recordsArray;
          if (selectedRespondentType !== 'all') {
            devLogger.log('🔍 Filtrage par type de répondant:', selectedRespondentType);
            filteredRecords = recordsArray.filter((record: any) => {
              const formData = record.formData;
              if (!formData) {
                devLogger.log('❌ Record sans formData:', record.id);
                return false;
              }
              
              // Chercher le champ sexe dans les données du formulaire (nouveau et ancien format)
              const sexe = formData['identification.sexe'] || formData.sexe || formData.household?.sexe;
              
              devLogger.log(`🔍 Record ${record.id} - Sexe trouvé:`, sexe);
              devLogger.log(`🔍 Record ${record.id} - FormData keys:`, Object.keys(formData));
              
              if (!sexe) {
                devLogger.log('❌ Record sans champ sexe:', record.id);
                return false;
              }
              
              // Mapper les valeurs selon le filtre sélectionné
              let matches = false;
              switch (selectedRespondentType) {
                case 'feminin':
                  matches = sexe === 'Femme' || sexe === 'feminin' || sexe === 'female';
                  break;
                case 'masculin':
                  matches = sexe === 'Homme' || sexe === 'masculin' || sexe === 'male';
                  break;
                case 'autre':
                  matches = sexe === 'Autre' || sexe === 'autre' || sexe === 'other';
                  break;
                default:
                  matches = true;
              }
              
              devLogger.log(`🔍 Record ${record.id} - Match ${selectedRespondentType}:`, matches);
              return matches;
            });
          }
          
          devLogger.log('📊 PMDashboardCharts - Records filtrés:', filteredRecords.length);
          
          // Compter les records selon le type de graphique
          devLogger.log('📊 Début du comptage par période...');
          devLogger.log('📊 Type de graphique:', chartType);
          devLogger.log('📊 Période sélectionnée:', selectedPeriod);
          devLogger.log('📊 Nombre de records à traiter:', filteredRecords.length);
          
          const updatedData = periodInfo.data.map((periodItem, index) => {
            let count = 0;
            let masculin = 0;
            let feminin = 0;
            let autre = 0;
            
            devLogger.log(`📊 Traitement période ${index + 1}: ${periodItem.label} (${periodItem.date})`);
            
            filteredRecords.forEach((record: any, recordIndex: number) => {
              const recordDate = new Date(record.createdAt);
              const periodDate = new Date(periodItem.date);
              
              devLogger.log(`📊 Record ${recordIndex + 1}: ${recordDate.toISOString()} vs ${periodDate.toISOString()}`);
              
              // Logique de comptage selon la période
              let matches = false;
              switch (selectedPeriod) {
                case 'week':
                  // Compter par jour
                  matches = recordDate.toDateString() === periodDate.toDateString();
                  break;
                case 'month':
                  // Compter par mois
                  matches = recordDate.getMonth() === periodDate.getMonth() && 
                           recordDate.getFullYear() === periodDate.getFullYear();
                  break;
                case 'year':
                  // Compter par mois de l'année
                  matches = recordDate.getMonth() === periodDate.getMonth() && 
                           recordDate.getFullYear() === periodDate.getFullYear();
                  break;
                case 'custom':
                  // Compter selon la période personnalisée
                  if (startDate && endDate) {
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    const diffTime = Math.abs(end.getTime() - start.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    if (diffDays <= 7) {
                      // Par jour
                      matches = recordDate.toDateString() === periodDate.toDateString();
                    } else if (diffDays <= 90) {
                      // Par semaine
                      const weekStart = new Date(periodDate);
                      const weekEnd = new Date(weekStart);
                      weekEnd.setDate(weekStart.getDate() + 6);
                      matches = recordDate >= weekStart && recordDate <= weekEnd;
                    } else {
                      // Par mois
                      matches = recordDate.getMonth() === periodDate.getMonth() && 
                               recordDate.getFullYear() === periodDate.getFullYear();
                    }
                  }
                  break;
              }
              
              if (matches) {
                if (chartType === 'campaign-objectives') {
                  count++;
                } else {
                  // Pour le graphique des répondants par sexe
                  const formData = record.formData;
                  const sexe = formData?.['identification.sexe'] || formData?.sexe || formData?.household?.sexe;
                  
                  if (sexe === 'Homme' || sexe === 'masculin' || sexe === 'male') {
                    masculin++;
                  } else if (sexe === 'Femme' || sexe === 'feminin' || sexe === 'female') {
                    feminin++;
                  } else if (sexe === 'Autre' || sexe === 'autre' || sexe === 'other') {
                    autre++;
                  }
                }
                devLogger.log(`✅ Record ${recordIndex + 1} match pour ${periodItem.label}`);
              }
            });
            
            devLogger.log(`📊 Période ${periodItem.label}: ${chartType === 'campaign-objectives' ? count : `M:${masculin}, F:${feminin}, A:${autre}`}`);
            
            if (chartType === 'campaign-objectives') {
              return { ...periodItem, count };
            } else {
              return { ...periodItem, masculin, feminin, autre };
            }
          });

          const total = chartType === 'campaign-objectives' 
            ? updatedData.reduce((sum, item) => sum + item.count, 0)
            : updatedData.reduce((sum, item) => sum + item.masculin + item.feminin + item.autre, 0);

          devLogger.log('📊 Données finales du graphique:');
          devLogger.log('📊 Type:', chartType);
          devLogger.log('📊 Total:', total);
          devLogger.log('📊 Titre:', periodInfo.title);
          devLogger.log('📊 Label axe X:', periodInfo.xAxisLabel);
          devLogger.log('📊 Données par période:', updatedData);

          setChartData({
            campaignsByPeriod: updatedData,
            title: periodInfo.title,
            xAxisLabel: periodInfo.xAxisLabel,
            total,
            chartType
          });
      } catch (error) {
        console.error('❌ Erreur lors du chargement des données:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRealData();
  }, [selectedPeriod, startDate, endDate, selectedCampaign, selectedRespondentType]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Chargement des données...</p>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Aucune donnée disponible</p>
      </div>
    );
  }

  // Si pas de données, afficher un message informatif
  if (chartData.noData) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <div className="text-center py-12">
          <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-blue-100 mb-4">
            <svg className="h-12 w-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune donnée d'enquête</h3>
          <p className="text-gray-600 mb-4">{chartData.message}</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
            <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Pour voir des données :</h4>
            <ul className="text-sm text-blue-800 text-left space-y-1">
              <li>• Assurez-vous d'avoir des enquêteurs assignés à vos campagnes</li>
              <li>• Les enquêteurs doivent soumettre des formulaires</li>
              <li>• Les données apparaîtront ici une fois les formulaires soumis</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const chartConfig = chartData.chartType === 'campaign-objectives' ? {
    labels: chartData.campaignsByPeriod.map((item: any) => item.label),
    datasets: [
      {
        label: 'Objectifs de campagne',
        data: chartData.campaignsByPeriod.map((item: any) => item.count),
        backgroundColor: getChartColor(CompatibleColors.chart.blue, 0.8),
        borderColor: getChartColor(CompatibleColors.chart.blue, 1),
        borderWidth: 1,
      },
    ],
  } : {
    labels: chartData.campaignsByPeriod.map((item: any) => item.label),
    datasets: [
      {
        label: 'Masculin',
        data: chartData.campaignsByPeriod.map((item: any) => item.masculin),
        backgroundColor: getChartColor(CompatibleColors.chart.green, 0.8),
        borderColor: getChartColor(CompatibleColors.chart.green, 1),
        borderWidth: 1,
      },
      {
        label: 'Féminin',
        data: chartData.campaignsByPeriod.map((item: any) => item.feminin),
        backgroundColor: getChartColor(CompatibleColors.chart.red, 0.8),
        borderColor: getChartColor(CompatibleColors.chart.red, 1),
        borderWidth: 1,
      },
      {
        label: 'Autre',
        data: chartData.campaignsByPeriod.map((item: any) => item.autre),
        backgroundColor: getChartColor(CompatibleColors.chart.purple, 0.8),
        borderColor: getChartColor(CompatibleColors.chart.purple, 1),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: chartData.title,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
      x: {
        title: {
          display: true,
          text: chartData.xAxisLabel,
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
      <div className="mb-6">
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">
          {chartData.chartType === 'campaign-objectives' ? 'Graphique des Objectifs de Campagne' : 'Graphique des Répondants par Sexe'}
        </h3>
        <p className="text-sm text-gray-600">
          {chartData.chartType === 'campaign-objectives' 
            ? 'Évolution des objectifs de campagne selon la période et la campagne sélectionnées'
            : `Répartition des répondants ${selectedRespondentType === 'masculin' ? 'masculins' : selectedRespondentType === 'feminin' ? 'féminins' : 'autres'} selon la période sélectionnée`
          }
        </p>
      </div>

      {/* Carte du total avec effet flip */}
      <div className="mb-6">
        <div 
          className={`perspective-1000 cursor-pointer ${flippedCards['total'] ? 'flipped' : ''}`}
          onClick={() => toggleCardFlip('total')}
        >
          <div className="relative w-full h-24 transform-style-preserve-3d transition-transform duration-700">
            {/* Face avant */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg flex items-center justify-center">
              <div className="text-center text-white">
                <div className="text-2xl font-bold mb-1">{chartData.total}</div>
                <div className="text-sm opacity-90">
                  {chartData.chartType === 'campaign-objectives' ? 'Total Objectifs' : 'Total Répondants'}
                </div>
              </div>
            </div>
            
            {/* Face arrière */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg flex items-center justify-center rotate-y-180">
              <div className="text-center text-white">
                <div className="text-sm opacity-90 mb-1">Période</div>
                <div className="text-lg font-bold">{chartData.xAxisLabel}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Graphique */}
      <div className="h-64 sm:h-80">
        <Bar data={chartConfig} options={options} />
      </div>
    </div>
  );
}