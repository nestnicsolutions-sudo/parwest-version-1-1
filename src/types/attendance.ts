// =====================================================
// ATTENDANCE MODULE TYPES
// =====================================================

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'leave' | 'holiday';

export interface AttendanceRecord {
  id: string;
  org_id: string;
  
  guard_id: string;
  deployment_id?: string;
  branch_id: string;
  
  attendance_date: string;
  shift_type?: string;
  
  // Time
  check_in_time?: string;
  check_out_time?: string;
  work_hours?: number;
  overtime_hours: number;
  
  // Status
  status: AttendanceStatus;
  
  // Location
  check_in_lat?: number;
  check_in_long?: number;
  check_out_lat?: number;
  check_out_long?: number;
  
  // Verification
  verified: boolean;
  verified_by?: string;
  verified_at?: string;
  
  // Metadata
  remarks?: string;
  created_at: string;
  created_by?: string;
}

// DTOs
export interface CreateAttendanceDTO {
  guard_id: string;
  deployment_id?: string;
  branch_id: string;
  attendance_date: string;
  shift_type?: string;
  check_in_time?: string;
  check_in_lat?: number;
  check_in_long?: number;
  status?: AttendanceStatus;
  remarks?: string;
}

export interface UpdateAttendanceDTO {
  check_out_time?: string;
  check_out_lat?: number;
  check_out_long?: number;
  work_hours?: number;
  overtime_hours?: number;
  status?: AttendanceStatus;
  remarks?: string;
}

export interface VerifyAttendanceDTO {
  verified: boolean;
  remarks?: string;
}

export interface AttendanceFilters {
  guard_id?: string;
  branch_id?: string;
  status?: AttendanceStatus;
  from_date: string;
  to_date: string;
  verified?: boolean;
}

// Extended types
export interface AttendanceDetail extends AttendanceRecord {
  guard: {
    id: string;
    guard_code: string;
    full_name: string;
    phone: string;
  };
  branch: {
    id: string;
    branch_code: string;
    branch_name: string;
    client_name: string;
  };
}

export interface AttendanceListResponse {
  records: AttendanceDetail[];
  total: number;
  page: number;
  pageSize: number;
}

// Statistics types
export interface AttendanceStats {
  total_records: number;
  present: number;
  absent: number;
  late: number;
  half_day: number;
  leave: number;
  holiday: number;
  attendance_rate: number;
  total_work_hours: number;
  total_overtime_hours: number;
}

export interface BranchAttendanceStats {
  branch_id: string;
  branch_name: string;
  client_name: string;
  required_guards: number;
  present_guards: number;
  absent_guards: number;
  attendance_rate: number;
  date: string;
}

export interface GuardAttendanceSummary {
  guard_id: string;
  guard_code: string;
  guard_name: string;
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  leaves: number;
  attendance_rate: number;
  total_hours: number;
  overtime_hours: number;
}
