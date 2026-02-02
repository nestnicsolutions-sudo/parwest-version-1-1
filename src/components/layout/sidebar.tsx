'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Users,
    Building2,
    MapPin,
    Calendar,
    Wallet,
    FileText,
    Package,
    TicketIcon,
    BarChart3,
    Settings,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { getCurrentUserSync, canSync, type Module, type Action } from '@/lib/permissions';

interface NavItem {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    requiredPermission?: { module: Module; action: Action };
    requiredRoles?: string[];
}

interface NavGroup {
    label: string;
    items: NavItem[];
}

const navigation: NavGroup[] = [
    {
        label: 'Overview',
        items: [
            { 
                label: 'Dashboard', 
                href: '/dashboard', 
                icon: LayoutDashboard,
                requiredPermission: { module: 'dashboard', action: 'view' }
            },
        ],
    },
    {
        label: 'Operations',
        items: [
            { 
                label: 'Guards', 
                href: '/guards', 
                icon: Users,
                requiredPermission: { module: 'guards', action: 'view' }
            },
            { 
                label: 'Clients', 
                href: '/clients', 
                icon: Building2,
                requiredPermission: { module: 'clients', action: 'view' }
            },
            { 
                label: 'Deployments', 
                href: '/deployments', 
                icon: MapPin,
                requiredPermission: { module: 'deployments', action: 'view' }
            },
            { 
                label: 'Attendance', 
                href: '/attendance', 
                icon: Calendar,
                requiredPermission: { module: 'attendance', action: 'view' }
            },
        ],
    },
    {
        label: 'Finance',
        items: [
            { 
                label: 'Payroll', 
                href: '/payroll', 
                icon: Wallet,
                requiredPermission: { module: 'payroll', action: 'view' }
            },
            { 
                label: 'Billing', 
                href: '/billing/invoices', 
                icon: FileText,
                requiredPermission: { module: 'billing', action: 'view' }
            },
        ],
    },
    {
        label: 'Resources',
        items: [
            { 
                label: 'Inventory', 
                href: '/inventory', 
                icon: Package,
                requiredPermission: { module: 'inventory', action: 'view' }
            },
            { 
                label: 'Tickets', 
                href: '/tickets', 
                icon: TicketIcon,
                requiredPermission: { module: 'tickets', action: 'view' }
            },
        ],
    },
    {
        label: 'Analytics',
        items: [
            { 
                label: 'Reports', 
                href: '/reports', 
                icon: BarChart3,
                requiredPermission: { module: 'reports', action: 'view' }
            },
        ],
    },
    {
        label: 'Admin',
        items: [
            { 
                label: 'Approvals', 
                href: '/approvals', 
                icon: CheckCircle2,
                requiredRoles: ['system_admin', 'regional_manager', 'finance_officer']
            },
            { 
                label: 'Broadcast', 
                href: '/notifications/broadcast', 
                icon: Bell,
                requiredRoles: ['system_admin', 'regional_manager']
            },
        ],
    },
];

interface SidebarProps {
    collapsed?: boolean;
    onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
    const pathname = usePathname();
    const currentUser = getCurrentUserSync();

    // Filter navigation items based on user permissions
    const filterNavigation = (navGroups: NavGroup[]): NavGroup[] => {
        // If no user data yet, show all navigation (permissions loading)
        if (!currentUser) return navGroups;

        // System admin has access to EVERYTHING
        if (currentUser.role === 'system_admin') {
            console.log('✅ [Sidebar] System admin - full access granted');
            return navGroups;
        }

        console.log('🔍 [Sidebar] Filtering navigation for role:', currentUser.role);

        return navGroups
            .map(group => ({
                ...group,
                items: group.items.filter(item => {
                    // Check role-based access
                    if (item.requiredRoles) {
                        const hasRoleAccess = item.requiredRoles.includes(currentUser.role);
                        console.log(`  ${item.label}: Role check (${item.requiredRoles.join(', ')}) = ${hasRoleAccess}`);
                        if (!hasRoleAccess) return false;
                    }

                    // Check permission-based access
                    if (item.requiredPermission) {
                        const hasPermission = canSync(item.requiredPermission.module, item.requiredPermission.action);
                        console.log(`  ${item.label}: Permission check (${item.requiredPermission.module}.${item.requiredPermission.action}) = ${hasPermission}`);
                        return hasPermission;
                    }

                    // If no requirements, show by default
                    return true;
                })
            }))
            .filter(group => group.items.length > 0); // Remove empty groups
    };

    const filteredNavigation = filterNavigation(navigation);

    return (
        <aside
            className={cn(
                'fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar transition-all duration-300',
                collapsed ? 'w-[68px]' : 'w-60'
            )}
        >
            <div className="flex h-full flex-col">
                {/* Logo */}
                <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
                    {!collapsed && (
                        <Link href="/dashboard" className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <span className="text-sm font-bold">P</span>
                            </div>
                            <span className="text-lg font-semibold text-sidebar-foreground">
                                Parwest
                            </span>
                        </Link>
                    )}
                    {collapsed && (
                        <Link href="/dashboard" className="mx-auto">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <span className="text-sm font-bold">P</span>
                            </div>
                        </Link>
                    )}
                </div>

                {/* Navigation */}
                <ScrollArea className="flex-1 overflow-y-auto">
                    <div className="px-3 py-4">
                        <nav className="space-y-6" suppressHydrationWarning>
                            {filteredNavigation.map((group) => (
                                <div key={group.label}>
                                    {!collapsed && (
                                        <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground" suppressHydrationWarning>
                                            {group.label}
                                        </p>
                                    )}
                                    <div className="space-y-1">
                                        {group.items.map((item) => {
                                            const isActive = pathname.startsWith(item.href);
                                            const Icon = item.icon;

                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    className={cn(
                                                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                                        isActive
                                                            ? 'bg-sidebar-accent text-sidebar-primary'
                                                            : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
                                                        collapsed && 'justify-center px-2'
                                                    )}
                                                >
                                                    <Icon
                                                        className={cn(
                                                            'h-5 w-5 shrink-0',
                                                            isActive
                                                                ? 'text-sidebar-primary'
                                                                : 'text-muted-foreground'
                                                        )}
                                                    />
                                                    {!collapsed && <span>{item.label}</span>}
                                                    {!collapsed && item.badge !== undefined && (
                                                        <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                    {!collapsed && group !== filteredNavigation[filteredNavigation.length - 1] && (
                                        <Separator className="mt-4" />
                                    )}
                                </div>
                            ))}
                        </nav>
                    </div>
                </ScrollArea>

                {/* Settings & Collapse */}
                <div className="flex-shrink-0 border-t border-sidebar-border p-3">
                    <Link
                        href="/settings"
                        className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/50',
                            pathname.startsWith('/settings') && 'bg-sidebar-accent text-sidebar-primary',
                            collapsed && 'justify-center px-2'
                        )}
                    >
                        <Settings className="h-5 w-5 shrink-0 text-muted-foreground" />
                        {!collapsed && <span>Settings</span>}
                    </Link>

                    {onToggle && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onToggle}
                            className={cn(
                                'mt-2 w-full justify-center',
                                collapsed ? 'px-2' : ''
                            )}
                        >
                            {collapsed ? (
                                <ChevronRight className="h-4 w-4" />
                            ) : (
                                <>
                                    <ChevronLeft className="h-4 w-4 mr-2" />
                                    <span>Collapse</span>
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </aside>
    );
}
