'use client';

import { useState, useEffect } from 'react';
import { can, hasPermission, getCurrentUser, hasRole, type Module, type Action, type UserRole } from '@/lib/permissions';

/**
 * React hook for permission checks in components
 * Usage: const canEdit = usePermission('guards', 'edit');
 */
export function usePermission(module: Module, action: Action): boolean {
    const [permitted, setPermitted] = useState(false);

    useEffect(() => {
        const checkPermission = async () => {
            const result = await can(module, action);
            setPermitted(result);
        };
        checkPermission();
    }, [module, action]);

    return permitted;
}

/**
 * Hook to get current user info
 */
export function useCurrentUser() {
    const [user, setUser] = useState(getCurrentUser());

    useEffect(() => {
        setUser(getCurrentUser());
    }, []);

    return user;
}

/**
 * Hook to check if user has specific role(s)
 */
export function useHasRole(...roles: UserRole[]): boolean {
    const [hasRoleCheck, setHasRoleCheck] = useState(false);

    useEffect(() => {
        const checkRole = async () => {
            const user = await getCurrentUser();
            if (user) {
                setHasRoleCheck(roles.includes(user.role as UserRole));
            } else {
                setHasRoleCheck(false);
            }
        };
        checkRole();
    }, [roles]);

    return hasRoleCheck;
}

/**
 * Hook for multiple permission checks
 * Usage: const { canView, canEdit } = usePermissions('guards', ['view', 'edit']);
 */
export function usePermissions(module: Module, actions: Action[]): Record<string, boolean> {
    const [permissions, setPermissions] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const checkPermissions = async () => {
            const perms: Record<string, boolean> = {};
            for (const action of actions) {
                const result = await can(module, action);
                perms[`can${action.charAt(0).toUpperCase()}${action.slice(1)}`] = result;
            }
            setPermissions(perms);
        };
        checkPermissions();
    }, [module, actions]);

    return permissions;
}
