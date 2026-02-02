// =====================================================
// TICKETS MODULE TYPES
// =====================================================

export type TicketCategory = 'incident' | 'complaint' | 'request' | 'query' | 'technical';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'reopened';

export interface Ticket {
  id: string;
  org_id: string;
  
  ticket_number: string;
  title: string;
  description: string;
  
  // Classification
  category: TicketCategory;
  priority: TicketPriority;
  
  // Status
  status: TicketStatus;
  
  // Assignment
  assigned_to?: string;
  assigned_at?: string;
  
  // References
  client_id?: string;
  branch_id?: string;
  guard_id?: string;
  
  // Resolution
  resolution?: string;
  resolved_at?: string;
  resolved_by?: string;
  
  // Metadata
  created_at: string;
  created_by?: string;
  updated_at: string;
  
  // SLA tracking
  due_date?: string;
  first_response_at?: string;
}

// DTOs
export interface CreateTicketDTO {
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  client_id?: string;
  branch_id?: string;
  guard_id?: string;
  assigned_to?: string;
}

export interface UpdateTicketDTO {
  title?: string;
  description?: string;
  category?: TicketCategory;
  priority?: TicketPriority;
  status?: TicketStatus;
  assigned_to?: string;
}

export interface ResolveTicketDTO {
  resolution: string;
}

export interface TicketFilters {
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  assigned_to?: string;
  client_id?: string;
  guard_id?: string;
}

// Extended types
export interface TicketDetail extends Ticket {
  client?: {
    id: string;
    client_code: string;
    client_name: string;
  };
  branch?: {
    id: string;
    branch_code: string;
    branch_name: string;
  };
  guard?: {
    id: string;
    guard_code: string;
    full_name: string;
  };
  assigned_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  created_user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface TicketListResponse {
  tickets: TicketDetail[];
  total: number;
  page: number;
  pageSize: number;
}

// Statistics
export interface TicketStats {
  total_tickets: number;
  open_tickets: number;
  in_progress_tickets: number;
  resolved_today: number;
  
  by_status: {
    status: TicketStatus;
    count: number;
  }[];
  
  by_priority: {
    priority: TicketPriority;
    count: number;
  }[];
  
  by_category: {
    category: TicketCategory;
    count: number;
  }[];
  
  average_resolution_time: number; // in hours
  overdue_tickets: number;
}
