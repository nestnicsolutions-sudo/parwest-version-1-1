/**
 * Permission & Role Management Utilities
 * Real-time Supabase integration with RLS
 */

import { createClient } from '@/lib/supabase/client';

export type UserRole =
    | 'system_admin'
    | 'regional_manager'
    | 'hr_officer'
    | 'ops_supervisor'
    | 'finance_officer'
    | 'inventory_officer'
    | 'auditor_readonly'
    | 'client_portal';

export type Module =
    | 'dashboard'
    | 'guards'
    | 'clients'
    | 'deployments'
    | 'attendance'
    | 'payroll'
    | 'billing'
    | 'inventory'
    | 'tickets'
    | 'reports'
    | 'settings';

export type Action = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export';

export interface UserProfile {
    id: string;
    email: string;
    full_name: string | null;
    role: UserRole;
    regional_office_id: string | null;
    org_id: string;
    phone: string | null;
    avatar_url: string | null;
    is_active: boolean;
}

/**
 * Get current user profile from Supabase
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) {
            // If profiles table doesn't exist yet, return mock profile
            const isTableNotFound = 
                error.code === '42P01' || 
                error.message?.includes('relation') || 
                error.message?.includes('does not exist') ||
                error.message?.includes('Could not find the table');
                
            if (isTableNotFound) {
                console.warn('⚠️ Profiles table not found. Run SQL scripts in Supabase to enable full RBAC.');
                return {
                    id: user.id,
                    email: user.email || '',
                    full_name: user.user_metadata?.name || user.email || 'User',
                    role: (user.user_metadata?.role as UserRole) || 'system_admin',
                    regional_office_id: null,
                    org_id: user.id,
                    phone: null,
                    avatar_url: null,
                    is_active: true,
                };
            }
            console.error('Error fetching profile:', error.message);
            return null;
        }

        return profile;
    } catch (err) {
        console.error('Failed to get user profile:', err);
        return null;
    }
}

/**
 * Get current user profile synchronously (for client components)
 * Note: This uses a cached value or returns null
 */
export function getCurrentUserSync(): UserProfile | null {
    // For client-side sync access, we'll use React context
    // This will be implemented with a UserProvider
    if (typeof window === 'undefined') return null;
    
    const cached = sessionStorage.getItem('user_profile');
    if (cached) {
        try {
            return JSON.parse(cached);
        } catch {
            return null;
        }
    }
    return null;
}

/**
 * Cache user profile in session storage
 */
export function cacheUserProfile(profile: UserProfile | null) {
    if (typeof window === 'undefined') return;
    
    if (profile) {
        sessionStorage.setItem('user_profile', JSON.stringify(profile));
    } else {
        sessionStorage.removeItem('user_profile');
    }
}

/**
 * Check if current user has a specific permission
 */
export async function can(module: Module, action: Action): Promise<boolean> {
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    try {
        // Use the database function to check permission
        const { data, error } = await supabase.rpc('has_permission', {
            p_module: module,
            p_action: action
        });

        if (error) {
            // If RPC function doesn't exist yet (before SQL setup), default to true for system_admin
            if (error.message?.includes('function') || error.code === '42883') {
                console.warn('Permission system not set up yet. Run SQL scripts in Supabase.');
                // Fallback: check if user is admin from profile
                const profile = await getCurrentUser();
                return profile?.role === 'system_admin';
            }
            console.error('Permission check error:', error.message || error);
            return false;
        }

        return data === true;
    } catch (err) {
        console.error('Permission check failed:', err);
        return false;
    }
}

/**
 * Synchronous permission check (uses cached permissions)
 */
export function canSync(module: Module, action: Action): boolean {
    const profile = getCurrentUserSync();
    if (!profile) return false;

    // System admin has ALL permissions
    if (profile.role === 'system_admin') {
        return true;
    }

    // Get permissions from local cache
    const cacheKey = `permissions_${profile.id}`;
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
        try {
            const permissions: Array<{ module: string; action: string }> = JSON.parse(cached);
            return permissions.some(p => p.module === module && p.action === action);
        } catch {
            return false;
        }
    }

    // Fallback: Use role-based permissions
    const rolePermissions: Record<UserRole, { modules: Module[], actions: Action[] }> = {
        'system_admin': { 
            modules: ['dashboard', 'guards', 'clients', 'deployments', 'attendance', 'payroll', 'billing', 'inventory', 'tickets', 'reports', 'settings'], 
            actions: ['view', 'create', 'edit', 'delete', 'approve', 'export'] 
        },
        'regional_manager': { 
            modules: ['dashboard', 'guards', 'clients', 'deployments', 'attendance', 'payroll', 'billing', 'inventory', 'tickets', 'reports'], 
            actions: ['view', 'create', 'edit', 'approve', 'export'] 
        },
        'hr_officer': { 
            modules: ['dashboard', 'guards', 'clients', 'deployments', 'attendance', 'reports'], 
            actions: ['view', 'create', 'edit', 'export'] 
        },
        'ops_supervisor': { 
            modules: ['dashboard', 'guards', 'clients', 'deployments', 'attendance', 'tickets', 'reports'], 
            actions: ['view', 'create', 'edit', 'export'] 
        },
        'finance_officer': { 
            modules: ['dashboard', 'guards', 'clients', 'payroll', 'billing', 'reports'], 
            actions: ['view', 'create', 'edit', 'approve', 'export'] 
        },
        'inventory_officer': { 
            modules: ['dashboard', 'guards', 'inventory', 'reports'], 
            actions: ['view', 'create', 'edit', 'delete', 'export'] 
        },
        'auditor_readonly': { 
            modules: ['dashboard', 'guards', 'clients', 'deployments', 'attendance', 'payroll', 'billing', 'inventory', 'tickets', 'reports'], 
            actions: ['view', 'export'] 
        },
        'client_portal': { 
            modules: ['dashboard', 'clients', 'billing', 'tickets'], 
            actions: ['view'] 
        },
    };
    
    const rolePerms = rolePermissions[profile.role];
    if (!rolePerms) return false;
    
    return rolePerms.modules.includes(module) && rolePerms.actions.includes(action);
}

/**
 * Load and cache user permissions
 */
export async function loadUserPermissions(): Promise<void> {
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (!profile) return;

    // Cache profile
    cacheUserProfile(profile);

    // Get all permissions for user's role
    const { data: permissions } = await supabase
        .from('role_permissions')
        .select(`
            permissions:permissions (
                module,
                action
            )
        `)
        .eq('role_id', profile.role);

    if (permissions) {
        const permList = permissions
            .map(p => p.permissions)
            .filter(Boolean);
        
        sessionStorage.setItem(
            `permissions_${user.id}`,
            JSON.stringify(permList)
        );
    }
}

/**
 * Alias for can() - more semantic in some contexts
 */
export async function hasPermission(module: Module, action: Action): Promise<boolean> {
    return can(module, action);
}

/**
 * Get role-based default dashboard route
 */
export function getRoleDashboardRoute(role?: UserRole): string {
    if (!role) {
        const profile = getCurrentUserSync();
        role = profile?.role;
    }

    switch (role) {
        case 'system_admin':
            return '/dashboard';
        case 'regional_manager':
            return '/dashboard';
        case 'hr_officer':
            return '/guards';
        case 'ops_supervisor':
            return '/deployments';
        case 'finance_officer':
            return '/billing';
        case 'inventory_officer':
            return '/inventory';
        case 'auditor_readonly':
            return '/reports';
        case 'client_portal':
            return '/dashboard';
        default:
            return '/dashboard';
    }
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(roles: UserRole[]): boolean {
    const profile = getCurrentUserSync();
    return profile ? roles.includes(profile.role) : false;
}

/**
 * Check if user has specific role
 */
export function hasRole(role: UserRole): boolean {
    const profile = getCurrentUserSync();
    return profile?.role === role;
}
