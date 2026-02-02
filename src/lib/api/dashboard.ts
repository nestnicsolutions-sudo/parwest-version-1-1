'use server';

import { createClient } from '@/lib/supabase/server';

export interface DashboardStats {
    activeGuards: number;
    activeGuardsChange: number;
    deployedToday: number;
    deployedTodayChange: number;
    attendanceRate: number;
    attendanceRateChange: number;
    outstandingInvoices: number;
    outstandingInvoicesChange: number;
    payrollMTD: number;
    payrollMTDChange: number;
    openTickets: number;
    openTicketsChange: number;
}

export interface Alert {
    id: string;
    type: string;
    title: string;
    description: string;
    severity: 'critical' | 'high' | 'medium';
}

export interface RecentActivity {
    id: string;
    action: string;
    detail: string;
    time: string;
    timestamp: Date;
}

export async function getDashboardStats(): Promise<DashboardStats> {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

    if (!profile?.org_id) throw new Error('Organization not found');

    // Get current date and yesterday's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Active Guards (approved and active status)
    const { count: activeGuards } = await supabase
        .from('guards')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', profile.org_id)
        .eq('is_deleted', false)
        .eq('is_active', true)
        .eq('status', 'approved');

    // Active Guards Yesterday
    const { count: activeGuardsYesterday } = await supabase
        .from('guards')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', profile.org_id)
        .eq('is_deleted', false)
        .eq('is_active', true)
        .eq('status', 'approved')
        .lte('created_at', yesterdayStr);

    // Deployed Today (active or planned deployments)
    const { count: deployedToday } = await supabase
        .from('guard_deployments')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', profile.org_id)
        .in('status', ['active', 'planned']);

    // Deployed Yesterday
    const { count: deployedYesterday } = await supabase
        .from('guard_deployments')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', profile.org_id)
        .in('status', ['active', 'planned'])
        .lte('deployment_date', yesterdayStr);

    // Attendance Rate (today)
    const { data: attendanceToday } = await supabase
        .from('attendance')
        .select('status')
        .eq('org_id', profile.org_id)
        .gte('attendance_date', todayStr)
        .lte('attendance_date', todayStr);

    const totalAttendanceToday = attendanceToday?.length || 0;
    const presentToday = attendanceToday?.filter(a => a.status === 'present').length || 0;
    const attendanceRate = totalAttendanceToday > 0 ? (presentToday / totalAttendanceToday) * 100 : 0;

    // Attendance Rate Yesterday
    const { data: attendanceYesterday } = await supabase
        .from('attendance')
        .select('status')
        .eq('org_id', profile.org_id)
        .gte('attendance_date', yesterdayStr)
        .lte('attendance_date', yesterdayStr);

    const totalAttendanceYesterday = attendanceYesterday?.length || 0;
    const presentYesterday = attendanceYesterday?.filter(a => a.status === 'present').length || 0;
    const attendanceRateYesterday = totalAttendanceYesterday > 0 ? (presentYesterday / totalAttendanceYesterday) * 100 : 0;

    // Outstanding Invoices
    const { data: outstandingInvoices } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('org_id', profile.org_id)
        .in('status', ['pending', 'sent', 'overdue']);

    const outstandingAmount = outstandingInvoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;

    // Outstanding Invoices Yesterday
    const { data: outstandingInvoicesYesterday } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('org_id', profile.org_id)
        .in('status', ['pending', 'sent', 'overdue'])
        .lte('created_at', yesterdayStr);

    const outstandingAmountYesterday = outstandingInvoicesYesterday?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;

    // Payroll MTD (Month to Date)
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const { data: payrollMTD } = await supabase
        .from('payroll')
        .select('total_amount')
        .eq('org_id', profile.org_id)
        .gte('period_start', firstDayOfMonth)
        .in('status', ['approved', 'paid']);

    const payrollAmount = payrollMTD?.reduce((sum, p) => sum + (p.total_amount || 0), 0) || 0;

    // Payroll Previous Month
    const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
    const { data: payrollLastMonth } = await supabase
        .from('payroll')
        .select('total_amount')
        .eq('org_id', profile.org_id)
        .gte('period_start', firstDayOfLastMonth)
        .lte('period_start', lastDayOfLastMonth)
        .in('status', ['approved', 'paid']);

    const payrollAmountLastMonth = payrollLastMonth?.reduce((sum, p) => sum + (p.total_amount || 0), 0) || 0;

    // Open Tickets
    const { count: openTickets } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', profile.org_id)
        .in('status', ['open', 'in_progress']);

    // Open Tickets Yesterday
    const { count: openTicketsYesterday } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', profile.org_id)
        .in('status', ['open', 'in_progress'])
        .lte('created_at', yesterdayStr);

    return {
        activeGuards: activeGuards || 0,
        activeGuardsChange: (activeGuards || 0) - (activeGuardsYesterday || 0),
        deployedToday: deployedToday || 0,
        deployedTodayChange: (deployedToday || 0) - (deployedYesterday || 0),
        attendanceRate: Math.round(attendanceRate * 10) / 10,
        attendanceRateChange: Math.round((attendanceRate - attendanceRateYesterday) * 10) / 10,
        outstandingInvoices: outstandingAmount,
        outstandingInvoicesChange: outstandingAmount - outstandingAmountYesterday,
        payrollMTD: payrollAmount,
        payrollMTDChange: payrollAmount - payrollAmountLastMonth,
        openTickets: openTickets || 0,
        openTicketsChange: (openTickets || 0) - (openTicketsYesterday || 0),
    };
}

export async function getDashboardAlerts(): Promise<Alert[]> {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

    if (!profile?.org_id) return [];

    const alerts: Alert[] = [];
    const today = new Date();
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    // CNIC Expiring Soon
    const { count: expiringCNICs } = await supabase
        .from('guards')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', profile.org_id)
        .eq('is_active', true)
        .lte('cnic_expiry', thirtyDaysLater.toISOString().split('T')[0])
        .gte('cnic_expiry', today.toISOString().split('T')[0]);

    if (expiringCNICs && expiringCNICs > 0) {
        alerts.push({
            id: 'cnic-expiry',
            type: 'expiry',
            title: 'CNIC Expiring Soon',
            description: `${expiringCNICs} guards have CNIC expiring in next 30 days`,
            severity: 'high',
        });
    }

    // Missing Attendance Today
    const todayStr = today.toISOString().split('T')[0];
    const { data: activeBranches } = await supabase
        .from('client_branches')
        .select('id')
        .eq('org_id', profile.org_id)
        .eq('is_active', true);

    const { data: attendanceToday } = await supabase
        .from('attendance')
        .select('branch_id')
        .eq('org_id', profile.org_id)
        .gte('attendance_date', todayStr)
        .lte('attendance_date', todayStr);

    const branchesWithAttendance = new Set(attendanceToday?.map(a => a.branch_id) || []);
    const missingBranches = (activeBranches?.length || 0) - branchesWithAttendance.size;

    if (missingBranches > 0) {
        alerts.push({
            id: 'missing-attendance',
            type: 'missing',
            title: 'Missing Attendance',
            description: `${missingBranches} branches have not submitted attendance today`,
            severity: 'medium',
        });
    }

    // Overdue Invoices (60+ days)
    const sixtyDaysAgo = new Date(today);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { count: overdueInvoices } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', profile.org_id)
        .eq('status', 'overdue')
        .lte('due_date', sixtyDaysAgo.toISOString().split('T')[0]);

    if (overdueInvoices && overdueInvoices > 0) {
        alerts.push({
            id: 'overdue-invoices',
            type: 'overdue',
            title: 'Overdue Payments',
            description: `${overdueInvoices} clients have invoices overdue by 60+ days`,
            severity: 'critical',
        });
    }

    return alerts;
}

export async function getRecentActivity(): Promise<RecentActivity[]> {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

    if (!profile?.org_id) return [];

    const activities: RecentActivity[] = [];

    // Recent Deployments
    const { data: recentDeployments } = await supabase
        .from('guard_deployments')
        .select(`
            id,
            created_at,
            guards!inner(first_name, last_name),
            clients!inner(client_name),
            client_branches!inner(branch_name)
        `)
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false })
        .limit(2);

    recentDeployments?.forEach(d => {
        const guard = d.guards as any;
        const client = d.clients as any;
        const branch = d.client_branches as any;
        activities.push({
            id: `deploy-${d.id}`,
            action: 'Guard deployed',
            detail: `${guard.first_name} ${guard.last_name} deployed to ${client.client_name}, ${branch.branch_name}`,
            timestamp: new Date(d.created_at),
            time: formatTimeAgo(new Date(d.created_at)),
        });
    });

    // Recent Invoices
    const { data: recentInvoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, created_at, clients!inner(client_name)')
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false })
        .limit(1);

    recentInvoices?.forEach(inv => {
        const client = inv.clients as any;
        activities.push({
            id: `invoice-${inv.id}`,
            action: 'Invoice generated',
            detail: `Invoice ${inv.invoice_number} for ${client.client_name} - PKR ${(inv.total_amount || 0).toLocaleString()}`,
            timestamp: new Date(inv.created_at),
            time: formatTimeAgo(new Date(inv.created_at)),
        });
    });

    // Recent Attendance
    const { data: recentAttendance } = await supabase
        .from('attendance')
        .select('id, created_at, client_branches!inner(branch_name)')
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false })
        .limit(1);

    recentAttendance?.forEach(att => {
        const branch = att.client_branches as any;
        activities.push({
            id: `attendance-${att.id}`,
            action: 'Attendance submitted',
            detail: `Branch ${branch.branch_name} attendance marked by Supervisor`,
            timestamp: new Date(att.created_at),
            time: formatTimeAgo(new Date(att.created_at)),
        });
    });

    // Recent Guards
    const { data: recentGuards } = await supabase
        .from('guards')
        .select('id, first_name, last_name, status, created_at')
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false })
        .limit(1);

    recentGuards?.forEach(guard => {
        activities.push({
            id: `guard-${guard.id}`,
            action: 'New guard enrolled',
            detail: `${guard.first_name} ${guard.last_name} - CNIC verified, ${guard.status === 'approved' ? 'pending deployment' : 'pending approval'}`,
            timestamp: new Date(guard.created_at),
            time: formatTimeAgo(new Date(guard.created_at)),
        });
    });

    // Sort by timestamp
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return activities.slice(0, 4);
}

function formatTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) > 1 ? 's' : ''} ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
}
