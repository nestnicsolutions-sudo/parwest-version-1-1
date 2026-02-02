'use server';

import { createClient } from '@/lib/supabase/server';
import type {
  Ticket,
  TicketDetail,
  TicketListResponse,
  CreateTicketDTO,
  UpdateTicketDTO,
  ResolveTicketDTO,
  TicketFilters,
  TicketStats,
} from '@/types/ticket';

export async function getTickets(
  filters?: TicketFilters,
  page = 1,
  pageSize = 20
): Promise<TicketListResponse> {
  const supabase = await createClient();

  let query = supabase
    .from('tickets')
    .select(
      `
      *,
      client:clients(id, client_code, client_name),
      branch:client_branches(id, branch_code, branch_name),
      guard:guards(id, guard_code, full_name),
      assigned_user:profiles!tickets_assigned_to_fkey(id, full_name, email),
      created_user:profiles!tickets_created_by_fkey(id, full_name, email)
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.category) query = query.eq('category', filters.category);
  if (filters?.priority) query = query.eq('priority', filters.priority);
  if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to);
  if (filters?.client_id) query = query.eq('client_id', filters.client_id);
  if (filters?.guard_id) query = query.eq('guard_id', filters.guard_id);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    tickets: data as TicketDetail[],
    total: count || 0,
    page,
    pageSize,
  };
}

export async function getTicketById(id: string): Promise<TicketDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tickets')
    .select(
      `
      *,
      client:clients(id, client_code, client_name),
      branch:client_branches(id, branch_code, branch_name),
      guard:guards(id, guard_code, full_name),
      assigned_user:profiles!tickets_assigned_to_fkey(id, full_name, email),
      created_user:profiles!tickets_created_by_fkey(id, full_name, email)
    `
    )
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as TicketDetail;
}

export async function createTicket(data: CreateTicketDTO): Promise<Ticket> {
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

  // Generate ticket number
  const { data: lastTicket } = await supabase
    .from('tickets')
    .select('ticket_number')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let nextNumber = 1;
  if (lastTicket?.ticket_number) {
    const match = lastTicket.ticket_number.match(/TKT-(\d+)/);
    if (match) nextNumber = parseInt(match[1]) + 1;
  }
  const ticket_number = `TKT-${nextNumber.toString().padStart(5, '0')}`;

  // Calculate due date based on priority
  let dueHours = 48; // default
  if (data.priority === 'urgent') dueHours = 4;
  else if (data.priority === 'high') dueHours = 24;
  else if (data.priority === 'medium') dueHours = 48;
  else if (data.priority === 'low') dueHours = 72;

  const due_date = new Date();
  due_date.setHours(due_date.getHours() + dueHours);

  const { data: newTicket, error } = await supabase
    .from('tickets')
    .insert({
      ...data,
      ticket_number,
      org_id: profile.org_id,
      status: 'open',
      due_date: due_date.toISOString(),
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return newTicket as Ticket;
}

export async function updateTicket(id: string, data: UpdateTicketDTO): Promise<Ticket> {
  const supabase = await createClient();

  const { data: updated, error } = await supabase
    .from('tickets')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return updated as Ticket;
}

export async function assignTicket(id: string, assignedTo: string): Promise<Ticket> {
  const supabase = await createClient();

  const { data: updated, error } = await supabase
    .from('tickets')
    .update({
      assigned_to: assignedTo,
      assigned_at: new Date().toISOString(),
      status: 'in_progress',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return updated as Ticket;
}

export async function resolveTicket(id: string, data: ResolveTicketDTO): Promise<Ticket> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: updated, error } = await supabase
    .from('tickets')
    .update({
      status: 'resolved',
      resolution: data.resolution,
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return updated as Ticket;
}

export async function closeTicket(id: string): Promise<Ticket> {
  const supabase = await createClient();

  const { data: updated, error } = await supabase
    .from('tickets')
    .update({
      status: 'closed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return updated as Ticket;
}

export async function getTicketStats(): Promise<TicketStats> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single();

  if (!profile?.org_id) throw new Error('Organization not found');

  const { count: totalTickets } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', profile.org_id);

  const { count: openTickets } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', profile.org_id)
    .eq('status', 'open');

  const { count: inProgressTickets } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', profile.org_id)
    .eq('status', 'in_progress');

  const today = new Date().toISOString().split('T')[0];
  const { count: resolvedToday } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', profile.org_id)
    .eq('status', 'resolved')
    .gte('resolved_at', today);

  const { count: overdueTickets } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', profile.org_id)
    .lt('due_date', new Date().toISOString())
    .in('status', ['open', 'in_progress']);

  return {
    total_tickets: totalTickets || 0,
    open_tickets: openTickets || 0,
    in_progress_tickets: inProgressTickets || 0,
    resolved_today: resolvedToday || 0,
    by_status: [],
    by_priority: [],
    by_category: [],
    average_resolution_time: 0,
    overdue_tickets: overdueTickets || 0,
  };
}
