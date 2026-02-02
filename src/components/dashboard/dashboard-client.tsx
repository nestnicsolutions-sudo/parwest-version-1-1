/**
 * Dashboard Client Component
 * Uses React Query for instant loads and auto-refresh
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Users,
    Building2,
    Calendar,
    Wallet,
    FileText,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Plus,
    Loader2,
} from 'lucide-react';
import { useDashboardStats, useDashboardAlerts, useRecentActivity } from '@/lib/hooks/use-dashboard';
import { formatDistanceToNow } from 'date-fns';

export function DashboardClient() {
    const { data: stats, isLoading: statsLoading, isFetching: statsFetching } = useDashboardStats();
    const { data: alerts, isLoading: alertsLoading } = useDashboardAlerts();
    const { data: activities, isLoading: activitiesLoading } = useRecentActivity();

    // Format currency
    const formatCurrency = (amount: number) => {
        if (!amount) return 'PKR 0';
        if (amount >= 1000000) {
            return `PKR ${(amount / 1000000).toFixed(1)}M`;
        } else if (amount >= 1000) {
            return `PKR ${(amount / 1000).toFixed(0)}K`;
        }
        return `PKR ${amount.toLocaleString()}`;
    };

    // Format change
    const formatChange = (change: number, isPercentage = false, isCurrency = false) => {
        if (change === 0) return '0';
        const prefix = change > 0 ? '+' : '';
        if (isPercentage) return `${prefix}${change.toFixed(1)}%`;
        if (isCurrency) {
            if (Math.abs(change) >= 1000000) {
                return `${prefix}${(change / 1000000).toFixed(1)}M`;
            } else if (Math.abs(change) >= 1000) {
                return `${prefix}${(change / 1000).toFixed(0)}K`;
            }
        }
        return `${prefix}${change}`;
    };

    const statCards = [
        {
            title: 'Active Guards',
            icon: Users,
            value: stats?.activeGuards || 0,
            change: stats?.activeGuardsChange || 0,
            color: 'text-blue-600',
            isPercentage: true,
        },
        {
            title: 'Deployed Today',
            icon: Building2,
            value: stats?.deployedToday || 0,
            change: stats?.deployedTodayChange || 0,
            color: 'text-green-600',
            isPercentage: false,
        },
        {
            title: 'Attendance Rate',
            icon: Calendar,
            value: `${stats?.attendanceRate || 0}%`,
            change: stats?.attendanceRateChange || 0,
            color: 'text-purple-600',
            isPercentage: true,
        },
        {
            title: 'Payroll MTD',
            icon: Wallet,
            value: formatCurrency(stats?.payrollMTD || 0),
            change: stats?.payrollMTDChange || 0,
            color: 'text-orange-600',
            isCurrency: true,
        },
        {
            title: 'Outstanding Invoices',
            icon: FileText,
            value: formatCurrency(stats?.outstandingInvoices || 0),
            change: stats?.outstandingInvoicesChange || 0,
            color: 'text-red-600',
            isCurrency: true,
        },
        {
            title: 'Open Tickets',
            icon: AlertTriangle,
            value: stats?.openTickets || 0,
            change: stats?.openTicketsChange || 0,
            color: 'text-yellow-600',
            isPercentage: false,
        },
    ];

    return (
        <>
            {/* Quick Stats */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6 mb-6">
                {statCards.map((stat) => {
                    const Icon = stat.icon;
                    const changeIsPositive = stat.change > 0;
                    const TrendIcon = changeIsPositive ? TrendingUp : TrendingDown;
                    const trendColor = changeIsPositive ? 'text-success' : 'text-destructive';

                    return (
                        <Card key={stat.title} className="group relative overflow-hidden border border-slate-200 bg-white/90 backdrop-blur-md shadow-lg shadow-blue-900/10 transition-all duration-300 hover:shadow-xl hover:shadow-blue-900/20 hover:-translate-y-1 hover:border-blue-500/50 rounded-xl">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
                            <CardContent className="p-3 relative z-10">
                                {/* Top row: Icon left, Title right */}
                                <div className="flex items-start justify-between mb-4">
                                    {/* Icon in top left */}
                                    <div className="rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 p-2 shadow-md shadow-blue-200/50 w-fit ring-1 ring-blue-200/50 group-hover:ring-blue-400/50 group-hover:shadow-lg group-hover:shadow-blue-300/50 transition-all duration-300">
                                        <Icon className={`h-4.5 w-4.5 ${stat.color} transition-transform duration-300 group-hover:scale-110`} />
                                    </div>
                                    
                                    {/* Title in top right */}
                                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider leading-tight text-right">
                                        {stat.title}
                                    </div>
                                </div>
                                
                                {/* Value */}
                                <div className="mb-2">
                                    {statsLoading ? (
                                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                                    ) : (
                                        <div className="text-2xl font-bold bg-gradient-to-br from-slate-900 to-slate-700 bg-clip-text text-transparent leading-tight">{stat.value}</div>
                                    )}
                                </div>
                                
                                {/* Trend in bottom */}
                                {!statsLoading && (
                                    <div className={`flex items-center text-xs font-medium ${trendColor} leading-tight`}>
                                        <TrendIcon className="h-3 w-3 mr-0.5" />
                                        <span className="whitespace-nowrap">
                                            {formatChange(stat.change, stat.isPercentage, stat.isCurrency)}
                                        </span>
                                        {statsFetching && (
                                            <span className="text-[10px] text-slate-500 ml-2 flex items-center gap-1">
                                                <span className="inline-block h-1 w-1 rounded-full bg-blue-500 animate-pulse"></span>
                                                Syncing
                                            </span>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {/* Alerts */}
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center justify-between">
                            <span>Alerts & Notifications</span>
                            {alertsLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {alertsLoading ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : alerts && alerts.length > 0 ? (
                                alerts.map((alert) => (
                                    <div key={alert.id} className="flex items-start gap-3 p-3 border rounded-lg">
                                        <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-sm">{alert.title}</p>
                                                <Badge variant="destructive" className="text-xs">
                                                    {alert.severity}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {alert.description}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No active alerts
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center justify-between">
                            <span>Recent Activity</span>
                            {activitiesLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {activitiesLoading ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : activities && activities.length > 0 ? (
                                activities.map((activity) => (
                                    <div key={activity.id} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                                        <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">{activity.action}</p>
                                            <p className="text-xs text-muted-foreground">{activity.detail}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {activity.time}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No recent activity
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
