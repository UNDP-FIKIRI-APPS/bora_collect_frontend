import React, { useState, useEffect } from 'react';
import { Link2, Copy, Check, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import enhancedApiService from '../../services/enhancedApiService';

interface PublicLink {
  id: string;
  token: string;
  isActive: boolean;
  createdAt: string;
  expiresAt: string | null;
  survey: {
    id: string;
    title: string;
    description: string;
    status: string;
  };
  _count: {
    submissions: number;
  };
}

interface AvailableSurvey {
  id: string;
  title: string;
  description: string;
  status: string;
}

const ControllerSettingsExtras: React.FC = () => {
  const [user, setUser] = useState<{ role?: string } | null>(null);
  const [publicLinks, setPublicLinks] = useState<PublicLink[]>([]);
  const [availableSurveys, setAvailableSurveys] = useState<AvailableSurvey[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [submissionStats, setSubmissionStats] = useState<{
    appSubmissions: number;
    publicSubmissions: number;
    total: number;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await enhancedApiService.get<{ user: { role?: string } }>('/auth/me', {
          skipCache: true,
        });
        setUser(data.user);
      } catch {
        const localUser = localStorage.getItem('user');
        if (localUser) setUser(JSON.parse(localUser));
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (user?.role !== 'CONTROLLER') return;

    const loadControllerDashboard = async () => {
      setLoadingLinks(true);
      setLoadingStats(true);
      try {
        const data = await enhancedApiService.get<{
          links: PublicLink[];
          availableSurveys: AvailableSurvey[];
          submissionStats: { appSubmissions: number; publicSubmissions: number; total: number };
        }>('/public-links/controller-dashboard');

        setPublicLinks(data.links);
        setAvailableSurveys(data.availableSurveys);
        setSubmissionStats(data.submissionStats);
      } catch (error) {
        console.error('Erreur lors du chargement du dashboard enquêteur:', error);
      } finally {
        setLoadingLinks(false);
        setLoadingStats(false);
      }
    };

    loadControllerDashboard();
  }, [user?.role]);

  const generatePublicLink = async () => {
    if (!selectedSurveyId) return;

    setGeneratingLink(true);
    try {
      const newLink = await enhancedApiService.post<PublicLink>('/public-links/generate', {
        surveyId: selectedSurveyId,
      });
      setPublicLinks((prev) => [newLink, ...prev]);
      setSelectedSurveyId('');
    } catch (error) {
      console.error('Erreur lors de la génération du lien:', error);
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyLinkToClipboard = async (link: PublicLink) => {
    const fullUrl = `${window.location.origin}/form/${link.token}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedLinkId(link.id);
      setTimeout(() => setCopiedLinkId(null), 2000);
    } catch (error) {
      console.error('Erreur lors de la copie:', error);
    }
  };

  const copyEmbedCode = async (link: PublicLink) => {
    const embedUrl = `${window.location.origin}/embed/${link.token}`;
    const code = `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0" title="Formulaire Fikiri Collect"></iframe>`;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedLinkId(`embed-${link.id}`);
      setTimeout(() => setCopiedLinkId(null), 2000);
    } catch (error) {
      console.error('Erreur lors de la copie embed:', error);
    }
  };

  const toggleLinkStatus = async (linkId: string, isActive: boolean) => {
    try {
      const endpoint = isActive ? 'deactivate' : 'reactivate';
      await enhancedApiService.patch(`/public-links/${linkId}/${endpoint}`);
      setPublicLinks((prev) =>
        prev.map((link) => (link.id === linkId ? { ...link, isActive: !isActive } : link)),
      );
    } catch (error) {
      console.error('Erreur lors de la modification du lien:', error);
    }
  };

  if (user?.role !== 'CONTROLLER') return null;

  return (
    <>
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 rounded-lg">
            <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Mes statistiques</h2>
            <p className="text-sm text-gray-500">Vue d&apos;ensemble de vos soumissions de formulaires</p>
          </div>
        </div>

        {loadingStats ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-gray-500">Chargement des statistiques...</p>
          </div>
        ) : submissionStats ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-3xl font-bold text-blue-600 mb-2">{submissionStats.appSubmissions}</div>
              <div className="text-blue-800 font-medium">Par application</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-3xl font-bold text-green-600 mb-2">{submissionStats.publicSubmissions}</div>
              <div className="text-green-800 font-medium">Par lien public</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-3xl font-bold text-purple-600 mb-2">{submissionStats.total}</div>
              <div className="text-purple-800 font-medium">Total</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">Aucune statistique disponible pour le moment</div>
        )}
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Link2 className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Liens de partage</h2>
            <p className="text-sm text-gray-500">
              Générez des liens pour permettre à d&apos;autres personnes de remplir vos formulaires
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
          <h3 className="font-medium text-blue-900 mb-3">Générer un nouveau lien</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedSurveyId}
              onChange={(e) => setSelectedSurveyId(e.target.value)}
              className="flex-1 min-h-11 px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              disabled={generatingLink || availableSurveys.length === 0}
              aria-label="Sélectionner une campagne"
            >
              <option value="">
                {availableSurveys.length === 0 ? 'Aucune campagne disponible' : 'Sélectionner une campagne...'}
              </option>
              {availableSurveys.map((survey) => (
                <option key={survey.id} value={survey.id}>
                  {survey.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={generatePublicLink}
              disabled={generatingLink || !selectedSurveyId}
              className="flex items-center justify-center gap-2 min-h-11 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {generatingLink ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Générer
            </button>
          </div>
        </div>

        <div>
          <h3 className="font-medium text-gray-900 mb-3">Mes liens ({publicLinks.length})</h3>

          {loadingLinks ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-500">Chargement des liens...</p>
            </div>
          ) : publicLinks.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <Link2 className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">Aucun lien généré pour le moment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {publicLinks.map((link) => (
                <div
                  key={link.id}
                  className={`border rounded-xl p-4 transition-all ${
                    link.isActive ? 'border-green-200 bg-green-50/50' : 'border-gray-200 bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{link.survey?.title || 'Campagne inconnue'}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            link.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {link.isActive ? 'Actif' : 'Désactivé'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        <span className="font-medium text-blue-600">{link._count?.submissions || 0}</span>{' '}
                        soumission(s) via ce lien
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyLinkToClipboard(link)}
                        className={`flex items-center gap-1 min-h-11 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          copiedLinkId === link.id
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {copiedLinkId === link.id ? (
                          <>
                            <Check className="h-4 w-4" />
                            Copié !
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copier
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyEmbedCode(link)}
                        className={`flex items-center gap-1 min-h-11 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          copiedLinkId === `embed-${link.id}`
                            ? 'bg-green-100 text-green-700'
                            : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        }`}
                      >
                        {copiedLinkId === `embed-${link.id}` ? 'Embed copié !' : 'Embed'}
                      </button>
                      <a
                        href={`/form/${link.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 min-h-11 min-w-11 flex items-center justify-center bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                        aria-label="Ouvrir le lien"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => toggleLinkStatus(link.id, link.isActive)}
                        className={`p-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg transition-colors ${
                          link.isActive
                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                            : 'bg-green-100 text-green-600 hover:bg-green-200'
                        }`}
                        aria-label={link.isActive ? 'Désactiver le lien' : 'Réactiver le lien'}
                      >
                        {link.isActive ? <Trash2 className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ControllerSettingsExtras;
