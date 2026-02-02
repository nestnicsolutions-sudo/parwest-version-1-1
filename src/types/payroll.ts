// =====================================================
// PAYROLL MODULE TYPES
// =====================================================

export type PayrollCycleStatus = 'draft' | 'calculated' | 'reviewed' | 'approved' | 'paid' | 'locked';
export type PaymentStatus = 'pending' | 'paid' | 'failed';

export interface PayrollCycle {
  id: string;
  org_id: string;
  
  cycle_name: string;
  start_date: string;
  end_date: string;
  payment_date?: string;
  
  // Status
  status: PayrollCycleStatus;
  
  // Totals
  total_employees: number;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  
  // Processing
  calculated_at?: string;
  calculated_by?: string;
  approved_at?: string;
  approved_by?: string;
  
  created_at: string;
  created_by?: string;
}

export interface PayrollItem {
  id: string;
  cycle_id: string;
  guard_id: string;
  org_id: string;
  
  // Earnings
  basic_salary: number;
  allowances: Record<string, number>;
  overtime_amount: number;
  bonus: number;
  gross_salary: number;
  
  // Deductions
  deductions: Record<string, number>;
  loan_deduction: number;
  advance_deduction: number;
  tax: number;
  total_deductions: number;
  
  // Net
  net_salary: number;
  
  // Attendance
  days_worked: number;
  days_absent: number;
  overtime_hours: number;
  
  // Payment
  payment_method: string;
  payment_status: PaymentStatus;
  paid_at?: string;
  
  created_at: string;
}

// DTOs
export interface CreatePayrollCycleDTO {
  cycle_name: string;
  start_date: string;
  end_date: string;
  payment_date?: string;
}

export interface UpdatePayrollCycleDTO {
  cycle_name?: string;
  start_date?: string;
  end_date?: string;
  payment_date?: string;
  status?: PayrollCycleStatus;
}

export interface CalculatePayrollDTO {
  cycle_id: string;
  guard_ids?: string[]; // If empty, calculate for all
}

export interface PayrollItemDetail extends PayrollItem {
  guard: {
    id: string;
    guard_code: string;
    full_name: string;
    cnic: string;
    bank_account_number?: string;
    bank_name?: string;
  };
}

export interface PayrollCycleDetail extends PayrollCycle {
  items: PayrollItemDetail[];
}

export interface PayrollListResponse {
  cycles: PayrollCycle[];
  total: number;
  page: number;
  pageSize: number;
}

// Statistics
export interface PayrollStats {
  current_cycle: {
    total_employees: number;
    total_gross: number;
    total_net: number;
    status: PayrollCycleStatus;
  };
  monthly_comparison: {
    month: string;
    total_gross: number;
    total_net: number;
    total_employees: number;
  }[];
  department_breakdown: {
    department: string;
    employee_count: number;
    total_payout: number;
  }[];
}
