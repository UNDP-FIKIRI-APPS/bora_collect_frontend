import React, { useState, useEffect } from 'react';
import enhancedApiService from '../services/enhancedApiService';

export default function ExportsStats() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const data = await enhancedApiService.get<any[]>('/records', { skipCache: true });
      setRecords(data);
    } catch (err: any) {
      setError(err.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const exportCSV = async () => {
    try {
      const recordsData = await enhancedApiService.get<any[]>('/records', { skipCache: true });

      if (recordsData.length === 0) {
        setError('Aucune donnée à exporter');
        return;
      }

      const campaignId = recordsData[0].surveyId;
      const { blob } = await enhancedApiService.downloadBlob(`/records/campaign/${campaignId}/export`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enquetes_cuisson_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'export CSV');
    }
  };

  const exportPDF = async () => {
    try {
      const { blob } = await enhancedApiService.downloadBlob('/records/export/pdf');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enquetes_cuisson_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'export PDF');
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Exports et statistiques</h1>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      <p className="mb-4">{records.length} enregistrement(s) chargé(s)</p>
      <div className="flex gap-4">
        <button
          onClick={exportCSV}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Exporter CSV
        </button>
        <button
          onClick={exportPDF}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Exporter PDF
        </button>
      </div>
    </div>
  );
}
