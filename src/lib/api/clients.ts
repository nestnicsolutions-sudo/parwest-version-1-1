'use server';

import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { cachedFetch, apiCache } from './cache';
import type {
  Client,   
  ClientBranch,
  ClientContract,
  ClientDetail,
  ClientListResponse,
  CreateClientDTO,
  UpdateClientDTO,
  CreateBranchDTO,
  ClientFilters,
} from '@/types/client';

// =====================================================
// CLIENT CRUD OPERATIONS - Optimized with caching
// =====================================================

export async function getClients(
  filters?: ClientFilters,
  page = 1,
  pageSize = 20
): Promise<ClientListResponse> {
  const cacheKey = `clients:list:${JSON.stringify({ filters, page, pageSize })}`;
  
  return cachedFetch(cacheKey, async () => {
    const supabase = await createSupabaseClient();

    let query = supabase
      .from('clients')
      .select('id, client_code, client_name, client_type, status, primary_contact_name, primary_contact_phone, city, is_active', { count: 'exact' })
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.search) {
      query = query.or(`client_name.ilike.%${filters.search}%,client_code.ilike.%${filters.search}%`);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.client_type) {
      query = query.eq('client_type', filters.client_type);
    }
    if (filters?.city) {
      query = query.eq('city', filters.city);
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      clients: data as Client[],
      total: count || 0,
      page,
      pageSize,
    };
  }, 30000); // 30 second cache
}

export async function getClientById(id: string): Promise<ClientDetail | null> {
  const cacheKey = `client:detail:${id}`;
  
  return cachedFetch(cacheKey, async () => {
    const supabase = await createSupabaseClient();

    // Get client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (clientError) throw clientError;
    if (!client) return null;

    // Get branches
    const { data: branches } = await supabase
      .from('client_branches')
      .select('*')
      .eq('client_id', id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Get contracts
    const { data: contracts } = await supabase
      .from('client_contracts')
      .select('*')
      .eq('client_id', id)
      .order('created_at', { ascending: false });

    // Get active guards count
    const { count: activeGuards } = await supabase
      .from('guard_deployments')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', id)
      .eq('status', 'active');

    return {
      ...client,
      branches: (branches || []) as ClientBranch[],
      contracts: (contracts || []) as ClientContract[],
      active_guards: activeGuards || 0,
      total_branches: branches?.length || 0,
    };
  }, 30000); // 30 second cache
}

export async function createClient(
  data: CreateClientDTO,
  branchData?: Omit<CreateBranchDTO, 'client_id'> | null
): Promise<{ success: boolean; client?: Client; approvalRequestId?: string; message: string }> {
  const supabase = await createSupabaseClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Get org_id and role
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role, full_name')
    .eq('id', user.id)
    .single();

  if (!profile?.org_id) throw new Error('Organization not found');

  // Generate client code
  const { data: lastClient } = await supabase
    .from('clients')
    .select('client_code')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let nextNumber = 1;
  if (lastClient?.client_code) {
    const match = lastClient.client_code.match(/CLT-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }
  const client_code = `CLT-${nextNumber.toString().padStart(4, '0')}`;

  // Check if user is super admin (system_admin)
  const isSuperAdmin = profile.role === 'system_admin';

  if (isSuperAdmin) {
    // Super admin: Create client directly without approval
    const { data: newClient, error } = await supabase
      .from('clients')
      .insert({
        ...data,
        client_code,
        org_id: profile.org_id,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Create branch if branch data is provided
    if (newClient && branchData) {
      try {
        console.log('🔧 Creating branch with data:', {
          ...branchData,
          client_id: newClient.id,
        });
        const branch = await createBranch({
          ...branchData,
          client_id: newClient.id,
        });
        console.log('✅ Branch created successfully:', branch);
      } catch (branchError) {
        console.error('❌ Error creating branch:', branchError);
        // Don't fail client creation if branch fails
      }
    } else {
      console.log('⚠️ No branch data provided or client creation failed');
      console.log('newClient:', newClient?.id);
      console.log('branchData:', branchData);
    }

    return { 
      success: true, 
      client: newClient as Client,
      message: 'Client created successfully'
    };
  } else {
    // Regular user: Submit approval request
    const { createApprovalRequestServer } = await import('@/lib/api/approvals.server');
    
    const approvalData = {
      request_type: 'client_creation' as const,
      entity_type: 'client',
      entity_data: {
        ...data,
        client_code,
        branch_data: branchData, // Include branch data in approval request
      },
      title: `New Client: ${data.client_name}`,
      description: `Client creation request for ${data.client_name} (${client_code})`,
      reason: `User ${profile.full_name} is requesting to create a new client`,
      priority: 'normal' as const,
    };

    const { data: approvalRequest, error: approvalError } = await createApprovalRequestServer(approvalData);

    if (approvalError || !approvalRequest) {
      throw new Error(approvalError || 'Failed to create approval request');
    }

    return {
      success: true,
      approvalRequestId: approvalRequest.id,
      message: 'Client creation request submitted for approval'
    };
  }
}

export async function updateClient(
  id: string,
  data: UpdateClientDTO
): Promise<{ success: boolean; client?: Client; approvalRequestId?: string; message: string }> {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Get org_id and role
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role, full_name')
    .eq('id', user.id)
    .single();

  if (!profile?.org_id) throw new Error('Organization not found');

  // Get current client data
  const { data: currentClient } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();

  if (!currentClient) throw new Error('Client not found');

  // Check if user is super admin (system_admin)
  const isSuperAdmin = profile.role === 'system_admin';

  if (isSuperAdmin) {
    // Super admin: Update client directly
    const { data: updated, error } = await supabase
      .from('clients')
      .update({
        ...data,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      client: updated as Client,
      message: 'Client updated successfully'
    };
  } else {
    // Regular user: Submit approval request
    const { createApprovalRequestServer } = await import('@/lib/api/approvals.server');
    
    const approvalData = {
      request_type: 'client_update' as const,
      entity_type: 'client',
      entity_id: id,
      entity_data: data,
      previous_data: currentClient,
      title: `Update Client: ${currentClient.client_name}`,
      description: `Client update request for ${currentClient.client_name} (${currentClient.client_code})`,
      reason: `User ${profile.full_name} is requesting to update client information`,
      priority: 'normal' as const,
    };

    const { data: approvalRequest, error: approvalError } = await createApprovalRequestServer(approvalData);

    if (approvalError || !approvalRequest) {
      throw new Error(approvalError || 'Failed to create approval request');
    }

    return {
      success: true,
      approvalRequestId: approvalRequest.id,
      message: 'Client update request submitted for approval'
    };
  }
}

export async function deleteClient(id: string): Promise<void> {
  const supabase = await createSupabaseClient();

  const { error } = await supabase
    .from('clients')
    .update({ is_deleted: true })
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// CLIENT BRANCHES
// =====================================================

export async function getClientBranches(clientId: string): Promise<ClientBranch[]> {
  const supabase = await createSupabaseClient();

  const { data, error } = await supabase
    .from('client_branches')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .order('branch_name');

  if (error) throw error;
  return data as ClientBranch[];
}

export async function createBranch(data: CreateBranchDTO): Promise<{ success: boolean; branch?: ClientBranch; approvalRequestId?: string; message: string }> {
  console.log('📍 createBranch called with data:', data);
  const supabase = await createSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role, full_name')
    .eq('id', user.id)
    .single();

  if (!profile?.org_id) throw new Error('Organization not found');

  // Get client info for approval title
  const { data: client } = await supabase
    .from('clients')
    .select('client_name, client_code')
    .eq('id', data.client_id)
    .single();

  // Generate branch code if not provided
  let branch_code = data.branch_code;
  if (!branch_code) {
    const { data: lastBranch } = await supabase
      .from('client_branches')
      .select('branch_code')
      .eq('client_id', data.client_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 1;
    if (lastBranch?.branch_code) {
      const match = lastBranch.branch_code.match(/BR-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
    branch_code = `${client?.client_code || 'CLT'}-BR-${nextNumber.toString().padStart(3, '0')}`;
  }

  // Check if user is super admin (system_admin)
  const isSuperAdmin = profile.role === 'system_admin';

  if (isSuperAdmin) {
    // Super admin: Create branch directly
    console.log('📍 Inserting branch with org_id:', profile.org_id);

    const { data: newBranch, error } = await supabase
      .from('client_branches')
      .insert({
        ...data,
        branch_code,
        current_guards: 0,
        org_id: profile.org_id,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Database error creating branch:', error);
      throw error;
    }
    
    console.log('✅ Branch created in DB:', newBranch);
    return {
      success: true,
      branch: newBranch as ClientBranch,
      message: 'Branch created successfully'
    };
  } else {
    // Regular user: Submit approval request
    const { createApprovalRequestServer } = await import('@/lib/api/approvals.server');
    
    const approvalData = {
      request_type: 'client_branch_creation' as const,
      entity_type: 'branch',
      entity_data: {
        ...data,
        client_name: client?.client_name,
        client_code: client?.client_code,
      },
      title: `New Branch: ${data.branch_name}`,
      description: `Branch creation request for ${data.branch_name} at ${client?.client_name}`,
      reason: `User ${profile.full_name} is requesting to add a new branch`,
      priority: 'normal' as const,
    };

    const { data: approvalRequest, error: approvalError } = await createApprovalRequestServer(approvalData);

    if (approvalError || !approvalRequest) {
      throw new Error(approvalError || 'Failed to create approval request');
    }

    return {
      success: true,
      approvalRequestId: approvalRequest.id,
      message: 'Branch creation request submitted for approval'
    };
  }
}

export async function updateBranch(
  id: string,
  data: Partial<CreateBranchDTO>
): Promise<ClientBranch> {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: updated, error } = await supabase
    .from('client_branches')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return updated as ClientBranch;
}

// =====================================================
// STATISTICS
// =====================================================

export async function getClientsStats() {
  const supabase = await createSupabaseClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single();

  if (!profile?.org_id) throw new Error('Organization not found');

  // Total clients
  const { count: totalClients } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', profile.org_id)
    .eq('is_deleted', false);

  // Active clients
  const { count: activeClients } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', profile.org_id)
    .eq('status', 'active')
    .eq('is_deleted', false);

  // Total branches
  const { count: totalBranches } = await supabase
    .from('client_branches')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', profile.org_id)
    .eq('is_active', true);

  return {
    total_clients: totalClients || 0,
    active_clients: activeClients || 0,
    total_branches: totalBranches || 0,
  };
}
