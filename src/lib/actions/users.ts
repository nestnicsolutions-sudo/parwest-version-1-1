'use server';

/**
 * User Management Server Actions
 * These actions run server-side and can use the service role key
 */

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// ============================================================================
// Types
// ============================================================================

export interface CreateUserData {
    email: string;
    password: string;
    full_name: string;
    role_id: string;
    org_id: string;
    phone?: string;
    regional_office?: string;
}

export interface ActionResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

// ============================================================================
// Create Supabase Admin Client
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
// Create User (Admin Only)
// ============================================================================

export async function createUserAction(
    userData: CreateUserData
): Promise<ActionResult> {
    console.log('👤 Creating new user:', userData.email);
    console.log('📋 User data:', JSON.stringify(userData, null, 2));

    try {
        const supabase = getAdminClient();

        console.log('Using org_id:', userData.org_id);

        // 1. Get the role name from role_id
        const { data: roleData } = await supabase
            .from('roles')
            .select('name')
            .eq('id', userData.role_id)
            .single();

        const roleName = roleData?.name || 'guard';
        console.log('Role name:', roleName);

        // 2. Create auth user (without trigger, so no automatic profile creation)
        console.log('🔐 Creating auth user...');
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: userData.email,
            password: userData.password,
            email_confirm: true,
            user_metadata: {
                full_name: userData.full_name,
            },
        });

        if (authError) {
            console.error('❌ Auth error:', authError);
            return {
                success: false,
                error: authError.message || 'Failed to create auth user',
            };
        }

        if (!authData.user) {
            return {
                success: false,
                error: 'No user returned from auth',
            };
        }

        console.log('✅ Auth user created:', authData.user.id);

        // 3. Manually create profile with all data
        console.log('👤 Creating profile manually...');
        const profileData = {
            id: authData.user.id,
            email: userData.email,
            full_name: userData.full_name,
            role: roleName,
            phone: userData.phone || null,
            regional_office_id: null, // Will be set later if needed
            org_id: userData.org_id,
            is_active: true,
        };
        
        console.log('Profile data:', profileData);

        const { error: profileError } = await supabase
            .from('profiles')
            .insert(profileData);

        if (profileError) {
            console.error('❌ Profile error:', profileError);
            console.error('Profile error details:', JSON.stringify(profileError, null, 2));
            
            // Clean up auth user if profile creation fails
            console.log('🗑️ Cleaning up auth user...');
            await supabase.auth.admin.deleteUser(authData.user.id);
            
            return {
                success: false,
                error: `Profile creation failed: ${profileError.message}`,
            };
        }

        console.log('✅ Profile created successfully');

        // Revalidate the settings page
        revalidatePath('/settings');

        return {
            success: true,
            data: {
                id: authData.user.id,
                email: userData.email,
                full_name: userData.full_name,
            },
        };
    } catch (err: any) {
        console.error('❌ Exception in createUserAction:', err);
        return {
            success: false,
            error: err.message || 'An unexpected error occurred',
        };
    }
}

// ============================================================================
// Reset User Password (Admin Only)
// ============================================================================

export async function resetUserPasswordAction(
    userId: string,
    newPassword: string
): Promise<ActionResult> {
    console.log('🔑 Resetting password for user:', userId);

    try {
        const supabase = getAdminClient();

        const { error } = await supabase.auth.admin.updateUserById(userId, {
            password: newPassword,
        });

        if (error) {
            console.error('❌ Password reset error:', error);
            return {
                success: false,
                error: error.message || 'Failed to reset password',
            };
        }

        console.log('✅ Password reset successfully');
        return { success: true };
    } catch (err: any) {
        console.error('❌ Exception in resetUserPasswordAction:', err);
        return {
            success: false,
            error: err.message || 'An unexpected error occurred',
        };
    }
}

// ============================================================================
// Delete User (Admin Only)
// ============================================================================

export async function deleteUserAction(userId: string): Promise<ActionResult> {
    console.log('🗑️ Deleting user:', userId);

    try {
        const supabase = getAdminClient();

        // Delete from auth (profile will be cascade deleted)
        const { error } = await supabase.auth.admin.deleteUser(userId);

        if (error) {
            console.error('❌ Delete error:', error);
            return {
                success: false,
                error: error.message || 'Failed to delete user',
            };
        }

        console.log('✅ User deleted successfully');

        // Revalidate the settings page
        revalidatePath('/settings');

        return { success: true };
    } catch (err: any) {
        console.error('❌ Exception in deleteUserAction:', err);
        return {
            success: false,
            error: err.message || 'An unexpected error occurred',
        };
    }
}

// ============================================================================
// Send Password Reset Email (Admin Only)
// ============================================================================

export async function sendPasswordResetAction(email: string): Promise<ActionResult> {
    console.log('📧 Sending password reset email to:', email);

    try {
        const supabase = getAdminClient();

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
        });

        if (error) {
            console.error('❌ Password reset email error:', error);
            return {
                success: false,
                error: error.message || 'Failed to send reset email',
            };
        }

        console.log('✅ Password reset email sent');
        return { success: true };
    } catch (err: any) {
        console.error('❌ Exception in sendPasswordResetAction:', err);
        return {
            success: false,
            error: err.message || 'An unexpected error occurred',
        };
    }
}
