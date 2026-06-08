import { useState, useEffect } from 'react';
import { Bar, Doughnut, Line } from '../lib/chartSetup';
import enhancedApiService from '../services/enhancedApiService';
import { getChartColor, CompatibleColors } from '../utils/colors';

interface DashboardStats {
  pending: number;
  active: number;
  total: number;
  usersByRole: {
    admin: number;
    controller: number;
    analyst: number;
    projectManager: number;
  };
  usersByGender: {
    male: number;
    female: number;
    other: number;
  };
}

export default function AdminDashboardCharts() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await enhancedApiService.get<DashboardStats>('/users/dashboard-stats');
        setStats(data);
      } catch (error) {
        console.error('Erreur lors du chargement des statistiques dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!stats) return null;

  const usersByRole = stats.usersByRole;

  const genderData = {
    labels: ['Masculin', 'Féminin', 'Autre'],
    datasets: [
      {
        data: [stats.usersByGender.male, stats.usersByGender.female, stats.usersByGender.other],
        backgroundColor: [
          getChartColor(CompatibleColors.chart.blue, 0.8),
          getChartColor(CompatibleColors.chart.pink, 0.8),
          getChartColor(CompatibleColors.chart.green, 0.8),
        ],
        borderWidth: 1,
      },
    ],
  };

  const roleData = {
    labels: ['Admin', 'Enquêteurs', 'Analystes', 'Chefs de projet'],
    datasets: [
      {
        label: 'Utilisateurs actifs par rôle',
        data: [
          usersByRole.admin,
          usersByRole.controller,
          usersByRole.analyst,
          usersByRole.projectManager,
        ],
        backgroundColor: [
          getChartColor(CompatibleColors.chart.purple, 0.8),
          getChartColor(CompatibleColors.chart.blue, 0.8),
          getChartColor(CompatibleColors.chart.orange, 0.8),
          getChartColor(CompatibleColors.chart.green, 0.8),
        ],
        borderWidth: 1,
      },
    ],
  };

  const activityData = {
    labels: ['Actifs', 'En attente', 'Total'],
    datasets: [
      {
        label: 'Utilisateurs',
        data: [stats.active, stats.pending, stats.total],
        backgroundColor: [
          getChartColor(CompatibleColors.chart.green, 0.8),
          getChartColor(CompatibleColors.chart.orange, 0.8),
          getChartColor(CompatibleColors.chart.blue, 0.8),
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Répartition par sexe</h3>
        <div className="h-64 flex items-center justify-center">
          <Doughnut data={genderData} options={{ maintainAspectRatio: false, responsive: true }} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Utilisateurs par rôle</h3>
        <div className="h-64">
          <Bar
            data={roleData}
            options={{
              maintainAspectRatio: false,
              responsive: true,
              plugins: { legend: { display: false } },
            }}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Activité des comptes</h3>
        <div className="h-64">
          <Line
            data={activityData}
            options={{
              maintainAspectRatio: false,
              responsive: true,
              plugins: { legend: { display: false } },
            }}
          />
        </div>
      </div>
    </div>
  );
}
