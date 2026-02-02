/**
 * Dashboard Hooks - React Query
 * Client-side data fetching with caching and background sync
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { getDashboardStats, getDashboardAlerts, getRecentActivity } from '@/lib/api/dashboard';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  alerts: () => [...dashboardKeys.all, 'alerts'] as const,
  activity: () => [...dashboardKeys.all, 'activity'] as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: () => getDashboardStats(),
    staleTime: 2 * 60 * 1000, // 2 minutes for real-time stats
    refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes
  });
}

export function useDashboardAlerts() {
  return useQuery({
    queryKey: dashboardKeys.alerts(),
    queryFn: () => getDashboardAlerts(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: dashboardKeys.activity(),
    queryFn: () => getRecentActivity(),
    staleTime: 2 * 60 * 1000,
  });
}
