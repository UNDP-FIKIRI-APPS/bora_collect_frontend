import { useCallback } from 'react';
import enhancedApiService from '../../services/enhancedApiService';

export interface AnalystDashboardResponse {
  campaignData: any;
  analystStats: any;
  validationStats: any;
  records: {
    data: any[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

export function useAnalystDashboard() {
  const fetchDashboard = useCallback(async (page = 1, limit = 50) => {
    return enhancedApiService.get<AnalystDashboardResponse>(
      `/records/analyst/dashboard?page=${page}&limit=${limit}`,
    );
  }, []);

  const invalidateDashboard = useCallback(() => {
    enhancedApiService.invalidateCache('/records/analyst/dashboard');
    enhancedApiService.invalidateCache('/records/analyst-stats');
    enhancedApiService.invalidateCache('/validation/analyst-stats');
    enhancedApiService.invalidateCache('/users/analyst-campaign-data');
  }, []);

  return { fetchDashboard, invalidateDashboard };
}
