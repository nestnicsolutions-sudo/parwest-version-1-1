/**
 * React Query Client Configuration
 * Aggressive caching strategy for instant loads and background sync
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 10 minutes
      staleTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
      
      // Retry failed requests
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch strategies
      refetchOnWindowFocus: true, // Refetch when user returns to tab
      refetchOnReconnect: true, // Refetch when internet reconnects
      refetchOnMount: false, // Don't refetch on component mount if data exists
      
      // Network mode
      networkMode: 'offlineFirst', // Try cache first, then network
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});
