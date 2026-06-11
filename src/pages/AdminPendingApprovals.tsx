import React from 'react';
import { devLogger } from '../utils/logger';


interface AdminPendingApprovalsProps {
  onNavigateToRequests?: () => void;
  onNavigateToCreatePM?: () => void;
}

const AdminPendingApprovals: React.FC<AdminPendingApprovalsProps> = ({ 
  onNavigateToRequests, 
  onNavigateToCreatePM 
}) => {
  const handleNavigateToRequests = () => {
    if (onNavigateToRequests) {
      onNavigateToRequests();
    } else {
      devLogger.log('Navigation vers les demandes - fonction non définie');
    }
  };

  const handleNavigateToCreatePM = () => {
    if (onNavigateToCreatePM) {
      onNavigateToCreatePM();
    } else {
      devLogger.log('Navigation vers créer PM - fonction non définie');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-4xl mx-auto p-6">
        {/* En-tête */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Demandes PM
          </h1>
          <p className="text-xl text-gray-600">
            Gérez les demandes et créez de nouveaux Project Managers
          </p>
        </div>

        {/* Boutons d'action */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Bouton Demandes */}
          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <button
              onClick={handleNavigateToRequests}
              className="w-full p-8 text-center focus:outline-none focus:ring-4 focus:ring-blue-200 rounded-xl"
            >
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Demandes</h3>
                <p className="text-gray-600">
                  Consultez et gérez les demandes d'inscription des Project Managers en attente d'approbation
                </p>
              </div>
              <div className="text-blue-600 font-semibold text-lg">
                Voir les demandes →
              </div>
            </button>
          </div>

          {/* Bouton Créer PM */}
          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <button
              onClick={handleNavigateToCreatePM}
              className="w-full p-8 text-center focus:outline-none focus:ring-4 focus:ring-green-200 rounded-xl"
            >
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Créer PM</h3>
                <p className="text-gray-600">
                  Créez un nouveau compte Project Manager directement depuis l'interface d'administration
                </p>
              </div>
              <div className="text-green-600 font-semibold text-lg">
                Créer un PM →
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
              Utilisez <strong>"Demandes"</strong> pour traiter les inscriptions en attente et <strong>"Créer PM"</strong> pour ajouter directement un nouveau Project Manager au système.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPendingApprovals; 
