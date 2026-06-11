import enhancedApiService from '../../services/enhancedApiService';

export interface EnumeratorSubmissions {
  appSubmissions: any[];
  publicSubmissions: any[];
  total: number;
}

export interface DuplicateDetectionResult {
  duplicatesRemoved: number;
  duplicatesFound: number;
}

export async function fetchUserById(userId: string): Promise<string> {
  try {
    const userData = await enhancedApiService.get<any>(`/users/${userId}`, { skipCache: true });
    return userData.name || userData.email || 'Utilisateur inconnu';
  } catch (error: any) {
    const message = error?.message || '';
    if (message.includes('non trouvée') || message.includes('404')) {
      return `Utilisateur ${userId} non trouvé`;
    }
    if (message.includes('refusé') || message.includes('403')) {
      return 'Accès refusé';
    }
    console.error(`Erreur lors de la récupération de l'utilisateur ${userId}:`, error);
    return 'Erreur de récupération';
  }
}

export async function validateRecord(
  recordId: string,
  status: 'VALIDATED' | 'NEEDS_REVIEW',
  comment: string | null,
) {
  return enhancedApiService.post(`/records/${recordId}/validate`, { status, comment });
}

export async function exportAnalystRecords(campaignId?: string) {
  const query = campaignId ? `?campaignId=${campaignId}` : '';
  return enhancedApiService.downloadBlob(`/records/analyst/export${query}`);
}

export async function fetchEnumeratorStats(campaignId: string): Promise<any[]> {
  const data = await enhancedApiService.get<any>(
    `/records/campaign/${campaignId}/enumerators/stats`,
    { skipCache: true },
  );
  return Array.isArray(data) ? data : data?.data || [];
}

export async function fetchEnumeratorSubmissions(
  campaignId: string,
  enumeratorId: string,
): Promise<EnumeratorSubmissions> {
  return enhancedApiService.get<EnumeratorSubmissions>(
    `/records/campaign/${campaignId}/enumerator/${enumeratorId}/submissions`,
    { skipCache: true },
  );
}

export async function detectDuplicates(campaignId: string): Promise<DuplicateDetectionResult> {
  return enhancedApiService.post<DuplicateDetectionResult>(
    `/records/detect-and-remove-duplicates?campaignId=${campaignId}`,
  );
}
