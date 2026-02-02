'use server';

import { createClient } from '@/lib/supabase/server';
import type {
  PayrollCycle,
  PayrollItem,
  PayrollCycleDetail,
  PayrollListResponse,
  CreatePayrollCycleDTO,
  UpdatePayrollCycleDTO,
} from '@/types/payroll';

export async function getPayrollCycles(
  page = 1,
  pageSize = 20
): Promise<PayrollListResponse> {
  const supabase = await createClient();

  let query = supabase
    .from('payroll_cycles')
    .select('*', { count: 'exact' })
    .order('start_date', { ascending: false });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    cycles: data as PayrollCycle[],
    total: count || 0,
    page,
    pageSize,
  };
}

export async function getPayrollCycleById(id: string): Promise<PayrollCycleDetail | null> {
  const supabase = await createClient();

  const { data: cycle, error: cycleError } = await supabase
    .from('payroll_cycles')
    .select('*')
    .eq('id', id)
    .single();

  if (cycleError) throw cycleError;

  const { data: items } = await supabase
    .from('payroll_items')
    .select(
      `
      *,
      guard:guards!inner(id, guard_code, full_name, cnic, bank_account_number, bank_name)
    `
    )
    .eq('cycle_id', id);

  return {
    ...cycle,
    items: items as any || [],
  };
}

export async function createPayrollCycle(
  data: CreatePayrollCycleDTO
): Promise<PayrollCycle> {
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

  const { data: newCycle, error } = await supabase
    .from('payroll_cycles')
    .insert({
      ...data,
      org_id: profile.org_id,
      status: 'draft',
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return newCycle as PayrollCycle;
}

export async function calculatePayroll(cycleId: string): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Get cycle details
  const { data: cycle } = await supabase
    .from('payroll_cycles')
    .select('*')
    .eq('id', cycleId)
    .single();

  if (!cycle) throw new Error('Payroll cycle not found');

  // Get all active guards
  const { data: guards } = await supabase
    .from('guards')
    .select('id, basic_salary')
    .eq('status', 'deployed');

  if (!guards) return;

  // Get attendance for period
  const { data: attendance } = await supabase
    .from('attendance_records')
    .select('guard_id, status, work_hours, overtime_hours')
    .gte('attendance_date', cycle.start_date)
    .lte('attendance_date', cycle.end_date);

  // Calculate for each guard
  const payrollItems = guards.map((guard) => {
    const guardAttendance = (attendance || []).filter((a) => a.guard_id === guard.id);
    const daysWorked = guardAttendance.filter((a) => a.status === 'present').length;
    const daysAbsent = guardAttendance.filter((a) => a.status === 'absent').length;
    const overtimeHours = guardAttendance.reduce(
      (sum, a) => sum + (a.overtime_hours || 0),
      0
    );

    const basicSalary = guard.basic_salary || 0;
    const overtimeAmount = overtimeHours * (basicSalary / 240); // Assuming 240 working hours/month
    const grossSalary = basicSalary + overtimeAmount;

    return {
      cycle_id: cycleId,
      guard_id: guard.id,
      basic_salary: basicSalary,
      allowances: {},
      overtime_amount: overtimeAmount,
      bonus: 0,
      gross_salary: grossSalary,
      deductions: {},
      loan_deduction: 0,
      advance_deduction: 0,
      tax: 0,
      total_deductions: 0,
      net_salary: grossSalary,
      days_worked: daysWorked,
      days_absent: daysAbsent,
      overtime_hours: overtimeHours,
      payment_method: 'bank_transfer',
      payment_status: 'pending',
    };
  });

  // Insert payroll items
  const { error } = await supabase.from('payroll_items').insert(payrollItems);

  if (error) throw error;

  // Update cycle
  const totals = payrollItems.reduce(
    (acc, item) => ({
      employees: acc.employees + 1,
      gross: acc.gross + item.gross_salary,
      deductions: acc.deductions + item.total_deductions,
      net: acc.net + item.net_salary,
    }),
    { employees: 0, gross: 0, deductions: 0, net: 0 }
  );

  await supabase
    .from('payroll_cycles')
    .update({
      status: 'calculated',
      total_employees: totals.employees,
      total_gross: totals.gross,
      total_deductions: totals.deductions,
      total_net: totals.net,
      calculated_at: new Date().toISOString(),
      calculated_by: user.id,
    })
    .eq('id', cycleId);
}

export async function approvePayroll(cycleId: string): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  await supabase
    .from('payroll_cycles')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    })
    .eq('id', cycleId);
}
