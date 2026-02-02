'use server';

import { createClient } from '@/lib/supabase/server';
import { cachedFetch } from './cache';
import type {
  AttendanceRecord,
  AttendanceDetail,
  AttendanceListResponse,
  CreateAttendanceDTO,
  UpdateAttendanceDTO,
  VerifyAttendanceDTO,
  AttendanceFilters,
  AttendanceStats,
  BranchAttendanceStats,
  GuardAttendanceSummary,
} from '@/types/attendance';

// =====================================================
// ATTENDANCE CRUD OPERATIONS - Optimized
// =====================================================

export async function getAttendanceRecords(
  filters: AttendanceFilters,
  page = 1,
  pageSize = 50
): Promise<AttendanceListResponse> {
  const cacheKey = `attendance:records:${JSON.stringify({ filters, page, pageSize })}`;
  
  return cachedFetch(cacheKey, async () => {
    const supabase = await createClient();

    let query = supabase
      .from('attendance_records')
      .select(
        `
        id,
        guard_id,
        branch_id,
        attendance_date,
        check_in,
        check_out,
        status,
        attendance_type,
        guard:guards!inner(id, guard_code, first_name, last_name, phone),
        branch:client_branches!inner(
          id, 
          branch_code, 
          branch_name,
          client:clients!inner(client_name)
        )
      `,
        { count: 'exact' }
      )
      .gte('attendance_date', filters.from_date)
      .lte('attendance_date', filters.to_date)
      .order('attendance_date', { ascending: false });

    // Apply filters
    if (filters.guard_id) {
      query = query.eq('guard_id', filters.guard_id);
    }
    if (filters.branch_id) {
      query = query.eq('branch_id', filters.branch_id);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.verified !== undefined) {
      query = query.eq('verified', filters.verified);
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    // Transform data to match AttendanceDetail type
    const records = (data || []).map((record: any) => ({
      ...record,
      branch: {
        ...record.branch,
        client_name: record.branch.client.client_name,
      },
    }));

    return {
      records: records as AttendanceDetail[],
      total: count || 0,
      page,
      pageSize,
    };
  }, 30000); // 30 second cache
}

// =====================================================
// ROSTER & BULK OPERATIONS
// =====================================================

export interface RosterGuard {
  guard_id: string;
  guard_code: string;
  full_name: string;
  deployment_id: string;
  branch_id: string;
  branch_name: string;
  shift_type?: string;
  status: 'scheduled' | 'present' | 'absent' | 'late' | 'marked';
}

export async function getDailyRoster(date: string, branch_id?: string): Promise<RosterGuard[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single();

  if (!profile?.org_id) throw new Error('Organization not found');

  // Get active deployments for the date
  let deploymentQuery = supabase
    .from('guard_deployments')
    .select(`
      id,
      guard_id,
      branch_id,
      shift_type,
      guards!inner(id, guard_code, first_name, last_name),
      client_branches!inner(id, branch_name, client_id)
    `)
    .eq('org_id', profile.org_id)
    .eq('status', 'active')
    .lte('deployment_date', date);

  if (branch_id) {
    deploymentQuery = deploymentQuery.eq('branch_id', branch_id);
  }

  const { data: deployments, error: deploymentError } = await deploymentQuery;

  if (deploymentError) throw deploymentError;

  // Get existing attendance for the date
  const { data: attendance } = await supabase
    .from('attendance_records')
    .select('guard_id, status')
    .eq('org_id', profile.org_id)
    .eq('attendance_date', date);

  const attendanceMap = new Map(
    attendance?.map(a => [a.guard_id, a.status]) || []
  );

  // Map deployments to roster
  const roster: RosterGuard[] = (deployments || []).map((dep: any) => {
    const guard = dep.guards;
    const branch = dep.client_branches;
    const attendanceStatus = attendanceMap.get(dep.guard_id);

    return {
      guard_id: dep.guard_id,
      guard_code: guard.guard_code,
      full_name: `${guard.first_name} ${guard.last_name}`,
      deployment_id: dep.id,
      branch_id: branch.id,
      branch_name: branch.branch_name,
      shift_type: dep.shift_type,
      status: attendanceStatus ? 'marked' : 'scheduled',
    };
  });

  return roster;
}

export interface BulkAttendanceDTO {
  date: string;
  branch_id: string;
  attendance: Array<{
    guard_id: string;
    deployment_id: string;
    status: 'present' | 'absent' | 'late' | 'half_day';
    check_in_time?: string;
    remarks?: string;
  }>;
}

export async function markBulkAttendance(data: BulkAttendanceDTO) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single();

  if (!profile?.org_id) throw new Error('Organization not found');

  // Prepare attendance records
  const records = data.attendance.map(att => ({
    org_id: profile.org_id,
    guard_id: att.guard_id,
    deployment_id: att.deployment_id,
    branch_id: data.branch_id,
    attendance_date: data.date,
    status: att.status,
    check_in_time: att.check_in_time || null,
    overtime_hours: 0,
    verified: false,
    remarks: att.remarks || null,
    created_by: user.id,
  }));

  // Use upsert to handle duplicates
  const { data: inserted, error } = await supabase
    .from('attendance_records')
    .upsert(records, {
      onConflict: 'guard_id,attendance_date',
      ignoreDuplicates: false,
    })
    .select();

  if (error) throw error;

  return {
    success: true,
    count: inserted?.length || 0,
    message: `Attendance marked for ${inserted?.length || 0} guards`,
  };
}

export async function getTodayAttendanceStats() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single();

  if (!profile?.org_id) throw new Error('Organization not found');

  const today = new Date().toISOString().split('T')[0];

  // Get total scheduled (active deployments)
  const { count: totalScheduled } = await supabase
    .from('guard_deployments')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', profile.org_id)
    .eq('status', 'active')
    .lte('deployment_date', today);

  // Get attendance records for today
  const { data: attendanceRecords } = await supabase
    .from('attendance_records')
    .select('status, check_in_time')
    .eq('org_id', profile.org_id)
    .eq('attendance_date', today);

  const total = attendanceRecords?.length || 0;
  const present = attendanceRecords?.filter(a => a.status === 'present' || a.status === 'late').length || 0;
  const absent = attendanceRecords?.filter(a => a.status === 'absent').length || 0;
  const late = attendanceRecords?.filter(a => a.status === 'late').length || 0;
  const missingData = (totalScheduled || 0) - total;

  return {
    total_rostered: totalScheduled || 0,
    present,
    absent,
    late,
    missing_data: missingData,
    attendance_rate: totalScheduled ? ((present / totalScheduled) * 100).toFixed(1) : '0.0',
  };
}

export interface DailyException {
  id: string;
  guard_name: string;
  guard_code: string;
  branch_name: string;
  client_name: string;
  status: 'absent' | 'late';
  time?: string;
  remarks?: string;
}

export async function getTodayExceptions(): Promise<DailyException[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single();

  if (!profile?.org_id) throw new Error('Organization not found');

  const today = new Date().toISOString().split('T')[0];

  const { data: exceptions } = await supabase
    .from('attendance_records')
    .select(`
      id,
      status,
      check_in_time,
      remarks,
      guards!inner(guard_code, first_name, last_name),
      client_branches!inner(branch_name, clients!inner(client_name))
    `)
    .eq('org_id', profile.org_id)
    .eq('attendance_date', today)
    .in('status', ['absent', 'late'])
    .order('created_at', { ascending: false });

  return (exceptions || []).map((ex: any) => ({
    id: ex.id,
    guard_name: `${ex.guards.first_name} ${ex.guards.last_name}`,
    guard_code: ex.guards.guard_code,
    branch_name: ex.client_branches.branch_name,
    client_name: ex.client_branches.clients.client_name,
    status: ex.status,
    time: ex.check_in_time ? new Date(ex.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : undefined,
    remarks: ex.remarks,
  }));
}

export interface BranchAttendanceSummary {
  branch_id: string;
  branch_code: string;
  branch_name: string;
  client_name: string;
  scheduled: number;
  present: number;
  late: number;
  absent: number;
  status: 'completed' | 'attention' | 'critical' | 'pending';
}

export async function getTodayBranchSummary(): Promise<BranchAttendanceSummary[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single();

  if (!profile?.org_id) throw new Error('Organization not found');

  const today = new Date().toISOString().split('T')[0];

  // Get all active branches
  const { data: branches } = await supabase
    .from('client_branches')
    .select(`
      id,
      branch_code,
      branch_name,
      clients!inner(client_name)
    `)
    .eq('org_id', profile.org_id)
    .eq('is_active', true);

  if (!branches) return [];

  // Get deployments per branch
  const { data: deployments } = await supabase
    .from('guard_deployments')
    .select('branch_id, guard_id')
    .eq('org_id', profile.org_id)
    .eq('status', 'active')
    .lte('deployment_date', today);

  // Get attendance per branch
  const { data: attendance } = await supabase
    .from('attendance_records')
    .select('branch_id, status')
    .eq('org_id', profile.org_id)
    .eq('attendance_date', today);

  // Group data by branch
  const deploymentsByBranch = new Map<string, number>();
  deployments?.forEach(d => {
    deploymentsByBranch.set(d.branch_id, (deploymentsByBranch.get(d.branch_id) || 0) + 1);
  });

  const attendanceByBranch = new Map<string, { present: number; late: number; absent: number }>();
  attendance?.forEach(a => {
    const current = attendanceByBranch.get(a.branch_id) || { present: 0, late: 0, absent: 0 };
    if (a.status === 'present') current.present++;
    if (a.status === 'late') current.late++;
    if (a.status === 'absent') current.absent++;
    attendanceByBranch.set(a.branch_id, current);
  });

  return branches.map((branch: any) => {
    const scheduled = deploymentsByBranch.get(branch.id) || 0;
    const att = attendanceByBranch.get(branch.id) || { present: 0, late: 0, absent: 0 };
    const total = att.present + att.late + att.absent;

    let status: 'completed' | 'attention' | 'critical' | 'pending' = 'pending';
    if (total === scheduled && att.absent === 0) {
      status = 'completed';
    } else if (att.absent > 0 || att.late >= 2) {
      status = att.absent >= 2 ? 'critical' : 'attention';
    } else if (total > 0) {
      status = 'attention';
    }

    return {
      branch_id: branch.id,
      branch_code: branch.branch_code,
      branch_name: branch.branch_name,
      client_name: branch.clients.client_name,
      scheduled,
      present: att.present,
      late: att.late,
      absent: att.absent,
      status,
    };
  });
}

export async function getAttendanceById(id: string): Promise<AttendanceDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('attendance_records')
    .select(
      `
      *,
      guard:guards!inner(id, guard_code, full_name, phone),
      branch:client_branches!inner(
        id, 
        branch_code, 
        branch_name,
        client:clients!inner(client_name)
      )
    `
    )
    .eq('id', id)
    .single();

  if (error) throw error;

  return {
    ...data,
    branch: {
      ...data.branch,
      client_name: data.branch.client.client_name,
    },
  } as AttendanceDetail;
}

export async function createAttendance(
  data: CreateAttendanceDTO
): Promise<AttendanceRecord> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single();

  if (!profile?.org_id) throw new Error('Organization not found');

  const { data: newRecord, error } = await supabase
    .from('attendance_records')
    .insert({
      ...data,
      org_id: profile.org_id,
      status: data.status || 'present',
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return newRecord as AttendanceRecord;
}

export async function updateAttendance(
  id: string,
  data: UpdateAttendanceDTO
): Promise<AttendanceRecord> {
  const supabase = await createClient();

  // Calculate work hours if both check-in and check-out are provided
  if (data.check_out_time) {
    const { data: record } = await supabase
      .from('attendance_records')
      .select('check_in_time')
      .eq('id', id)
      .single();

    if (record?.check_in_time) {
      const checkIn = new Date(record.check_in_time);
      const checkOut = new Date(data.check_out_time);
      const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
      data.work_hours = Math.round(hours * 100) / 100;

      // Calculate overtime (over 8 hours)
      if (hours > 8) {
        data.overtime_hours = Math.round((hours - 8) * 100) / 100;
      }
    }
  }

  const { data: updated, error } = await supabase
    .from('attendance_records')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return updated as AttendanceRecord;
}

export async function verifyAttendance(
  id: string,
  data: VerifyAttendanceDTO
): Promise<AttendanceRecord> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: updated, error } = await supabase
    .from('attendance_records')
    .update({
      verified: data.verified,
      verified_by: user.id,
      verified_at: new Date().toISOString(),
      remarks: data.remarks,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return updated as AttendanceRecord;
}

// =====================================================
// STATISTICS & REPORTS
// =====================================================

export async function getAttendanceStats(
  from_date: string,
  to_date: string,
  guard_id?: string,
  branch_id?: string
): Promise<AttendanceStats> {
  const supabase = await createClient();

  let query = supabase
    .from('attendance_records')
    .select('*')
    .gte('attendance_date', from_date)
    .lte('attendance_date', to_date);

  if (guard_id) query = query.eq('guard_id', guard_id);
  if (branch_id) query = query.eq('branch_id', branch_id);

  const { data: records } = await query;

  if (!records) {
    return {
      total_records: 0,
      present: 0,
      absent: 0,
      late: 0,
      half_day: 0,
      leave: 0,
      holiday: 0,
      attendance_rate: 0,
      total_work_hours: 0,
      total_overtime_hours: 0,
    };
  }

  const stats = {
    total_records: records.length,
    present: records.filter((r) => r.status === 'present').length,
    absent: records.filter((r) => r.status === 'absent').length,
    late: records.filter((r) => r.status === 'late').length,
    half_day: records.filter((r) => r.status === 'half_day').length,
    leave: records.filter((r) => r.status === 'leave').length,
    holiday: records.filter((r) => r.status === 'holiday').length,
    attendance_rate: 0,
    total_work_hours: records.reduce((sum, r) => sum + (r.work_hours || 0), 0),
    total_overtime_hours: records.reduce((sum, r) => sum + (r.overtime_hours || 0), 0),
  };

  const workingDays = records.filter((r) => r.status !== 'holiday').length;
  stats.attendance_rate =
    workingDays > 0
      ? Math.round((stats.present / workingDays) * 100 * 100) / 100
      : 0;

  return stats;
}

export async function getBranchAttendance(date: string): Promise<BranchAttendanceStats[]> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single();

  if (!profile?.org_id) throw new Error('Organization not found');

  // Get all branches
  const { data: branches } = await supabase
    .from('client_branches')
    .select(
      `
      id,
      branch_name,
      required_guards,
      client:clients!inner(client_name)
    `
    )
    .eq('org_id', profile.org_id)
    .eq('status', 'active');

  if (!branches) return [];

  // Get attendance for the date
  const { data: attendance } = await supabase
    .from('attendance_records')
    .select('branch_id, status')
    .eq('attendance_date', date);

  return branches.map((branch: any) => {
    const branchAttendance = (attendance || []).filter(
      (a) => a.branch_id === branch.id
    );
    const presentCount = branchAttendance.filter((a) => a.status === 'present').length;
    const absentCount = branchAttendance.filter((a) => a.status === 'absent').length;

    return {
      branch_id: branch.id,
      branch_name: branch.branch_name,
      client_name: branch.client.client_name,
      required_guards: branch.required_guards,
      present_guards: presentCount,
      absent_guards: absentCount,
      attendance_rate:
        branch.required_guards > 0
          ? Math.round((presentCount / branch.required_guards) * 100 * 100) / 100
          : 0,
      date,
    };
  });
}

export async function getGuardAttendanceSummary(
  guard_id: string,
  from_date: string,
  to_date: string
): Promise<GuardAttendanceSummary> {
  const supabase = await createClient();

  // Get guard info
  const { data: guard } = await supabase
    .from('guards')
    .select('guard_code, full_name')
    .eq('id', guard_id)
    .single();

  if (!guard) throw new Error('Guard not found');

  // Get attendance records
  const { data: records } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('guard_id', guard_id)
    .gte('attendance_date', from_date)
    .lte('attendance_date', to_date);

  const totalDays = records?.length || 0;
  const presentDays = records?.filter((r) => r.status === 'present').length || 0;
  const absentDays = records?.filter((r) => r.status === 'absent').length || 0;
  const lateDays = records?.filter((r) => r.status === 'late').length || 0;
  const leaves = records?.filter((r) => r.status === 'leave').length || 0;
  const totalHours = records?.reduce((sum, r) => sum + (r.work_hours || 0), 0) || 0;
  const overtimeHours =
    records?.reduce((sum, r) => sum + (r.overtime_hours || 0), 0) || 0;

  return {
    guard_id,
    guard_code: guard.guard_code,
    guard_name: guard.full_name,
    total_days: totalDays,
    present_days: presentDays,
    absent_days: absentDays,
    late_days: lateDays,
    leaves,
    attendance_rate:
      totalDays > 0 ? Math.round((presentDays / totalDays) * 100 * 100) / 100 : 0,
    total_hours: Math.round(totalHours * 100) / 100,
    overtime_hours: Math.round(overtimeHours * 100) / 100,
  };
}
