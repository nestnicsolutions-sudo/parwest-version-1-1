'use server';

import { createClient } from '@/lib/supabase/server';
import type {
  Invoice,
  InvoiceDetail,
  InvoiceListResponse,
  CreateInvoiceDTO,
  UpdateInvoiceDTO,
  InvoiceFilters,
  BillingStats,
} from '@/types/billing';

export async function getInvoices(
  filters?: InvoiceFilters,
  page = 1,
  pageSize = 20
): Promise<InvoiceListResponse> {
  const supabase = await createClient();

  let query = supabase
    .from('invoices')
    .select(
      `
      *,
      client:clients!inner(id, client_code, client_name, primary_contact_email, primary_contact_phone),
      items:invoice_items(*)
    `,
      { count: 'exact' }
    )
    .order('invoice_date', { ascending: false });

  if (filters?.client_id) query = query.eq('client_id', filters.client_id);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.from_date) query = query.gte('invoice_date', filters.from_date);
  if (filters?.to_date) query = query.lte('invoice_date', filters.to_date);
  if (filters?.overdue_only) {
    query = query
      .lt('due_date', new Date().toISOString().split('T')[0])
      .in('status', ['sent', 'viewed', 'partial']);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    invoices: data as InvoiceDetail[],
    total: count || 0,
    page,
    pageSize,
  };
}

export async function getInvoiceById(id: string): Promise<InvoiceDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('invoices')
    .select(
      `
      *,
      client:clients!inner(id, client_code, client_name, primary_contact_email, primary_contact_phone),
      items:invoice_items(*)
    `
    )
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as InvoiceDetail;
}

export async function createInvoice(data: CreateInvoiceDTO): Promise<Invoice> {
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

  // Generate invoice number
  const { data: lastInvoice } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let nextNumber = 1;
  if (lastInvoice?.invoice_number) {
    const match = lastInvoice.invoice_number.match(/INV-(\d+)/);
    if (match) nextNumber = parseInt(match[1]) + 1;
  }
  const invoice_number = `INV-${nextNumber.toString().padStart(5, '0')}`;

  // Calculate totals
  const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const total_amount = subtotal;

  const { data: newInvoice, error } = await supabase
    .from('invoices')
    .insert({
      org_id: profile.org_id,
      invoice_number,
      client_id: data.client_id,
      contract_id: data.contract_id,
      invoice_date: data.invoice_date,
      due_date: data.due_date,
      subtotal,
      tax_amount: 0,
      discount_amount: 0,
      total_amount,
      paid_amount: 0,
      balance: total_amount,
      status: 'draft',
      description: data.description,
      notes: data.notes,
      terms: data.terms,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;

  // Insert items
  const items = data.items.map((item) => ({
    invoice_id: newInvoice.id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    amount: item.quantity * item.unit_price,
    deployment_id: item.deployment_id,
    branch_id: item.branch_id,
  }));

  await supabase.from('invoice_items').insert(items);

  return newInvoice as Invoice;
}

export async function updateInvoice(
  id: string,
  data: UpdateInvoiceDTO
): Promise<Invoice> {
  const supabase = await createClient();

  const { data: updated, error } = await supabase
    .from('invoices')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return updated as Invoice;
}

export async function recordPayment(
  invoiceId: string,
  amount: number
): Promise<Invoice> {
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from('invoices')
    .select('paid_amount, total_amount')
    .eq('id', invoiceId)
    .single();

  if (!invoice) throw new Error('Invoice not found');

  const newPaidAmount = (invoice.paid_amount || 0) + amount;
  const newBalance = invoice.total_amount - newPaidAmount;
  let newStatus = invoice.total_amount === newPaidAmount ? 'paid' : 'partial';

  const { data: updated, error } = await supabase
    .from('invoices')
    .update({
      paid_amount: newPaidAmount,
      balance: newBalance,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoiceId)
    .select()
    .single();

  if (error) throw error;
  return updated as Invoice;
}

export async function getBillingStats(): Promise<BillingStats> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single();

  if (!profile?.org_id) throw new Error('Organization not found');

  const { count: totalInvoices } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', profile.org_id);

  const { data: outstanding } = await supabase
    .from('invoices')
    .select('balance')
    .eq('org_id', profile.org_id)
    .in('status', ['sent', 'viewed', 'partial']);

  const totalOutstanding = outstanding?.reduce((sum, inv) => sum + (inv.balance || 0), 0) || 0;

  const today = new Date().toISOString().split('T')[0];
  const { data: overdue } = await supabase
    .from('invoices')
    .select('balance')
    .eq('org_id', profile.org_id)
    .lt('due_date', today)
    .in('status', ['sent', 'viewed', 'partial']);

  const totalOverdue = overdue?.reduce((sum, inv) => sum + (inv.balance || 0), 0) || 0;

  return {
    total_invoices: totalInvoices || 0,
    total_outstanding: totalOutstanding,
    total_overdue: totalOverdue,
    total_paid_this_month: 0,
    average_days_to_payment: 0,
    by_status: [],
    top_clients: [],
  };
}
