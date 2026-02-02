/**
 * Guards Module - Type Definitions
 * Complete TypeScript types for Guards entity and related tables
 */

export type GuardStatus = 
    | 'applicant'
    | 'screening'
    | 'approved'
    | 'onboarding'
    | 'active'
    | 'suspended'
    | 'terminated'
    | 'archived';

export type GuardGender = 'male' | 'female' | 'other';

export type DocumentType =
    | 'cnic_front'
    | 'cnic_back'
    | 'photo'
    | 'cv'
    | 'police_verification'
    | 'character_certificate'
    | 'medical_certificate'
    | 'domicile'
    | 'education_certificate'
    | 'experience_letter'
    | 'bank_statement'
    | 'contract'
    | 'other';

export type VerificationType =
    | 'police_verification'
    | 'character_certificate'
    | 'medical_certificate'
    | 'employment_history'
    | 'address_verification'
    | 'reference_check';

export type VerificationStatus = 'pending' | 'in_progress' | 'verified' | 'failed' | 'expired';

export type LoanType = 'advance' | 'loan' | 'emergency';
export type LoanStatus = 'pending' | 'approved' | 'active' | 'completed' | 'cancelled';

export type ClearanceType = 'final_settlement' | 'resignation' | 'termination';
export type ClearanceStatus = 'pending' | 'in_progress' | 'completed' | 'on_hold';

// Core Guard interface
export interface Guard {
    id: string;
    org_id: string;
    
    // Personal Information
    guard_code: string;
    first_name: string;
    last_name: string;
    father_name?: string;
    cnic: string;
    date_of_birth: string; // ISO date string
    gender: GuardGender;
    blood_group?: string;
    religion?: string;
    nationality: string;
    
    // Contact
    phone: string;
    phone_secondary?: string;
    email?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    emergency_contact_relation?: string;
    
    // Address
    permanent_address: string;
    permanent_city?: string;
    permanent_province?: string;
    current_address?: string;
    current_city?: string;
    current_province?: string;
    
    // Employment
    status: GuardStatus;
    employment_start_date?: string;
    employment_end_date?: string;
    regional_office_id?: string;
    assigned_branch_id?: string;
    
    // Job Details
    designation: string;
    rank?: string;
    shift_preference?: string;
    
    // Compensation
    basic_salary?: number;
    allowances?: Record<string, number>;
    deductions?: Record<string, number>;
    
    // Documents
    documents_verified: boolean;
    documents_verified_at?: string;
    documents_verified_by?: string;
    
    // Verification
    police_verification_status: string;
    police_verification_date?: string;
    police_verification_number?: string;
    character_certificate_status: string;
    medical_certificate_status: string;
    
    // Banking
    bank_name?: string;
    bank_account_number?: string;
    bank_branch?: string;
    
    // Profile
    profile_photo_url?: string;
    notes?: string;
    tags?: string[];
    
    // Metrics
    total_deployments: number;
    active_deployments: number;
    attendance_percentage?: number;
    rating?: number;
    
    // Metadata
    is_active: boolean;
    is_deleted: boolean;
    created_at: string;
    created_by?: string;
    updated_at: string;
    updated_by?: string;
    deleted_at?: string;
    deleted_by?: string;
}

// Guard Document interface
export interface GuardDocument {
    id: string;
    guard_id: string;
    org_id: string;
    document_type: DocumentType;
    document_name: string;
    file_path: string;
    file_url?: string;
    file_size?: number;
    mime_type?: string;
    is_verified: boolean;
    verified_at?: string;
    verified_by?: string;
    verification_notes?: string;
    issue_date?: string;
    expiry_date?: string;
    uploaded_at: string;
    uploaded_by?: string;
}

// Guard Status History interface
export interface GuardStatusHistory {
    id: string;
    guard_id: string;
    org_id: string;
    from_status?: string;
    to_status: string;
    transition_reason?: string;
    transitioned_by?: string;
    transitioned_at: string;
    metadata?: Record<string, any>;
}

// Guard Verification interface
export interface GuardVerification {
    id: string;
    guard_id: string;
    org_id: string;
    verification_type: VerificationType;
    status: VerificationStatus;
    verified_by_name?: string;
    verified_by_organization?: string;
    verification_number?: string;
    verification_date?: string;
    expiry_date?: string;
    result?: string;
    remarks?: string;
    attachments?: string[];
    requested_at: string;
    requested_by?: string;
    completed_at?: string;
    completed_by?: string;
    metadata?: Record<string, any>;
}

// Guard Loan interface
export interface GuardLoan {
    id: string;
    guard_id: string;
    org_id: string;
    loan_type: LoanType;
    amount: number;
    remaining_amount: number;
    installment_amount?: number;
    installment_count?: number;
    installments_paid: number;
    status: LoanStatus;
    reason?: string;
    approved_by?: string;
    approved_at?: string;
    disbursed_at?: string;
    completed_at?: string;
    created_at: string;
    created_by?: string;
    updated_at: string;
}

// Guard Clearance interface
export interface GuardClearance {
    id: string;
    guard_id: string;
    org_id: string;
    clearance_type: ClearanceType;
    status: ClearanceStatus;
    final_salary?: number;
    pending_loans?: number;
    other_deductions?: number;
    gratuity_amount?: number;
    net_payable?: number;
    uniform_returned: boolean;
    id_card_returned: boolean;
    equipment_returned: boolean;
    documents_collected: boolean;
    initiated_at: string;
    initiated_by?: string;
    completed_at?: string;
    completed_by?: string;
    remarks?: string;
    attachments?: string[];
}

// DTOs for API operations

export interface CreateGuardDTO {
    first_name: string;
    last_name: string;
    father_name?: string;
    cnic: string;
    date_of_birth: string;
    gender: GuardGender;
    phone: string;
    phone_secondary?: string;
    email?: string;
    permanent_address: string;
    permanent_city?: string;
    permanent_province?: string;
    blood_group?: string;
    religion?: string;
    nationality?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    emergency_contact_relation?: string;
}

export interface UpdateGuardDTO extends Partial<CreateGuardDTO> {
    status?: GuardStatus;
    employment_start_date?: string;
    regional_office_id?: string;
    assigned_branch_id?: string;
    basic_salary?: number;
    designation?: string;
    rank?: string;
    shift_preference?: string;
    bank_name?: string;
    bank_account_number?: string;
    bank_branch?: string;
    notes?: string;
    tags?: string[];
}

export interface GuardFilters {
    status?: GuardStatus;
    search?: string;
    regional_office_id?: string;
    assigned_branch_id?: string;
    is_active?: boolean;
    page?: number;
    limit?: number;
}

export interface GuardListResponse {
    data: Guard[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// Guard with related data (for detail view)
export interface GuardDetail extends Guard {
    documents?: GuardDocument[];
    verifications?: GuardVerification[];
    loans?: GuardLoan[];
    clearance?: GuardClearance;
    status_history?: GuardStatusHistory[];
}
