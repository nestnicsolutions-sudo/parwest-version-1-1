/**
 * Clients Hooks - React Query
 * Client-side data fetching with caching and background sync
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClients, getClientById, createClient, updateClient, deleteClient, getClientsStats } from '@/lib/api/clients';
import type { ClientFilters, CreateClientDTO, UpdateClientDTO } from '@/types/client';
import { toast } from 'sonner';

export const clientKeys = {
  all: ['clients'] as const,
  lists: () => [...clientKeys.all, 'list'] as const,
  list: (filters?: ClientFilters, page?: number) => [...clientKeys.lists(), { filters, page }] as const,
  details: () => [...clientKeys.all, 'detail'] as const,
  detail: (id: string) => [...clientKeys.details(), id] as const,
  stats: () => [...clientKeys.all, 'stats'] as const,
};

export function useClients(filters?: ClientFilters, page = 1, pageSize = 50) {
  return useQuery({
    queryKey: clientKeys.list(filters, page),
    queryFn: () => getClients(filters, page, pageSize),
    staleTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: clientKeys.detail(id),
    queryFn: () => getClientById(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
}

export function useClientsStats() {
  return useQuery({
    queryKey: clientKeys.stats(),
    queryFn: () => getClientsStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes for stats
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateClientDTO) => createClient(data),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: clientKeys.lists() });
      toast.loading('Creating client...', { id: 'create-client' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      queryClient.invalidateQueries({ queryKey: clientKeys.stats() });
      toast.success('Client created successfully', { id: 'create-client' });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create client', { id: 'create-client' });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClientDTO }) =>
      updateClient(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: clientKeys.detail(id) });
      const previousClient = queryClient.getQueryData(clientKeys.detail(id));
      
      queryClient.setQueryData(clientKeys.detail(id), (old: any) => ({
        ...old,
        ...data,
      }));

      toast.loading('Updating client...', { id: 'update-client' });
      return { previousClient };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      toast.success('Client updated successfully', { id: 'update-client' });
    },
    onError: (error: any, variables, context) => {
      if (context?.previousClient) {
        queryClient.setQueryData(clientKeys.detail(variables.id), context.previousClient);
      }
      toast.error(error.message || 'Failed to update client', { id: 'update-client' });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onMutate: async () => {
      toast.loading('Deleting client...', { id: 'delete-client' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
      queryClient.invalidateQueries({ queryKey: clientKeys.stats() });
      toast.success('Client deleted successfully', { id: 'delete-client' });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete client', { id: 'delete-client' });
    },
  });
}
