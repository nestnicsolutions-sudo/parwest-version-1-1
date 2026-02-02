'use server';

import { createClient } from '@/lib/supabase/server';
import type {
  GuardDeployment,
  DeploymentDetail,
  DeploymentListResponse,
  CreateDeploymentDTO,
  UpdateDeploymentDTO,
  RevokeDeploymentDTO,
  SwapDeploymentDTO,
  DeploymentFilters,
  DeploymentMatrixData,
} from '@/types/deployment';

// =====================================================
// DEPLOYMENT CRUD OPERATIONS
// =====================================================

export async function getDeployments(
  filters?: DeploymentFilters,
  page = 1,
  pageSize = 20
): Promise<DeploymentListResponse> {
  const supabase = await createClient();

  let query = supabase
    .from('guard_deployments')
    .select(
      `
      *,
      guard:guards!inner(id, guard_code, full_name, cnic, phone),
      client:clients!inner(id, client_code, client_name),
      branch:client_branches!inner(id, branch_code, branch_name, address, city)
    `,
      { count: 'exact' }
    )
    .order('deployment_date', { ascending: false });

  // Apply filters
  if (filters?.guard_id) {
    query = query.eq('guard_id', filters.guard_id);
  }
  if (filters?.client_id) {
    query = query.eq('client_id', filters.client_id);
  }
  if (filters?.branch_id) {
    query = query.eq('branch_id', filters.branch_id);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.shift_type) {
    query = query.eq('shift_type', filters.shift_type);
  }
  if (filters?.from_date) {
    query = query.gte('deployment_date', filters.from_date);
  }
  if (filters?.to_date) {
    query = query.lte('deployment_date', filters.to_date);
  }

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    deployments: data as DeploymentDetail[],
    total: count || 0,
    page,
    pageSize,
  };
}

export async function getDeploymentById(id: string): Promise<DeploymentDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('guard_deployments')
    .select(
      `
      *,
      guard:guards!inner(id, guard_code, full_name, cnic, phone),
      client:clients!inner(id, client_code, client_name),
      branch:client_branches!inner(id, branch_code, branch_name, address, city)
    `
    )
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as DeploymentDetail;
}

export async function createDeployment(data: CreateDeploymentDTO): Promise<GuardDeployment> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single();

  if (!profile?.org_id) throw new Error('Organization not found');

  // Verify guard is available
  const { data: existingDeployment } = await supabase
    .from('guard_deployments')
    .select('id')
    .eq('guard_id', data.guard_id)
    .eq('status', 'active')
    .single();

  if (existingDeployment) {
    throw new Error('Guard is already deployed to another location');
  }

  const { data: newDeployment, error } = await supabase
    .from('guard_deployments')
    .insert({
      ...data,
      org_id: profile.org_id,
      status: 'planned',
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;

  // Update guard status
  await supabase
    .from('guards')
    .update({ status: 'deployed' })
    .eq('id', data.guard_id);

  // Update branch current_guards count
  const { data: branch } = await supabase
    .from('client_branches')
    .select('current_guards')
    .eq('id', data.branch_id)
    .single();

  if (branch) {
    await supabase
      .from('client_branches')
      .update({ current_guards: (branch.current_guards || 0) + 1 })
      .eq('id', data.branch_id);
  }

  return newDeployment as GuardDeployment;
}

export async function updateDeployment(
  id: string,
  data: UpdateDeploymentDTO
): Promise<GuardDeployment> {
  const supabase = await createClient();

  const { data: updated, error } = await supabase
    .from('guard_deployments')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return updated as GuardDeployment;
}

export async function activateDeployment(id: string): Promise<GuardDeployment> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: updated, error } = await supabase
    .from('guard_deployments')
    .update({
      status: 'active',
      deployed_at: new Date().toISOString(),
      deployed_by: user.id,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return updated as GuardDeployment;
}

export async function revokeDeployment(
  id: string,
  data: RevokeDeploymentDTO
): Promise<GuardDeployment> {
  const supabase = await createClient();

  const { data: deployment } = await supabase
    .from('guard_deployments')
    .select('guard_id, branch_id')
    .eq('id', id)
    .single();

  if (!deployment) throw new Error('Deployment not found');

  const { data: updated, error } = await supabase
    .from('guard_deployments')
    .update({
      status: 'revoked',
      end_date: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      end_reason: data.end_reason,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Update guard status back to active
  await supabase
    .from('guards')
    .update({ status: 'active' })
    .eq('id', deployment.guard_id);

  // Decrease branch current_guards count
  const { data: branch } = await supabase
    .from('client_branches')
    .select('current_guards')
    .eq('id', deployment.branch_id)
    .single();

  if (branch && branch.current_guards > 0) {
    await supabase
      .from('client_branches')
      .update({ current_guards: branch.current_guards - 1 })
      .eq('id', deployment.branch_id);
  }

  return updated as GuardDeployment;
}

export async function swapGuards(data: SwapDeploymentDTO): Promise<void> {
  const supabase = await createClient();

  // Get old deployment
  const { data: oldDeployment } = await supabase
    .from('guard_deployments')
    .select('*')
    .eq('guard_id', data.old_guard_id)
    .eq('status', 'active')
    .single();

  if (!oldDeployment) throw new Error('Old guard deployment not found');

  // Revoke old deployment
  await revokeDeployment(oldDeployment.id, { end_reason: data.reason });

  // Create new deployment
  await createDeployment({
    guard_id: data.new_guard_id,
    client_id: oldDeployment.client_id,
    branch_id: oldDeployment.branch_id,
    deployment_date: data.swap_date,
    shift_type: oldDeployment.shift_type,
    guard_rate: oldDeployment.guard_rate,
    client_rate: oldDeployment.client_rate,
    notes: `Swapped from ${data.old_guard_id} - ${data.reason}`,
  });
}

// =====================================================
// DEPLOYMENT MATRIX
// =====================================================

export async function getDeploymentMatrix(): Promise<DeploymentMatrixData> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single();

  if (!profile?.org_id) throw new Error('Organization not found');

  // Get all active branches
  const { data: branches } = await supabase
    .from('client_branches')
    .select(
      `
      id,
      branch_code,
      branch_name,
      required_guards,
      current_guards,
      client:clients!inner(client_name)
    `
    )
    .eq('org_id', profile.org_id)
    .eq('status', 'active')
    .order('branch_name');

  // Get all active guards
  const { data: guards } = await supabase
    .from('guards')
    .select('id, guard_code, full_name')
    .eq('org_id', profile.org_id)
    .in('status', ['active', 'deployed'])
    .order('guard_code');

  // Get all active deployments
  const { data: deployments } = await supabase
    .from('guard_deployments')
    .select('*')
    .eq('org_id', profile.org_id)
    .eq('status', 'active');

  // Build matrix
  const rows = (guards || []).map((guard) => {
    const guardDeployments: any = {};

    (deployments || [])
      .filter((d) => d.guard_id === guard.id)
      .forEach((d) => {
        guardDeployments[d.branch_id] = {
          deployment_id: d.id,
          status: d.status,
          shift_type: d.shift_type,
          start_date: d.deployment_date,
          end_date: d.end_date,
        };
      });

    return {
      guard_id: guard.id,
      guard_code: guard.guard_code,
      guard_name: guard.full_name,
      deployments: guardDeployments,
    };
  });

  return {
    branches:
      branches?.map((b: any) => ({
        id: b.id,
        branch_code: b.branch_code,
        branch_name: b.branch_name,
        client_name: b.client.client_name,
        required_guards: b.required_guards,
        current_guards: b.current_guards,
      })) || [],
    rows,
  };
}

// =====================================================
// STATISTICS
// =====================================================

export async function getDeploymentsStats() {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single();

  if (!profile?.org_id) throw new Error('Organization not found');

  const { count: totalDeployments } = await supabase
    .from('guard_deployments')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', profile.org_id);

  const { count: activeDeployments } = await supabase
    .from('guard_deployments')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', profile.org_id)
    .eq('status', 'active');

  return {
    total_deployments: totalDeployments || 0,
    active_deployments: activeDeployments || 0,
  };
}
