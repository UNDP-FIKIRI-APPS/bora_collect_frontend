import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { APP_LOGO_URL } from '../config/branding';
import ProjectManagerForm from '../components/ProjectManagerForm';

const ProjectManagerRegistration: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-block cursor-pointer hover:opacity-80 transition-opacity">
            <img className="mx-auto h-20 w-auto object-contain" src={APP_LOGO_URL} alt="Logo Fikiri Collect" />
          </Link>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Inscription Project Manager
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Créez votre compte Project Manager pour gérer vos campagnes d'enquête
          </p>
        </div>

        {/* Bouton Retour */}
        <div className="mb-4">
          <button
            onClick={() => navigate('/create-account')}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">Retour à la sélection de rôle</span>
          </button>
        </div>

        <ProjectManagerForm 
          isAdmin={false}
        />
      </div>
    </div>
  );
};

export default ProjectManagerRegistration;