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
    const [mounted, setMounted] = React.useState(false);

    // Only filter navigation after component mounts to avoid hydration mismatch
    React.useEffect(() => {
        setMounted(true);
    }, []);

    // Filter navigation items based on user permissions
    const filterNavigation = (navGroups: NavGroup[]): NavGroup[] => {
        // If no user data yet or not mounted, show all navigation (permissions loading)
        if (!currentUser || !mounted) return navGroups;

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
                'fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border/50 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 shadow-2xl transition-all duration-300',
                collapsed ? 'w-[68px]' : 'w-64'
            )}
        >
            <div className="flex h-full flex-col">
                {/* Logo */}
                <div className="flex h-16 items-center justify-between border-b border-white/10 px-4 backdrop-blur-sm">
                    {!collapsed && (
                        <Link href="/dashboard" className="flex items-center gap-3 group transition-transform hover:scale-105">
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
                                <img src="/logo.png" alt="Parwest Logo" className="h-10 w-10 object-contain relative z-10" />
                            </div>
                            <span className="text-lg font-bold text-white tracking-tight">
                                Parwest
                            </span>
                        </Link>
                    )}
                    {collapsed && (
                        <Link href="/dashboard" className="mx-auto group transition-transform hover:scale-110">
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-500/20 blur-lg rounded-full"></div>
                                <img src="/logo.png" alt="Parwest" className="h-10 w-10 object-contain relative z-10" />
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
                                        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500" suppressHydrationWarning>
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
                                                        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                                                        isActive
                                                            ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-white shadow-lg shadow-blue-500/20 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-8 before:w-1 before:rounded-r-full before:bg-blue-500'
                                                            : 'text-slate-400 hover:bg-white/5 hover:text-white hover:shadow-md',
                                                        collapsed && 'justify-center px-2'
                                                    )}
                                                >
                                                    <Icon
                                                        className={cn(
                                                            'h-5 w-5 shrink-0 transition-transform group-hover:scale-110',
                                                            isActive
                                                                ? 'text-blue-400'
                                                                : 'text-slate-500 group-hover:text-blue-400'
                                                        )}
                                                    />
                                                    {!collapsed && <span className="font-medium">{item.label}</span>}
                                                    {!collapsed && item.badge !== undefined && (
                                                        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white shadow-lg">
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </nav>
                    </div>
                </ScrollArea>

                {/* Settings & Collapse */}
                <div className="flex-shrink-0 border-t border-white/10 bg-slate-950/50 p-3 backdrop-blur-sm">
                    <Link
                        href="/settings"
                        className={cn(
                            'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                            pathname.startsWith('/settings')
                                ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-white shadow-lg shadow-blue-500/20'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white hover:shadow-md',
                            collapsed && 'justify-center px-2'
                        )}
                    >
                        <Settings 
                            className={cn(
                                'h-5 w-5 shrink-0 transition-transform group-hover:scale-110 group-hover:rotate-90',
                                pathname.startsWith('/settings') ? 'text-blue-400' : 'text-slate-500 group-hover:text-blue-400'
                            )} 
                        />
                        {!collapsed && <span className="font-medium">Settings</span>}
                    </Link>

                    {onToggle && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onToggle}
                            className={cn(
                                'mt-2 w-full justify-center text-slate-400 hover:bg-white/5 hover:text-white transition-all',
                                collapsed ? 'px-2' : ''
                            )}
                        >
                            {collapsed ? (
                                <ChevronRight className="h-4 w-4" />
                            ) : (
                                <>
                                    <ChevronLeft className="h-4 w-4 mr-2" />
                                    <span className="text-xs font-medium">Collapse</span>
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </aside>
    );
}
