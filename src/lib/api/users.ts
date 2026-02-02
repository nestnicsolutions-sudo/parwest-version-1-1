/**
 * Users API - Admin User Management
 * Handles creation, listing, and management of system users
 */

import { createClient } from '@/lib/supabase/client';
import type { UserProfile } from '@/lib/permissions';

// ============================================================================
// Types
// ============================================================================

export interface CreateUserRequest {
    email: string;
    password: string;
    full_name: string;
    role_id: string;
    phone?: string;
    regional_office?: string;
}

export interface UpdateUserRequest {
    full_name?: string;
    role?: string;
    phone?: string;
    regional_office?: string;
    is_active?: boolean;
}

// Database profile type (matches public.profiles table)
export interface DatabaseProfile {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    phone: string | null;
    regional_office: string | null;
    org_id: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface UserWithProfile extends DatabaseProfile {
    role_name?: string;
    last_sign_in_at?: string;
}

// ============================================================================
// Get Users
// ============================================================================

export async function getUsers(): Promise<{
    data: UserWithProfile[] | null;
    error: any;
}> {
    console.log('📋 Getting all users...');

    try {
        const supabase = createClient();

        // First, get all profiles
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (profilesError) {
            console.error('❌ Error fetching profiles:', profilesError);
            return { data: null, error: profilesError };
        }

        // Then get all roles
        const { data: roles, error: rolesError } = await supabase
            .from('roles')
            .select('id, name');

        if (rolesError) {
            console.error('❌ Error fetching roles:', rolesError);
            console.error('Full error:', JSON.stringify(rolesError, null, 2));
            // Continue without roles - users will still load
        }

        // Create a role lookup map
        const roleMap = new Map(roles?.map(r => [r.id, r.name]) || []);

        // Transform the data
        const users: UserWithProfile[] = profiles?.map((profile: any) => ({
            ...profile,
            role_name: profile.role || 'Unknown',
        })) || [];

        console.log(`✅ Fetched ${users.length} users`);
        return { data: users, error: null };
    } catch (err) {
        console.error('❌ Exception in getUsers:', err);
        return { data: null, error: err };
    }
}

// ============================================================================
// Get User by ID
// ============================================================================

export async function getUserById(userId: string): Promise<{
    data: UserWithProfile | null;
    error: any;
}> {
    console.log('🔍 Getting user:', userId);

    try {
        const supabase = createClient();

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('❌ Error fetching user:', error);
            return { data: null, error };
        }

        // Role is already text in profile
        const user: UserWithProfile = {
            ...profile,
            role_name: profile.role || 'Unknown',
        };

        console.log('✅ User fetched:', user.email);
        return { data: user, error: null };
    } catch (err) {
        console.error('❌ Exception in getUserById:', err);
        return { data: null, error: err };
    }
}

// ============================================================================
// Update User Profile
// ============================================================================

export async function updateUser(
    userId: string,
    updates: UpdateUserRequest
): Promise<{
    data: DatabaseProfile | null;
    error: any;
}> {
    console.log('✏️ Updating user:', userId, updates);

    try {
        const supabase = createClient();

        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            console.error('❌ Error updating user:', error);
            return { data: null, error };
        }

        console.log('✅ User updated successfully');
        return { data, error: null };
    } catch (err) {
        console.error('❌ Exception in updateUser:', err);
        return { data: null, error: err };
    }
}

// ============================================================================
// Toggle User Active Status
// ============================================================================

export async function toggleUserStatus(
    userId: string,
    isActive: boolean
): Promise<{
    data: DatabaseProfile | null;
    error: any;
}> {
    console.log(`🔄 ${isActive ? 'Activating' : 'Deactivating'} user:`, userId);

    return updateUser(userId, { is_active: isActive });
}

// ============================================================================
// Search Users
// ============================================================================

export async function searchUsers(searchTerm: string): Promise<{
    data: UserWithProfile[] | null;
    error: any;
}> {
    console.log('🔍 Searching users:', searchTerm);

    try {
        const supabase = createClient();

        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('*')
            .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error searching users:', error);
            return { data: null, error };
        }

        // Get roles
        const { data: roles } = await supabase
            .from('roles')
            .select('id, name');

        const roleMap = new Map(roles?.map(r => [r.id, r.name]) || []);

        const users: UserWithProfile[] = profiles?.map((profile: any) => ({
            ...profile,
            role_name: profile.role || 'Unknown',
        })) || [];

        console.log(`✅ Found ${users.length} users matching "${searchTerm}"`);
        return { data: users, error: null };
    } catch (err) {
        console.error('❌ Exception in searchUsers:', err);
        return { data: null, error: err };
    }
}

// ============================================================================
// Get Users by Role
// ============================================================================

export async function getUsersByRole(roleId: string): Promise<{
    data: UserWithProfile[] | null;
    error: any;
}> {
    console.log('🎭 Getting users by role:', roleId);

    try {
        const supabase = createClient();

        // First get role name from role ID
        const { data: roleData } = await supabase
            .from('roles')
            .select('name')
            .eq('id', roleId)
            .single();

        const roleName = roleData?.name || '';

        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', roleName)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error fetching users by role:', error);
            return { data: null, error };
        }

        const users: UserWithProfile[] = profiles?.map((profile: any) => ({
            ...profile,
            role_name: profile.role || 'Unknown',
        })) || [];

        console.log(`✅ Found ${users.length} users with role ${roleId}`);
        return { data: users, error: null };
    } catch (err) {
        console.error('❌ Exception in getUsersByRole:', err);
        return { data: null, error: err };
    }
}
