'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
    UserProfile,
    UserRole,
    Module,
    Action,
    loadUserPermissions,
    cacheUserProfile,
    getCurrentUserSync,
    canSync,
} from '@/lib/permissions';

interface UserContextType {
    user: UserProfile | null;
    loading: boolean;
    can: (module: Module, action: Action) => boolean;
    hasRole: (role: UserRole) => boolean;
    hasAnyRole: (roles: UserRole[]) => boolean;
    refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const loadUser = async () => {
        try {
            setLoading(true);
            const supabase = createClient();

            // Get current auth user
            const { data: { user: authUser } } = await supabase.auth.getUser();

            if (!authUser) {
                setUser(null);
                cacheUserProfile(null);
                return;
            }

            // Get user profile
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (error) {
                console.error('Error loading user profile:', error);
                setUser(null);
                return;
            }

            setUser(profile);
            cacheUserProfile(profile);

            // Load permissions
            await loadUserPermissions();
        } catch (error) {
            console.error('Error in loadUser:', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUser();

        // Listen for auth changes
        const supabase = createClient();
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                    await loadUser();
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                    cacheUserProfile(null);
                    sessionStorage.clear();
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const can = (module: Module, action: Action): boolean => {
        return canSync(module, action);
    };

    const hasRole = (role: UserRole): boolean => {
        return user?.role === role;
    };

    const hasAnyRole = (roles: UserRole[]): boolean => {
        return user ? roles.includes(user.role) : false;
    };

    const value: UserContextType = {
        user,
        loading,
        can,
        hasRole,
        hasAnyRole,
        refreshUser: loadUser,
    };

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}

// Hook for permission checking
export function usePermission(module: Module, action: Action) {
    const { can } = useUser();
    return can(module, action);
}

// Hook for role checking
export function useRole(role: UserRole) {
    const { hasRole } = useUser();
    return hasRole(role);
}
