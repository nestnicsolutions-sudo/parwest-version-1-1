// =====================================================
// BILLING MODULE TYPES
// =====================================================

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  org_id: string;
  
  invoice_number: string;
  client_id: string;
  contract_id?: string;
  
  // Dates
  invoice_date: string;
  due_date: string;
  
  // Amounts
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  balance: number;
  
  // Status
  status: InvoiceStatus;
  
  // Details
  description?: string;
  notes?: string;
  terms?: string;
  
  // Metadata
  created_at: string;
  created_by?: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  
  // Reference
  deployment_id?: string;
  branch_id?: string;
  
  created_at: string;
}

// DTOs
export interface CreateInvoiceDTO {
  client_id: string;
  contract_id?: string;
  invoice_date: string;
  due_date: string;
  description?: string;
  notes?: string;
  terms?: string;
  items: {
    description: string;
    quantity: number;
    unit_price: number;
    deployment_id?: string;
    branch_id?: string;
  }[];
}

export interface UpdateInvoiceDTO {
  invoice_date?: string;
  due_date?: string;
  status?: InvoiceStatus;
  description?: string;
  notes?: string;
  terms?: string;
}

export interface InvoiceFilters {
  client_id?: string;
  status?: InvoiceStatus;
  from_date?: string;
  to_date?: string;
  overdue_only?: boolean;
}

// Extended types
export interface InvoiceDetail extends Invoice {
  client: {
    id: string;
    client_code: string;
    client_name: string;
    primary_contact_email?: string;
    primary_contact_phone?: string;
  };
  items: InvoiceItem[];
}

export interface InvoiceListResponse {
  invoices: InvoiceDetail[];
  total: number;
  page: number;
  pageSize: number;
}

// Statistics
export interface BillingStats {
  total_invoices: number;
  total_outstanding: number;
  total_overdue: number;
  total_paid_this_month: number;
  average_days_to_payment: number;
  
  by_status: {
    status: InvoiceStatus;
    count: number;
    total_amount: number;
  }[];
  
  top_clients: {
    client_id: string;
    client_name: string;
    total_billed: number;
    total_outstanding: number;
  }[];
}

export interface AgingReport {
  client_id: string;
  client_name: string;
  current: number; // 0-30 days
  days_30_60: number;
  days_60_90: number;
  days_90_plus: number;
  total_outstanding: number;
}
