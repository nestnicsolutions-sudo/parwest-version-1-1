'use server';

/**
 * Server-side Approval API functions
 * Used by Server Actions only
 */

import { createClient as createServerClient } from '@/lib/supabase/server';
import type { ApprovalRequest } from './approvals';

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
// Create Approval Request (Server-side for Server Actions)
// ============================================================================

export async function createApprovalRequestServer(
    request: CreateApprovalRequest
): Promise<{
    data: ApprovalRequest | null;
    error: any;
}> {
    console.log('🔔 Creating approval request (server):', request);
    
    try {
        const supabase = await createServerClient();
        
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
        console.error('❌ Exception in createApprovalRequestServer:', err);
        return { data: null, error: err.message || err };
    }
}
