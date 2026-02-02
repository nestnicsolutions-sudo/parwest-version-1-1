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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {statCards.map((stat) => {
                    const Icon = stat.icon;
                    const changeIsPositive = stat.change > 0;
                    const TrendIcon = changeIsPositive ? TrendingUp : TrendingDown;
                    const trendColor = changeIsPositive ? 'text-success' : 'text-destructive';

                    return (
                        <Card key={stat.title} className="shadow-sm">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        {stat.title}
                                    </CardTitle>
                                    <Icon className={`h-4 w-4 ${stat.color}`} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                {statsLoading ? (
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                ) : (
                                    <>
                                        <div className="text-2xl font-bold">{stat.value}</div>
                                        <div className={`flex items-center text-xs mt-1 ${trendColor}`}>
                                            <TrendIcon className="h-3 w-3 mr-1" />
                                            <span>
                                                {formatChange(stat.change, stat.isPercentage, stat.isCurrency)} from last period
                                            </span>
                                        </div>
                                        {statsFetching && !statsLoading && (
                                            <p className="text-xs text-muted-foreground mt-1">Syncing...</p>
                                        )}
                                    </>
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
