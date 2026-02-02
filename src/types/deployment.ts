// =====================================================
// DEPLOYMENT MODULE TYPES
// =====================================================

export type ShiftType = 'day' | 'night' | 'rotating' | '24hour';
export type DeploymentStatus = 'planned' | 'active' | 'suspended' | 'ended' | 'revoked';

export interface GuardDeployment {
  id: string;
  org_id: string;
  
  guard_id: string;
  client_id: string;
  branch_id: string;
  
  // Schedule
  deployment_date: string;
  end_date?: string;
  shift_type: ShiftType;
  
  // Status
  status: DeploymentStatus;
  
  // Rates
  guard_rate?: number;
  client_rate?: number;
  
  // Tracking
  deployed_at?: string;
  deployed_by?: string;
  ended_at?: string;
  end_reason?: string;
  
  // Metadata
  notes?: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
}

// DTOs
export interface CreateDeploymentDTO {
  guard_id: string;
  client_id: string;
  branch_id: string;
  deployment_date: string;
  shift_type: ShiftType;
  guard_rate?: number;
  client_rate?: number;
  notes?: string;
}

export interface UpdateDeploymentDTO {
  deployment_date?: string;
  end_date?: string;
  shift_type?: ShiftType;
  guard_rate?: number;
  client_rate?: number;
  status?: DeploymentStatus;
  notes?: string;
}

export interface RevokeDeploymentDTO {
  end_reason: string;
}

export interface SwapDeploymentDTO {
  old_guard_id: string;
  new_guard_id: string;
  swap_date: string;
  reason: string;
}

export interface DeploymentFilters {
  guard_id?: string;
  client_id?: string;
  branch_id?: string;
  status?: DeploymentStatus;
  shift_type?: ShiftType;
  from_date?: string;
  to_date?: string;
}

// Extended types with relations
export interface DeploymentDetail extends GuardDeployment {
  guard: {
    id: string;
    guard_code: string;
    full_name: string;
    cnic: string;
    phone: string;
  };
  client: {
    id: string;
    client_code: string;
    client_name: string;
  };
  branch: {
    id: string;
    branch_code: string;
    branch_name: string;
    address: string;
    city?: string;
  };
}

export interface DeploymentListResponse {
  deployments: DeploymentDetail[];
  total: number;
  page: number;
  pageSize: number;
}

// Deployment matrix types
export interface DeploymentMatrixRow {
  guard_id: string;
  guard_code: string;
  guard_name: string;
  deployments: {
    [branchId: string]: {
      deployment_id: string;
      status: DeploymentStatus;
      shift_type: ShiftType;
      start_date: string;
      end_date?: string;
    };
  };
}

export interface DeploymentMatrixData {
  branches: {
    id: string;
    branch_code: string;
    branch_name: string;
    client_name: string;
    required_guards: number;
    current_guards: number;
  }[];
  rows: DeploymentMatrixRow[];
}
