import React, { lazy, Suspense } from 'react';
import { flipCardStyles } from './analyst/flipCardStyles';
import { useAnalystHome } from './analyst/useAnalystHome';
import AnalystNav from './analyst/AnalystNav';
import AnalystDashboardView from './analyst/AnalystDashboardView';
import AnalystEnquetesView from './analyst/AnalystEnquetesView';
import AnalystStatsView from './analyst/AnalystStatsView';
import AnalystDetailModal from './analyst/AnalystDetailModal';
import ExportNotification from '../components/ExportNotification';
import PNUDFooter from '../components/PNUDFooter';
import ConfirmationModal from '../components/ConfirmationModal';
const Settings = lazy(() => import('./Settings'));

export default function AnalystHome() {
  const {
    user,
    error,
    setError,
    view,
    setView,
    selectedEnumeratorId,
    setSelectedEnumeratorId,
    records,
    recordsLoading,
    validationStats,
    validationLoading,
    selectedRecord,
    setSelectedRecord,
    showDetailModal,
    setShowDetailModal,
    search,
    setSearch,
    reviewComment,
    setReviewComment,
    showCommentField,
    setShowCommentField,
    recordActionLocked,
    recordActionMessage,
    communeFilter,
    setCommuneFilter,
    provinceFilter,
    setProvinceFilter,
    campaignData,
    enumeratorStats,
    enumeratorStatsLoading,
    selectedCampaignId,
    setSelectedCampaignId,
    enumeratorSubmissions,
    setEnumeratorSubmissions,
    enumeratorSubmissionsLoading,
    analystStats,
    showDeleteConfirmModal,
    setShowDeleteConfirmModal,
    isDeletingDuplicates,
    setIsDeletingDuplicates,
    exportNotification,
    closeExportNotification,
    setExportNotification,
    pageSize,
    flippedCards,
    toggleCardFlip,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    currentPage,
    setCurrentPage,
    totalRecords,
    totalPages,
    hasMore,
    observerTarget,
    fetchEnumeratorStats,
    fetchRecords,
    fetchAnalystCampaignData,
    fetchAnalystStats,
    exportAllEnumeratorsSubmissions,
    handleEnumeratorClick,
    closeDetailModal,
    handleValidate,
    handleDetectDuplicates,
    handleLogout,
  } = useAnalystHome();

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <svg className="w-8 h-8 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h2 className="text-xl font-bold text-red-800">Erreur Critique</h2>
          </div>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
            className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Recharger la page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <style dangerouslySetInnerHTML={{ __html: flipCardStyles }} />

      <AnalystNav
        view={view}
        setView={setView}
        user={user}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        onLogout={handleLogout}
      />

      <main className="p-4 sm:p-8">
        {view === 'dashboard' && (
          <AnalystDashboardView
            validationLoading={validationLoading}
            flippedCards={flippedCards}
            toggleCardFlip={toggleCardFlip}
            validationStats={validationStats}
            analystStats={analystStats}
            setView={setView}
          />
        )}

        {view === 'enquetes' && (
          <AnalystEnquetesView
            selectedEnumeratorId={selectedEnumeratorId}
            analystStats={analystStats}
            selectedCampaignId={selectedCampaignId}
            setShowDeleteConfirmModal={setShowDeleteConfirmModal}
            enumeratorSubmissions={enumeratorSubmissions}
            setSelectedEnumeratorId={setSelectedEnumeratorId}
            setEnumeratorSubmissions={setEnumeratorSubmissions}
            setSearch={setSearch}
            setCommuneFilter={setCommuneFilter}
            fetchEnumeratorStats={fetchEnumeratorStats}
            enumeratorSubmissionsLoading={enumeratorSubmissionsLoading}
            campaignData={campaignData}
            exportAllEnumeratorsSubmissions={exportAllEnumeratorsSubmissions}
            enumeratorStats={enumeratorStats}
            enumeratorStatsLoading={enumeratorStatsLoading}
            search={search}
            communeFilter={communeFilter}
            provinceFilter={provinceFilter}
            setProvinceFilter={setProvinceFilter}
            handleEnumeratorClick={handleEnumeratorClick}
            records={records}
            setSelectedCampaignId={setSelectedCampaignId}
            fetchRecords={fetchRecords}
            fetchAnalystCampaignData={fetchAnalystCampaignData}
            setSelectedRecord={setSelectedRecord}
            setShowDetailModal={setShowDetailModal}
            setExportNotification={setExportNotification}
            hasMore={hasMore}
            observerTarget={observerTarget}
            recordsLoading={recordsLoading}
            currentPage={currentPage}
            totalPages={totalPages}
            totalRecords={totalRecords}
            pageSize={pageSize}
            setCurrentPage={setCurrentPage}
          />
        )}

        {view === 'statistiques' && (
          <AnalystStatsView
            setSelectedEnumeratorId={setSelectedEnumeratorId}
            setSearch={setSearch}
            setCommuneFilter={setCommuneFilter}
            setView={setView}
          />
        )}

        {view === 'parametres' && (
          <div>
            <h1 className="text-3xl font-bold mb-6 text-center">Paramètres du Compte Analyste</h1>
            <Suspense fallback={<div className="text-center py-8 text-gray-500">Chargement des paramètres...</div>}>
              <Settings />
            </Suspense>
          </div>
        )}
      </main>

      <ExportNotification
        show={exportNotification.isVisible}
        message={exportNotification.message}
        type={exportNotification.isSuccess ? 'success' : 'error'}
        onClose={closeExportNotification}
      />

      {showDetailModal && selectedRecord && (
        <AnalystDetailModal
          selectedRecord={selectedRecord}
          showCommentField={showCommentField}
          reviewComment={reviewComment}
          setReviewComment={setReviewComment}
          recordActionLocked={recordActionLocked}
          recordActionMessage={recordActionMessage}
          onClose={closeDetailModal}
          onValidate={handleValidate}
          setShowCommentField={setShowCommentField}
        />
      )}

      <ConfirmationModal
        isOpen={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        onConfirm={handleDetectDuplicates}
        title="Supprimer les doublons"
        message="Êtes-vous sûr de vouloir détecter et supprimer les doublons ? Cette action est irréversible et supprimera définitivement les formulaires en double."
        confirmText="Supprimer les doublons"
        cancelText="Annuler"
        type="danger"
        isLoading={isDeletingDuplicates}
      />

      <PNUDFooter />
    </div>
  );
}
