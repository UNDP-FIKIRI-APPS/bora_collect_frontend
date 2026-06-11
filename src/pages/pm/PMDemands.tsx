import React, { useState, useEffect } from 'react';
import NotificationBadge from '../../components/NotificationBadge';
import enhancedApiService from '../../services/enhancedApiService';
import { devLogger } from '../../utils/logger';


interface PMDemandsProps {
  onNavigateToApprovalRequests?: () => void;
  onNavigateToApplicationReview?: () => void;
}

const PMDemands: React.FC<PMDemandsProps> = ({ 
  onNavigateToApprovalRequests, 
  onNavigateToApplicationReview 
}) => {
  const [pendingCounts, setPendingCounts] = useState({ 
    pendingApplications: 0, 
    pendingRecords: 0 
  });

  // Fonction pour charger les compteurs de demandes en attente
  const fetchPendingCounts = async () => {
    try {
      const data = await enhancedApiService.get<any>('/surveys/pm-pending-counts', { skipCache: true });
      devLogger.log('🔔 PM Demands - Compteurs mis à jour:', data);
      setPendingCounts(data);
    } catch (err: any) {
      console.error('❌ Erreur lors du chargement des compteurs:', err.message);
    }
  };

  useEffect(() => {
    fetchPendingCounts();
    
    // Refresh automatique supprimé - les compteurs seront mis à jour uniquement via les événements

    // Écouter les événements de nouvelle demande
    const handleNewApplication = () => {
      devLogger.log('🔔 PM Demands - Nouvelle demande détectée, rafraîchissement des compteurs');
      fetchPendingCounts();
    };

    const handleNewRecord = () => {
      devLogger.log('🔔 PM Demands - Nouveau record détecté, rafraîchissement des compteurs');
      fetchPendingCounts();
    };

    window.addEventListener('newApplicationSubmitted', handleNewApplication);
    window.addEventListener('applicationStatusChanged', handleNewApplication);
    window.addEventListener('newRecordSubmitted', handleNewRecord);

    return () => {
      window.removeEventListener('newApplicationSubmitted', handleNewApplication);
      window.removeEventListener('applicationStatusChanged', handleNewApplication);
      window.removeEventListener('newRecordSubmitted', handleNewRecord);
    };
  }, []);

  const handleNavigateToApprovalRequests = () => {
    if (onNavigateToApprovalRequests) {
      onNavigateToApprovalRequests();
    } else {
      devLogger.log('Navigation vers les demandes d\'inscription - fonction non définie');
    }
  };

  const handleNavigateToApplicationReview = () => {
    if (onNavigateToApplicationReview) {
      onNavigateToApplicationReview();
    } else {
      devLogger.log('Navigation vers les candidatures - fonction non définie');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-4xl mx-auto p-6">
        {/* En-tête */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Demandes
          </h1>
          <p className="text-xl text-gray-600">
            Gérez les inscriptions et les enquêtes
          </p>
        </div>

        {/* Boutons d'action */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Bouton Inscriptions */}
          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <button
              onClick={handleNavigateToApprovalRequests}
              className="w-full p-8 text-center focus:outline-none focus:ring-4 focus:ring-blue-200 rounded-xl"
            >
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4 relative">
                  <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <NotificationBadge count={pendingCounts.pendingRecords} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Inscriptions</h3>
                <p className="text-gray-600">
                  Consultez et gérez les inscriptions des enquêteurs en attente d'approbation
                </p>
              </div>
              <div className="text-blue-600 font-semibold text-lg">
                Voir les inscriptions →
              </div>
            </button>
          </div>

          {/* Bouton Enquêtes */}
          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <button
              onClick={handleNavigateToApplicationReview}
              className="w-full p-8 text-center focus:outline-none focus:ring-4 focus:ring-green-200 rounded-xl"
            >
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4 relative">
                  <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <NotificationBadge count={pendingCounts.pendingApplications} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Enquêtes</h3>
                <p className="text-gray-600">
                  Consultez et gérez les enquêtes des enquêteurs pour vos campagnes
                </p>
              </div>
              <div className="text-green-600 font-semibold text-lg">
                Voir les enquêtes →
              </div>
            </button>
          </div>
        </div>

        {/* Informations supplémentaires */}
        <div className="mt-12 text-center">
          <div className="bg-blue-50 rounded-lg p-6 max-w-2xl mx-auto">
            <h4 className="text-lg font-semibold text-blue-900 mb-2">
              💡 Information
            </h4>
            <p className="text-blue-800">
              Utilisez <strong>"Inscriptions"</strong> pour traiter les inscriptions en attente et <strong>"Enquêtes"</strong> pour gérer les enquêtes aux campagnes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PMDemands;