import React from 'react';
import { APP_LOGO_URL } from '../../config/branding';
import { environment } from '../../config/environment';
import type { AnalystView } from './useAnalystHome';

export interface AnalystNavProps {
  view: AnalystView;
  setView: (view: AnalystView) => void;
  user: any;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  onLogout: () => void;
}

export default function AnalystNav({
  view,
  setView,
  user,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  onLogout,
}: AnalystNavProps) {
  return (
      <nav className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white shadow-lg border-b border-blue-700">
        <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-20">
          {/* Logo et titre */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <div className="relative">
                <img src={APP_LOGO_URL} alt="Logo Fikiri Collect" className="h-8 sm:h-10 w-auto object-contain bg-white rounded-lg shadow-md p-1" />
                <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm sm:text-base text-white">Analyste</span>
                <span className="text-xs text-blue-200 hidden sm:block">FikiriCollect</span>
              </div>
          </div>
          
          {/* Bouton menu mobile */}
          <button 
              className="md:hidden p-2 rounded-lg hover:bg-blue-700/50 transition-all duration-200 hover:scale-105 active:scale-95"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Menu"
          >
              <svg className="w-6 h-6 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* Menu desktop */}
            <div className="hidden md:flex items-center gap-0.5 lg:gap-1">
            <button 
              onClick={() => setView('dashboard')} 
                className={`px-2 lg:px-3 py-2 rounded-lg font-semibold text-xs lg:text-sm transition-all duration-200 whitespace-nowrap ${
                  view === 'dashboard' 
                    ? 'bg-white text-blue-900 shadow-lg transform scale-105' 
                    : 'text-white hover:bg-blue-700/50 hover:scale-105'
                }`}
              >
                <div className="flex items-center gap-0.5 lg:gap-1">
                  <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                  </svg>
              Tableau de bord
                </div>
            </button>
            <button 
              onClick={() => setView('enquetes')} 
                className={`px-2 lg:px-3 py-2 rounded-lg font-semibold text-xs lg:text-sm transition-all duration-200 whitespace-nowrap ${
                  view === 'enquetes' 
                    ? 'bg-white text-blue-900 shadow-lg transform scale-105' 
                    : 'text-white hover:bg-blue-700/50 hover:scale-105'
                }`}
              >
                <div className="flex items-center gap-0.5 lg:gap-1">
                  <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                  </svg>
              Les enquêtes
                </div>
            </button>
            <button 
              onClick={() => setView('statistiques')} 
                className={`px-2 lg:px-3 py-2 rounded-lg font-semibold text-xs lg:text-sm transition-all duration-200 whitespace-nowrap ${
                  view === 'statistiques' 
                    ? 'bg-white text-blue-900 shadow-lg transform scale-105' 
                    : 'text-white hover:bg-blue-700/50 hover:scale-105'
                }`}
              >
                <div className="flex items-center gap-0.5 lg:gap-1">
                  <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                  </svg>
              Statistiques Détaillées
                </div>
            </button>
            <button 
              onClick={() => setView('parametres')} 
                className={`px-2 lg:px-3 py-2 rounded-lg font-semibold text-xs lg:text-sm transition-all duration-200 whitespace-nowrap ${
                  view === 'parametres' 
                    ? 'bg-white text-blue-900 shadow-lg transform scale-105' 
                    : 'text-white hover:bg-blue-700/50 hover:scale-105'
                }`}
              >
                <div className="flex items-center gap-0.5 lg:gap-1">
                  <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
                  </svg>
              Paramètres
                </div>
            </button>
            
            {/* Profil utilisateur et déconnexion */}
              <div className="flex items-center gap-1 ml-1 pl-1">
              {user && (
                  <div className="relative">
                    {user?.profilePhoto ? (
                      <img 
                        src={`${environment.apiBaseUrl}${user.profilePhoto}`} 
                        alt="Photo de profil" 
                        className="w-5 h-5 rounded-full object-cover shadow-md hover:shadow-lg transition-shadow duration-200"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-white text-blue-900 flex items-center justify-center font-bold text-xs shadow-md hover:shadow-lg transition-shadow duration-200">
                        {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full border border-white"></div>
                </div>
              )}
              <button 
                onClick={onLogout} 
                  className="bg-white text-blue-900 px-1.5 py-1 rounded-lg font-semibold text-xs hover:bg-gray-100 hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 whitespace-nowrap"
              >
                Déconnexion
              </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Menu mobile */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-blue-800/50 backdrop-blur-sm border-t border-blue-700">
            <div className="px-4 py-4 space-y-2">
            <button 
              onClick={() => setView('dashboard')} 
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  view === 'dashboard' 
                    ? 'bg-white text-blue-900 shadow-lg' 
                    : 'text-white hover:bg-blue-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                  </svg>
              Tableau de bord
                </div>
            </button>
            <button 
              onClick={() => setView('enquetes')} 
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  view === 'enquetes' 
                    ? 'bg-white text-blue-900 shadow-lg' 
                    : 'text-white hover:bg-blue-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                  </svg>
              Les enquêtes
                </div>
            </button>
            <button 
              onClick={() => setView('statistiques')} 
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  view === 'statistiques' 
                    ? 'bg-white text-blue-900 shadow-lg' 
                    : 'text-white hover:bg-blue-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                  </svg>
              Statistiques Détaillées
                </div>
            </button>
            <button 
              onClick={() => setView('parametres')} 
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  view === 'parametres' 
                    ? 'bg-white text-blue-900 shadow-lg' 
                    : 'text-white hover:bg-blue-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
                  </svg>
              Paramètres
                </div>
            </button>
            
            {/* Profil et déconnexion mobile */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-blue-700">
              {user && (
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {user?.profilePhoto ? (
                        <img 
                          src={`${environment.apiBaseUrl}${user.profilePhoto}`} 
                          alt="Photo de profil" 
                          className="w-8 h-8 rounded-full object-cover shadow-md"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-white text-blue-900 flex items-center justify-center font-bold shadow-md">
                          {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-white">{user?.name || 'Analyste'}</span>
                      <span className="text-xs text-blue-200">{user?.email}</span>
                    </div>
                </div>
              )}
              <button 
                onClick={onLogout} 
                  className="bg-white text-blue-900 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-100 hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Déconnexion
              </button>
              </div>
            </div>
          </div>
        )}
      </nav>
  );
}
