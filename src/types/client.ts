// =====================================================
// CLIENT MODULE TYPES
// =====================================================

export type ClientType = 'corporate' | 'government' | 'individual' | 'ngo';
export type ClientStatus = 'prospect' | 'active' | 'suspended' | 'inactive';
export type BranchStatus = 'active' | 'suspended' | 'closed';

export interface Client {
  id: string;
  org_id: string;
  
  client_code: string;
  client_name: string;
  client_type: ClientType;
  
  // Contact
  primary_contact_name?: string;
  primary_contact_email?: string;
  primary_contact_phone?: string;
  
  // Address
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  
  // Business
  industry?: string;
  tax_id?: string;
  registration_number?: string;
  
  // Financials
  credit_limit?: number;
  payment_terms?: string;
  
  // Status
  status: ClientStatus;
  
  // Metadata
  notes?: string;
  tags?: string[];
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
}

export interface ClientBranch {
  id: string;
  client_id: string;
  org_id: string;
  regional_office_id?: string;
  
  branch_code: string;
  branch_name: string;
  
  // Location
  address: string;
  city?: string;
  province?: string;
  latitude?: number;
  longitude?: number;
  
  // Contact
  site_incharge_name?: string;
  site_incharge_phone?: string;
  
  // Capacity
  required_guards: number;
  current_guards: number;
  
  // Status
  status: BranchStatus;
  
  // Metadata
  notes?: string;
  is_active: boolean;
  created_at: string;
  created_by?: string;
  updated_at: string;
}

export type ContractStatus = 'draft' | 'active' | 'expired' | 'terminated' | 'renewed';

export interface ClientContract {
  id: string;
  client_id: string;
  org_id: string;
  
  contract_number: string;
  contract_type: string;
  
  // Dates
  start_date: string;
  end_date?: string;
  renewal_date?: string;
  
  // Financial
  contract_value?: number;
  currency: string;
  payment_frequency?: string;
  
  // Terms
  notice_period_days: number;
  auto_renew: boolean;
  
  // Status
  status: ContractStatus;
  
  // Documents
  document_url?: string;
  
  created_at: string;
  created_by?: string;
  updated_at: string;
}

// DTOs
export interface CreateClientDTO {
  client_name: string;
  client_type: ClientType;
  primary_contact_name?: string;
  primary_contact_email?: string;
  primary_contact_phone?: string;
  address?: string;
  city?: string;
  province?: string;
  industry?: string;
  credit_limit?: number;
  payment_terms?: string;
  notes?: string;
}

export interface UpdateClientDTO {
  client_name?: string;
  client_type?: ClientType;
  primary_contact_name?: string;
  primary_contact_email?: string;
  primary_contact_phone?: string;
  address?: string;
  city?: string;
  province?: string;
  industry?: string;
  credit_limit?: number;
  payment_terms?: string;
  status?: ClientStatus;
  notes?: string;
}

export interface CreateBranchDTO {
  client_id: string;
  branch_code?: string;
  branch_name: string;
  address: string;
  city?: string;
  province?: string;
  latitude?: number;
  longitude?: number;
  site_incharge_name?: string;
  site_incharge_phone?: string;
  required_guards?: number;
  status?: BranchStatus;
  notes?: string;
}

export interface CreateClientBranchDTO extends CreateBranchDTO {}

export interface UpdateClientBranchDTO {
  branch_name?: string;
  address?: string;
  city?: string;
  province?: string;
  site_incharge_name?: string;
  site_incharge_phone?: string;
  required_guards?: number;
  status?: BranchStatus;
  notes?: string;
}

export interface CreateClientContractDTO {
  client_id: string;
  contract_number?: string;
  contract_type?: string;
  start_date: string;
  end_date?: string;
  contract_value?: number;
  payment_frequency?: string;
  status?: ContractStatus;
}

export interface ClientFilters {
  search?: string;
  status?: ClientStatus;
  client_type?: ClientType;
  city?: string;
}

export interface ClientDetail extends Client {
  branches: ClientBranch[];
  contracts: ClientContract[];
  active_guards: number;
  total_branches: number;
}

export interface ClientListResponse {
  clients: Client[];
  total: number;
  page: number;
  pageSize: number;
}
