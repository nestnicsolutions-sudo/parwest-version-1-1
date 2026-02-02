/**
 * Guards Hooks - React Query
 * Client-side data fetching with caching and background sync
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGuards, getGuardById, createGuard, updateGuard, deleteGuard } from '@/lib/api/guards';
import type { GuardFilters, CreateGuardDTO, UpdateGuardDTO } from '@/types/guard';
import { toast } from 'sonner';

// Query keys for type-safety and cache management
export const guardKeys = {
  all: ['guards'] as const,
  lists: () => [...guardKeys.all, 'list'] as const,
  list: (filters: GuardFilters) => [...guardKeys.lists(), filters] as const,
  details: () => [...guardKeys.all, 'detail'] as const,
  detail: (id: string) => [...guardKeys.details(), id] as const,
};

/**
 * Fetch guards list with filters
 * Data cached for 10 minutes, refetches in background
 */
export function useGuards(filters: GuardFilters = {}) {
  return useQuery({
    queryKey: guardKeys.list(filters),
    queryFn: () => getGuards(filters),
    staleTime: 10 * 60 * 1000, // 10 minutes
    placeholderData: (previousData) => previousData, // Keep showing old data while fetching
  });
}

/**
 * Fetch single guard details
 */
export function useGuard(id: string) {
  return useQuery({
    queryKey: guardKeys.detail(id),
    queryFn: () => getGuardById(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Create new guard with optimistic update
 */
export function useCreateGuard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGuardDTO) => createGuard(data),
    onMutate: async (newGuard) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: guardKeys.lists() });

      // Optimistically update UI
      toast.loading('Creating guard...', { id: 'create-guard' });
    },
    onSuccess: () => {
      // Invalidate and refetch in background
      queryClient.invalidateQueries({ queryKey: guardKeys.lists() });
      toast.success('Guard created successfully', { id: 'create-guard' });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create guard', { id: 'create-guard' });
    },
  });
}

/**
 * Update guard with optimistic update
 */
export function useUpdateGuard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGuardDTO }) =>
      updateGuard(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: guardKeys.detail(id) });

      // Snapshot previous value
      const previousGuard = queryClient.getQueryData(guardKeys.detail(id));

      // Optimistically update
      queryClient.setQueryData(guardKeys.detail(id), (old: any) => ({
        ...old,
        ...data,
      }));

      toast.loading('Updating guard...', { id: 'update-guard' });

      return { previousGuard };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guardKeys.lists() });
      toast.success('Guard updated successfully', { id: 'update-guard' });
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousGuard) {
        queryClient.setQueryData(guardKeys.detail(variables.id), context.previousGuard);
      }
      toast.error(error.message || 'Failed to update guard', { id: 'update-guard' });
    },
  });
}

/**
 * Delete guard
 */
export function useDeleteGuard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteGuard(id),
    onMutate: async () => {
      toast.loading('Deleting guard...', { id: 'delete-guard' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: guardKeys.lists() });
      toast.success('Guard deleted successfully', { id: 'delete-guard' });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete guard', { id: 'delete-guard' });
    },
  });
}

/**
 * Prefetch guards for next page
 */
export function usePrefetchGuards() {
  const queryClient = useQueryClient();

  return (filters: GuardFilters) => {
    queryClient.prefetchQuery({
      queryKey: guardKeys.list(filters),
      queryFn: () => getGuards(filters),
      staleTime: 10 * 60 * 1000,
    });
  };
}
