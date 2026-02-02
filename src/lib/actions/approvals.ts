'use server';

/**
 * Approval Actions - Server-side approval workflow operations
 */

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// ============================================================================
// Admin Client
// ============================================================================

function getAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase configuration');
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

// ============================================================================
// Approve Request
// ============================================================================

export async function approveRequestAction(
    requestId: string,
    approverId: string,
    approverName: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = getAdminClient();

        // SECURITY: Verify approver has admin role
        const { data: approverProfile, error: profileError } = await supabase
            .from('profiles')
            .select('role, org_id')
            .eq('id', approverId)
            .single();

        if (profileError || !approverProfile) {
            console.error('❌ Approver profile not found:', profileError);
            return { success: false, error: 'Unauthorized: Invalid approver' };
        }

        // Only system_admin can approve requests
        if (approverProfile.role !== 'system_admin') {
            console.error('❌ Unauthorized approval attempt by:', approverId, 'Role:', approverProfile.role);
            return { success: false, error: 'Unauthorized: Admin access required' };
        }

        // Get the approval request
        const { data: request, error: fetchError } = await supabase
            .from('approval_requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (fetchError || !request) {
            return { success: false, error: 'Approval request not found' };
        }

        // SECURITY: Verify request belongs to same organization
        if (request.org_id !== approverProfile.org_id) {
            console.error('❌ Cross-org approval attempt. Request org:', request.org_id, 'Approver org:', approverProfile.org_id);
            return { success: false, error: 'Unauthorized: Cross-organization access denied' };
        }

        if (request.status !== 'pending') {
            return { success: false, error: 'Request is not pending' };
        }

        // Update approval request status
        const { error: updateError } = await supabase
            .from('approval_requests')
            .update({
                status: 'approved',
                approved_by: approverId,
                approved_by_name: approverName,
                approved_at: new Date().toISOString(),
            })
            .eq('id', requestId);

        if (updateError) {
            console.error('Error approving request:', updateError);
            return { success: false, error: updateError.message };
        }

        // Handle entity-specific approval logic
        if (request.request_type === 'guard_enrollment' && request.entity_data) {
            // Create the guard in the database
            const guardData = request.entity_data;
            const { error: guardError } = await supabase
                .from('guards')
                .insert({
                    ...guardData,
                    org_id: request.org_id, // Include org_id from approval request
                    status: 'approved',
                    created_by: request.requested_by,
                    created_at: new Date().toISOString(),
                });

            if (guardError) {
                console.error('Error creating guard:', guardError);
                // Revert approval if guard creation fails
                await supabase
                    .from('approval_requests')
                    .update({ status: 'pending' })
                    .eq('id', requestId);
                return { success: false, error: 'Failed to create guard after approval' };
            }
        }

        // Handle client creation approval
        if (request.request_type === 'client_creation' && request.entity_data) {
            const { branch_data, ...clientData } = request.entity_data;
            
            // Create client
            const { data: newClient, error: clientError } = await supabase
                .from('clients')
                .insert({
                    ...clientData,
                    org_id: request.org_id,
                    created_by: request.requested_by,
                    updated_by: approverId,
                    created_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (clientError) {
                console.error('Error creating client:', clientError);
                // Revert approval if client creation fails
                await supabase
                    .from('approval_requests')
                    .update({ status: 'pending' })
                    .eq('id', requestId);
                return { success: false, error: 'Failed to create client after approval' };
            }

            // Create branch if branch data exists
            if (newClient && branch_data) {
                // Generate branch code
                const branch_code = `${newClient.client_code}-BR-001`;
                
                const { error: branchError } = await supabase
                    .from('client_branches')
                    .insert({
                        ...branch_data,
                        branch_code,
                        current_guards: 0,
                        client_id: newClient.id,
                        org_id: request.org_id,
                        created_by: request.requested_by,
                        updated_by: approverId,
                    });

                if (branchError) {
                    console.error('Error creating branch:', branchError);
                    // Don't fail the entire approval if branch creation fails
                    // Client is already created, admin can add branch manually
                }
            }
        }

        // Handle client branch creation approval
        if (request.request_type === 'client_branch_creation' && request.entity_data) {
            const branchData = request.entity_data;
            
            // Generate branch code if not provided
            let branch_code = branchData.branch_code;
            if (!branch_code && branchData.client_id) {
                const { data: client } = await supabase
                    .from('clients')
                    .select('client_code')
                    .eq('id', branchData.client_id)
                    .single();
                    
                const { data: lastBranch } = await supabase
                    .from('client_branches')
                    .select('branch_code')
                    .eq('client_id', branchData.client_id)
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
            
            const { error: branchError } = await supabase
                .from('client_branches')
                .insert({
                    ...branchData,
                    branch_code,
                    current_guards: 0,
                    org_id: request.org_id,
                    created_by: request.requested_by,
                    updated_by: approverId,
                    created_at: new Date().toISOString(),
                });

            if (branchError) {
                console.error('Error creating branch:', branchError);
                // Revert approval if branch creation fails
                await supabase
                    .from('approval_requests')
                    .update({ status: 'pending' })
                    .eq('id', requestId);
                return { success: false, error: 'Failed to create branch after approval' };
            }
        }

        // Handle client update approval
        if (request.request_type === 'client_update' && request.entity_id && request.entity_data) {
            const { error: clientError } = await supabase
                .from('clients')
                .update({
                    ...request.entity_data,
                    updated_by: approverId,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', request.entity_id);

            if (clientError) {
                console.error('Error updating client:', clientError);
                // Revert approval if client update fails
                await supabase
                    .from('approval_requests')
                    .update({ status: 'pending' })
                    .eq('id', requestId);
                return { success: false, error: 'Failed to update client after approval' };
            }
        }

        // Handle branch creation approval (new standalone branch)
        if (request.request_type === 'branch_creation' && request.entity_data) {
            const branchData = request.entity_data;
            
            // Generate branch code if not provided
            let branch_code = branchData.branch_code;
            if (!branch_code && branchData.client_id) {
                const { data: lastBranch } = await supabase
                    .from('client_branches')
                    .select('branch_code')
                    .eq('client_id', branchData.client_id)
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
                branch_code = `${branchData.client_code || 'CLT'}-BR-${nextNumber.toString().padStart(3, '0')}`;
            }
            
            const { error: branchError } = await supabase
                .from('client_branches')
                .insert({
                    ...branchData,
                    branch_code,
                    current_guards: 0,
                    org_id: request.org_id,
                    created_by: request.requested_by,
                    updated_by: approverId,
                    created_at: new Date().toISOString(),
                });

            if (branchError) {
                console.error('Error creating branch:', branchError);
                // Revert approval if branch creation fails
                await supabase
                    .from('approval_requests')
                    .update({ status: 'pending' })
                    .eq('id', requestId);
                return { success: false, error: 'Failed to create branch after approval' };
            }
        }

        revalidatePath('/approvals');
        revalidatePath('/guards');
        revalidatePath('/clients');
        revalidatePath('/deployments');

        return { success: true };
    } catch (err: any) {
        console.error('Exception in approveRequestAction:', err);
        return { success: false, error: err.message };
    }
}

// ============================================================================
// Reject Request
// ============================================================================

export async function rejectRequestAction(
    requestId: string,
    approverId: string,
    approverName: string,
    rejectionReason: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = getAdminClient();

        // SECURITY: Verify approver has admin role
        const { data: approverProfile, error: profileError } = await supabase
            .from('profiles')
            .select('role, org_id')
            .eq('id', approverId)
            .single();

        if (profileError || !approverProfile) {
            console.error('❌ Approver profile not found:', profileError);
            return { success: false, error: 'Unauthorized: Invalid approver' };
        }

        // Only system_admin can reject requests
        if (approverProfile.role !== 'system_admin') {
            console.error('❌ Unauthorized rejection attempt by:', approverId, 'Role:', approverProfile.role);
            return { success: false, error: 'Unauthorized: Admin access required' };
        }

        // Get the approval request
        const { data: request, error: fetchError } = await supabase
            .from('approval_requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (fetchError || !request) {
            return { success: false, error: 'Approval request not found' };
        }

        // SECURITY: Verify request belongs to same organization
        if (request.org_id !== approverProfile.org_id) {
            console.error('❌ Cross-org rejection attempt. Request org:', request.org_id, 'Approver org:', approverProfile.org_id);
            return { success: false, error: 'Unauthorized: Cross-organization access denied' };
        }

        if (request.status !== 'pending') {
            return { success: false, error: 'Request is not pending' };
        }

        // Update approval request status
        const { error: updateError } = await supabase
            .from('approval_requests')
            .update({
                status: 'rejected',
                approved_by: approverId,
                approved_by_name: approverName,
                approved_at: new Date().toISOString(),
                rejection_reason: rejectionReason,
            })
            .eq('id', requestId);

        if (updateError) {
            console.error('Error rejecting request:', updateError);
            return { success: false, error: updateError.message };
        }

        revalidatePath('/approvals');

        return { success: true };
    } catch (err: any) {
        console.error('Exception in rejectRequestAction:', err);
        return { success: false, error: err.message };
    }
}
