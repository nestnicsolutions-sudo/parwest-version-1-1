/**
 * Guards API Service
 * All database operations for Guards module
 * Optimized with caching and efficient queries
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { cachedFetch, apiCache } from './cache';
import type {
    Guard,
    GuardDetail,
    GuardFilters,
    GuardListResponse,
    CreateGuardDTO,
    UpdateGuardDTO,
    GuardDocument,
    GuardVerification,
    GuardLoan,
    GuardClearance,
} from '@/types/guard';

/**
 * Get list of guards with filters and pagination
 * Cached for 30 seconds to improve performance
 */
export async function getGuards(filters: GuardFilters = {}): Promise<GuardListResponse> {
    const cacheKey = `guards:list:${JSON.stringify(filters)}`;
    
    return cachedFetch(cacheKey, async () => {
        const supabase = await createClient();
        
        const {
            status,
            search,
            regional_office_id,
            assigned_branch_id,
            is_active = true,
            page = 1,
            limit = 50,
        } = filters;

        let query = supabase
            .from('guards')
            .select('id, guard_code, first_name, last_name, cnic, phone, status, regional_office_id, assigned_branch_id, is_active, created_at', { count: 'exact' })
            .eq('is_deleted', false);

        if (is_active !== undefined) {
            query = query.eq('is_active', is_active);
        }

        if (status) {
            query = query.eq('status', status);
        }

        if (regional_office_id) {
            query = query.eq('regional_office_id', regional_office_id);
        }

        if (assigned_branch_id) {
            query = query.eq('assigned_branch_id', assigned_branch_id);
        }

        if (search) {
            query = query.or(`guard_code.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,cnic.ilike.%${search}%,phone.ilike.%${search}%`);
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range((page - 1) * limit, page * limit - 1);

        if (error) {
            console.warn('Guards table not ready:', error.message);
            return {
                data: [],
                total: 0,
                page,
                limit,
                totalPages: 0,
            };
        }

        return {
            data: (data || []) as Guard[],
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit),
        };
    }, 30000); // 30 second cache
}

/**
 * Get single guard by ID with all related data
 * Cached for 60 seconds
 */
export async function getGuardById(id: string): Promise<GuardDetail | null> {
    const cacheKey = `guard:detail:${id}`;
    
    return cachedFetch(cacheKey, async () => {
        const supabase = await createClient();

        const { data: guard, error } = await supabase
            .from('guards')
            .select('*')
            .eq('id', id)
            .eq('is_deleted', false)
            .single();

        if (error) {
            console.error('Error fetching guard:', error);
            return null;
        }

        if (!guard) return null;

        // Fetch related data in parallel
        const [documents, verifications, loans, clearance, statusHistory] = await Promise.all([
            getGuardDocuments(id),
            getGuardVerifications(id),
            getGuardLoans(id),
            getGuardClearance(id),
            getGuardStatusHistory(id),
        ]);

        return {
            ...guard,
            documents,
            verifications,
            loans,
            clearance: clearance || undefined,
            status_history: statusHistory,
        };
    }, 60000); // 60 second cache
}

/**
 * Create new guard
 */
export async function createGuard(data: CreateGuardDTO): Promise<{ data: Guard | null; error: string | null }> {
    const supabase = await createClient();

    console.log('🔐 [API] Creating guard - Starting authentication check');
    
    // Get current user for audit trail
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error('❌ [API] Unauthorized - No user session found');
        return { data: null, error: 'Unauthorized' };
    }
    
    console.log('✅ [API] User authenticated:', { user_id: user.id, email: user.email });

    // Get user's org_id from profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

    if (!profile) {
        console.error('❌ [API] User profile not found for user:', user.id);
        return { data: null, error: 'User profile not found' };
    }
    
    console.log('✅ [API] Profile loaded:', { org_id: profile.org_id });
    
    // Generate guard code (simple implementation - you can enhance this)
    const timestamp = Date.now().toString().slice(-6);
    const guard_code = `GRD${timestamp}`;
    
    console.log('📝 [API] Inserting guard into database with code:', guard_code);

    const { data: guard, error } = await supabase
        .from('guards')
        .insert({
            ...data,
            guard_code,
            org_id: profile.org_id,
            status: 'applicant',
            created_by: user.id,
            updated_by: user.id,
            is_active: true,
            is_deleted: false,
            documents_verified: false,
            police_verification_status: 'pending',
            character_certificate_status: 'pending',
            medical_certificate_status: 'pending',
            total_deployments: 0,
            active_deployments: 0,
        })
        .select()
        .single();

    if (error) {
        console.error('❌ [API] Database error creating guard:', {
            error: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
        });
        return { data: null, error: error.message };
    }
    
    console.log('✅ [API] Guard created successfully:', {
        guard_id: guard.id,
        guard_code: guard.guard_code,
        full_name: `${guard.first_name} ${guard.last_name}`,
        cnic: guard.cnic,
        status: guard.status,
        created_at: guard.created_at,
    });

    return { data: guard, error: null };
}

/**
 * Update guard
 */
export async function updateGuard(
    id: string,
    data: UpdateGuardDTO
): Promise<{ data: Guard | null; error: string | null }> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { data: null, error: 'Unauthorized' };
    }

    const { data: guard, error } = await supabase
        .from('guards')
        .update({
            ...data,
            updated_by: user.id,
        })
        .eq('id', id)
        .eq('is_deleted', false)
        .select()
        .single();

    if (error) {
        console.error('Error updating guard:', error);
        return { data: null, error: error.message };
    }

    return { data: guard, error: null };
}

/**
 * Update guard status (with automatic history logging via trigger)
 */
export async function updateGuardStatus(
    id: string,
    newStatus: string,
    reason?: string
): Promise<{ success: boolean; error: string | null }> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
        .from('guards')
        .update({
            status: newStatus,
            updated_by: user.id,
        })
        .eq('id', id);

    if (error) {
        console.error('Error updating guard status:', error);
        return { success: false, error: error.message };
    }

    return { success: true, error: null };
}

/**
 * Soft delete guard
 */
export async function deleteGuard(id: string): Promise<{ success: boolean; error: string | null }> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
        .from('guards')
        .update({
            is_deleted: true,
            is_active: false,
            deleted_at: new Date().toISOString(),
            deleted_by: user.id,
        })
        .eq('id', id);

    if (error) {
        console.error('Error deleting guard:', error);
        return { success: false, error: error.message };
    }

    return { success: true, error: null };
}

/**
 * Get guard documents
 */
export async function getGuardDocuments(guardId: string): Promise<GuardDocument[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('guard_documents')
        .select('*')
        .eq('guard_id', guardId)
        .order('uploaded_at', { ascending: false });

    if (error) {
        console.error('Error fetching guard documents:', error);
        return [];
    }

    return data || [];
}

/**
 * Get guard verifications
 */
export async function getGuardVerifications(guardId: string): Promise<GuardVerification[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('guard_verifications')
        .select('*')
        .eq('guard_id', guardId)
        .order('requested_at', { ascending: false });

    if (error) {
        console.error('Error fetching guard verifications:', error);
        return [];
    }

    return data || [];
}

/**
 * Get guard loans
 */
export async function getGuardLoans(guardId: string): Promise<GuardLoan[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('guard_loans')
        .select('*')
        .eq('guard_id', guardId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching guard loans:', error);
        return [];
    }

    return data || [];
}

/**
 * Get guard clearance
 */
export async function getGuardClearance(guardId: string): Promise<GuardClearance | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('guard_clearance')
        .select('*')
        .eq('guard_id', guardId)
        .order('initiated_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        // No clearance record is not an error
        return null;
    }

    return data;
}

/**
 * Get guard status history
 */
export async function getGuardStatusHistory(guardId: string): Promise<any[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('guard_status_history')
        .select('*')
        .eq('guard_id', guardId)
        .order('transitioned_at', { ascending: false });

    if (error) {
        console.error('Error fetching guard status history:', error);
        return [];
    }

    return data || [];
}

/**
 * Get guards count by status
 */
export async function getGuardsCountByStatus(): Promise<Record<string, number>> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('guards')
        .select('status')
        .eq('is_deleted', false)
        .eq('is_active', true);

    if (error) {
        console.error('Error fetching guards count:', error);
        return {};
    }

    const counts: Record<string, number> = {};
    data?.forEach((guard) => {
        counts[guard.status] = (counts[guard.status] || 0) + 1;
    });

    return counts;
}

/**
 * Search guards (full-text search)
 */
export async function searchGuards(query: string, limit: number = 10): Promise<Guard[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .rpc('get_guards_filtered', {
            p_search: query,
            p_limit: limit,
            p_offset: 0,
        });

    if (error) {
        console.error('Error searching guards:', error);
        return [];
    }

    return data || [];
}

/**
 * Get approved guards available for deployment
 * Only returns guards with status 'approved' and not currently deployed
 * Excludes guards with active or planned deployments
 */
export async function getGuardsForDeployment(): Promise<GuardListResponse> {
    const supabase = await createClient();
    
    // First, get all guards with active or planned deployments
    const { data: deployedGuards, error: deploymentError } = await supabase
        .from('guard_deployments')
        .select('guard_id')
        .in('status', ['active', 'planned']);

    if (deploymentError) {
        console.warn('Error fetching deployments:', deploymentError.message);
    }

    // Get list of deployed guard IDs
    const deployedGuardIds = deployedGuards?.map(d => d.guard_id) || [];

    // Build query for available guards
    let query = supabase
        .from('guards')
        .select('*', { count: 'exact' })
        .eq('is_deleted', false)
        .eq('is_active', true)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

    // Exclude guards that are currently deployed
    if (deployedGuardIds.length > 0) {
        query = query.not('id', 'in', `(${deployedGuardIds.join(',')})`);
    }

    const { data, error, count } = await query;

    if (error) {
        console.warn('Guards table not ready:', error.message);
        return {
            data: [],
            total: 0,
            page: 1,
            limit: 1000,
            totalPages: 0,
        };
    }

    return {
        data: data || [],
        total: count || 0,
        page: 1,
        limit: 1000,
        totalPages: 1,
    };
}
