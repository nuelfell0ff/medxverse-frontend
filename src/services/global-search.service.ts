import { apiClient } from '@/lib/api-client';
import { GlobalSearchResult } from '@/types/global-search';

export const globalSearchService = {
  search: async (query: string, limit = 30): Promise<GlobalSearchResult[]> => {
    const response = await apiClient.get('/search', {
      params: { q: query.trim(), limit },
    });
    return Array.isArray(response?.data) ? response.data : [];
  },
};
