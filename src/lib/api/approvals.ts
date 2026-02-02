/**
 * Approvals API - Manage approval workflows
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface ApprovalRequest {
    id: string;
    org_id: string;
    request_type: 'guard_enrollment' | 'guard_termination' | 'deployment_change' | 'leave_request' | 'expense_approval' | 'salary_adjustment' | 'client_creation' | 'client_update' | 'client_branch_creation';
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    entity_type: string;
    entity_id: string | null;
    entity_data: any;
    title: string;
    description: string | null;
    reason: string | null;
    requested_by: string;
    requested_by_name: string | null;
    requested_by_role: string | null;
    requested_at: string;
    approved_by: string | null;
    approved_by_name: string | null;
    approved_at: string | null;
    rejection_reason: string | null;
    comments: any[];
    created_at: string;
    updated_at: string;
}

export interface CreateApprovalRequest {
    request_type: ApprovalRequest['request_type'];
    entity_type: string;
    entity_id?: string;
    entity_data: any;
    title: string;
    description?: string;
    reason?: string;
    priority?: ApprovalRequest['priority'];
}

// ============================================================================
// Get Approval Requests
// ============================================================================

export async function getApprovalRequests(filters?: {
    status?: ApprovalRequest['status'];
    request_type?: ApprovalRequest['request_type'];
}): Promise<{
    data: ApprovalRequest[] | null;
    error: any;
}> {
    try {
        const supabase = createClient();
        
        let query = supabase
            .from('approval_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (filters?.status) {
            query = query.eq('status', filters.status);
        }

        if (filters?.request_type) {
            query = query.eq('request_type', filters.request_type);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching approval requests:', error);
            return { data: null, error };
        }

        return { data, error: null };
    } catch (err) {
        console.error('Exception in getApprovalRequests:', err);
        return { data: null, error: err };
    }
}

// ============================================================================
// Get Pending Approvals Count
// ============================================================================

export async function getPendingApprovalsCount(): Promise<number> {
    try {
        const supabase = createClient();
        
        const { count, error } = await supabase
            .from('approval_requests')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        if (error) {
            console.error('Error counting pending approvals:', error);
            return 0;
        }

        return count || 0;
    } catch (err) {
        console.error('Exception in getPendingApprovalsCount:', err);
        return 0;
    }
}

// ============================================================================
// Get Approval Request by ID
// ============================================================================

export async function getApprovalRequestById(id: string): Promise<{
    data: ApprovalRequest | null;
    error: any;
}> {
    try {
        const supabase = createClient();
        
        const { data, error } = await supabase
            .from('approval_requests')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching approval request:', error);
            return { data: null, error };
        }

        return { data, error: null };
    } catch (err) {
        console.error('Exception in getApprovalRequestById:', err);
        return { data: null, error: err };
    }
}

// ============================================================================
// Create Approval Request (Client-side)
// ============================================================================

export async function createApprovalRequest(
    request: CreateApprovalRequest
): Promise<{
    data: ApprovalRequest | null;
    error: any;
}> {
    console.log('🔔 Creating approval request:', request);
    
    try {
        const supabase = createClient();
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        console.log('👤 Current user:', user?.id);
        
        if (!user) {
            console.error('❌ User not authenticated');
            return { data: null, error: 'User not authenticated' };
        }

        // Get user profile for org_id and name
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('org_id, full_name, role')
            .eq('id', user.id)
            .single();

        console.log('👤 User profile:', profile);
        console.log('📋 Profile error:', profileError);

        if (!profile) {
            console.error('❌ User profile not found');
            return { data: null, error: 'User profile not found' };
        }

        const requestData = {
            org_id: profile.org_id,
            request_type: request.request_type,
            entity_type: request.entity_type,
            entity_id: request.entity_id,
            entity_data: request.entity_data,
            title: request.title,
            description: request.description,
            reason: request.reason,
            priority: request.priority || 'normal',
            requested_by: user.id,
            requested_by_name: profile.full_name,
            requested_by_role: profile.role,
            status: 'pending',
        };

        console.log('📤 Inserting approval request:', requestData);

        const { data, error } = await supabase
            .from('approval_requests')
            .insert(requestData)
            .select()
            .single();

        if (error) {
            console.error('❌ Error creating approval request:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            return { data: null, error: error.message || error };
        }

        console.log('✅ Approval request created:', data);
        return { data, error: null };
    } catch (err: any) {
        console.error('❌ Exception in createApprovalRequest:', err);
        return { data: null, error: err.message || err };
    }
}
