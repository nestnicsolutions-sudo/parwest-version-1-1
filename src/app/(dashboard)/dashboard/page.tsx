import { Metadata } from 'next';
import { PageHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';
import { getDashboardStats, getDashboardAlerts, getRecentActivity } from '@/lib/api/dashboard';

export const metadata: Metadata = {
    title: 'Dashboard',
    description: 'Overview of your security operations',
};

export default async function DashboardPage() {
    // Fetch real dashboard data
    const stats = await getDashboardStats();
    const alerts = await getDashboardAlerts();
    const activities = await getRecentActivity();

    // Format currency
    const formatCurrency = (amount: number) => {
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

    // Build KPI data with real values
    const kpiData = [
        {
            title: 'Active Guards',
            value: stats.activeGuards.toLocaleString(),
            change: formatChange(stats.activeGuardsChange),
            trend: stats.activeGuardsChange >= 0 ? 'up' as const : 'down' as const,
            icon: Users,
            color: 'text-primary',
        },
        {
            title: 'Deployed Today',
            value: stats.deployedToday.toLocaleString(),
            change: formatChange(stats.deployedTodayChange),
            trend: stats.deployedTodayChange >= 0 ? 'up' as const : 'down' as const,
            icon: Building2,
            color: 'text-success',
        },
        {
            title: 'Attendance Rate',
            value: `${stats.attendanceRate.toFixed(1)}%`,
            change: formatChange(stats.attendanceRateChange, true),
            trend: stats.attendanceRateChange >= 0 ? 'up' as const : 'down' as const,
            icon: Calendar,
            color: 'text-info',
        },
        {
            title: 'Outstanding Invoices',
            value: formatCurrency(stats.outstandingInvoices),
            change: formatChange(stats.outstandingInvoicesChange, false, true),
            trend: stats.outstandingInvoicesChange <= 0 ? 'up' as const : 'down' as const,
            icon: FileText,
            color: 'text-warning',
        },
        {
            title: 'Payroll (MTD)',
            value: formatCurrency(stats.payrollMTD),
            change: formatChange(stats.payrollMTDChange, false, true),
            trend: stats.payrollMTDChange >= 0 ? 'up' as const : 'down' as const,
            icon: Wallet,
            color: 'text-primary',
        },
        {
            title: 'Open Tickets',
            value: stats.openTickets.toString(),
            change: formatChange(stats.openTicketsChange),
            trend: stats.openTicketsChange >= 0 ? 'up' as const : 'down' as const,
            icon: AlertTriangle,
            color: 'text-destructive',
        },
    ];
    return (
        <div className="space-y-6">
            <PageHeader
                title="Command Center"
                description="Welcome back! Here's what's happening with your operations today."
                actions={
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Quick Action
                    </Button>
                }
            />

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {kpiData.map((kpi, index) => {
                    const Icon = kpi.icon;
                    return (
                        <Card key={index} className="shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {kpi.title}
                                </CardTitle>
                                <Icon className={`h-4 w-4 ${kpi.color}`} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{kpi.value}</div>
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                    {kpi.trend === 'up' ? (
                                        <TrendingUp className="h-3 w-3 text-success" />
                                    ) : (
                                        <TrendingDown className="h-3 w-3 text-destructive" />
                                    )}
                                    <span
                                        className={
                                            kpi.trend === 'up' ? 'text-success' : 'text-destructive'
                                        }
                                    >
                                        {kpi.change}
                                    </span>
                                    <span>from yesterday</span>
                                </p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Alerts */}
                <Card className="lg:col-span-1 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-warning" />
                            Critical Alerts
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {alerts.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No critical alerts at this time</p>
                        ) : (
                            alerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    className={`rounded-lg p-3 border-l-4 ${alert.severity === 'critical'
                                            ? 'border-destructive bg-destructive/5'
                                            : alert.severity === 'high'
                                                ? 'border-warning bg-warning/5'
                                                : 'border-info bg-info/5'
                                        }`}
                                >
                                    <p className="text-sm font-medium">{alert.title}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {alert.description}
                                    </p>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="lg:col-span-1 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3">
                        <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                            <Users className="h-5 w-5" />
                            <span className="text-xs">Add Guard</span>
                        </Button>
                        <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                            <Building2 className="h-5 w-5" />
                            <span className="text-xs">Add Client</span>
                        </Button>
                        <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                            <Calendar className="h-5 w-5" />
                            <span className="text-xs">Mark Attendance</span>
                        </Button>
                        <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                            <FileText className="h-5 w-5" />
                            <span className="text-xs">Generate Invoice</span>
                        </Button>
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="lg:col-span-1 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {activities.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No recent activity</p>
                            ) : (
                                activities.map((item) => (
                                    <div key={item.id} className="flex items-start gap-3">
                                        <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">{item.action}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {item.detail}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {item.time}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
