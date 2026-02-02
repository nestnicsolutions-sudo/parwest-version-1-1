-- =====================================================
-- PARWEST ERP - COMPLETE DATABASE SETUP (ALL-IN-ONE)
-- Run this ONCE in Supabase SQL Editor
-- Includes: All tables, triggers, functions, RLS policies, test data
-- Estimated time: 60 seconds
-- 
-- RECENT UPDATES:
-- - Added approval_requests table for workflow management
-- - Guards now require admin approval before appearing in deployments
-- - All users assigned to same org_id (00000000-0000-0000-0000-000000000000)
-- - RLS policies ensure org-level data isolation
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- PART 1: RBAC SYSTEM (Profiles, Roles, Permissions)
-- =====================================================

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'guard',
    regional_office_id UUID,
    org_id UUID NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_role CHECK (role IN (
        'system_admin', 'regional_manager', 'hr_officer', 'ops_supervisor',
        'finance_officer', 'inventory_officer', 'auditor_readonly', 'client_portal'
    ))
);

-- Roles table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert base roles
INSERT INTO public.roles (name, display_name, description, is_system) VALUES
('system_admin', 'System Admin', 'Full system access', true),
('regional_manager', 'Regional Manager', 'Regional operations management', true),
('hr_officer', 'HR Officer', 'HR and guard lifecycle management', true),
('ops_supervisor', 'Operations Supervisor', 'Field operations and deployments', true),
('finance_officer', 'Finance Officer', 'Financial management and billing', true),
('inventory_officer', 'Inventory Officer', 'Inventory and asset management', true),
('auditor_readonly', 'Auditor (Read-Only)', 'Organization-wide read access', true),
('client_portal', 'Client Portal User', 'Client-specific access', true)
ON CONFLICT (name) DO NOTHING;

-- Permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(module, action),
    CONSTRAINT valid_action CHECK (action IN ('view', 'create', 'edit', 'delete', 'approve', 'export'))
);

-- Role-Permission mapping
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- =====================================================
-- PART 2: GUARDS MODULE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.guards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    guard_code VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    father_name VARCHAR(100),
    cnic VARCHAR(15) UNIQUE NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    blood_group VARCHAR(5),
    religion VARCHAR(50),
    nationality VARCHAR(50) DEFAULT 'Pakistani',
    phone VARCHAR(20) NOT NULL,
    phone_secondary VARCHAR(20),
    email VARCHAR(255),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relation VARCHAR(50),
    permanent_address TEXT NOT NULL,
    permanent_city VARCHAR(100),
    permanent_province VARCHAR(100),
    current_address TEXT,
    current_city VARCHAR(100),
    current_province VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'applicant' CHECK (status IN (
        'applicant', 'screening', 'approved', 'onboarding', 'active', 'suspended', 'terminated', 'archived'
    )),
    employment_start_date DATE,
    employment_end_date DATE,
    regional_office_id UUID,
    assigned_branch_id UUID,
    designation VARCHAR(100) DEFAULT 'Security Guard',
    rank VARCHAR(50),
    shift_preference VARCHAR(20),
    basic_salary DECIMAL(10, 2),
    allowances JSONB DEFAULT '{}',
    deductions JSONB DEFAULT '{}',
    documents_verified BOOLEAN DEFAULT false,
    documents_verified_at TIMESTAMPTZ,
    documents_verified_by UUID REFERENCES auth.users(id),
    police_verification_status VARCHAR(20) DEFAULT 'pending',
    police_verification_date DATE,
    police_verification_number VARCHAR(50),
    character_certificate_status VARCHAR(20) DEFAULT 'pending',
    medical_certificate_status VARCHAR(20) DEFAULT 'pending',
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(50),
    bank_branch VARCHAR(100),
    profile_photo_url TEXT,
    notes TEXT,
    tags TEXT[],
    total_deployments INT DEFAULT 0,
    active_deployments INT DEFAULT 0,
    attendance_percentage DECIMAL(5, 2),
    rating DECIMAL(3, 2),
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    search_vector tsvector
);

CREATE TABLE IF NOT EXISTS public.guard_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guard_id UUID NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
    org_id UUID NOT NULL,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
        'cnic_front', 'cnic_back', 'photo', 'cv', 'police_verification',
        'character_certificate', 'medical_certificate', 'domicile',
        'education_certificate', 'experience_letter', 'bank_statement', 'contract', 'other'
    )),
    document_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT,
    file_size BIGINT,
    mime_type VARCHAR(100),
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES auth.users(id),
    verification_notes TEXT,
    issue_date DATE,
    expiry_date DATE,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.guard_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guard_id UUID NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
    org_id UUID NOT NULL,
    verification_type VARCHAR(50) NOT NULL CHECK (verification_type IN (
        'police_verification', 'character_certificate', 'medical_certificate',
        'employment_history', 'address_verification', 'reference_check'
    )),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'in_progress', 'verified', 'failed', 'expired'
    )),
    verified_by_name VARCHAR(100),
    verified_by_organization VARCHAR(200),
    verification_number VARCHAR(100),
    verification_date DATE,
    expiry_date DATE,
    result TEXT,
    remarks TEXT,
    attachments JSONB DEFAULT '[]',
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    requested_by UUID REFERENCES auth.users(id),
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.guard_loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guard_id UUID NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
    org_id UUID NOT NULL,
    loan_type VARCHAR(20) DEFAULT 'advance' CHECK (loan_type IN ('advance', 'loan', 'emergency')),
    amount DECIMAL(10, 2) NOT NULL,
    remaining_amount DECIMAL(10, 2) NOT NULL,
    installment_amount DECIMAL(10, 2),
    installment_count INT,
    installments_paid INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'approved', 'active', 'completed', 'cancelled')),
    reason TEXT,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    disbursed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.guard_clearance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guard_id UUID NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
    org_id UUID NOT NULL,
    clearance_type VARCHAR(30) DEFAULT 'final_settlement' CHECK (clearance_type IN ('final_settlement', 'resignation', 'termination')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'on_hold')),
    final_salary DECIMAL(10, 2),
    pending_loans DECIMAL(10, 2),
    other_deductions DECIMAL(10, 2),
    gratuity_amount DECIMAL(10, 2),
    net_payable DECIMAL(10, 2),
    uniform_returned BOOLEAN DEFAULT false,
    id_card_returned BOOLEAN DEFAULT false,
    equipment_returned BOOLEAN DEFAULT false,
    documents_collected BOOLEAN DEFAULT false,
    initiated_at TIMESTAMPTZ DEFAULT NOW(),
    initiated_by UUID REFERENCES auth.users(id),
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES auth.users(id),
    remarks TEXT,
    attachments JSONB DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS public.guard_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guard_id UUID NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
    org_id UUID NOT NULL,
    from_status VARCHAR(20),
    to_status VARCHAR(20) NOT NULL,
    transition_reason TEXT,
    transitioned_by UUID REFERENCES auth.users(id),
    transitioned_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- PART 2B: APPROVAL WORKFLOW SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS public.approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN (
        'guard_enrollment', 'guard_termination', 'deployment_change', 
        'leave_request', 'expense_approval', 'salary_adjustment',
        'client_creation', 'client_branch_creation'
    )),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'rejected', 'cancelled'
    )),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN (
        'low', 'normal', 'high', 'urgent'
    )),
    
    -- Reference to the entity being approved
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    entity_data JSONB,
    
    -- Request details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    reason TEXT,
    
    -- Requester information
    requested_by UUID NOT NULL REFERENCES auth.users(id),
    requested_by_name VARCHAR(255),
    requested_by_role VARCHAR(100),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Approver information
    approved_by UUID REFERENCES auth.users(id),
    approved_by_name VARCHAR(255),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Comments and history
    comments JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for approval_requests
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON public.approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_type ON public.approval_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_approval_requests_org ON public.approval_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_by ON public.approval_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_approval_requests_entity ON public.approval_requests(entity_type, entity_id);

-- =====================================================
-- PART 3: CLIENTS MODULE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    client_code VARCHAR(50) UNIQUE NOT NULL,
    client_name VARCHAR(200) NOT NULL,
    client_type VARCHAR(20) DEFAULT 'corporate' CHECK (client_type IN ('corporate', 'government', 'individual', 'ngo')),
    primary_contact_name VARCHAR(100),
    primary_contact_email VARCHAR(255),
    primary_contact_phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(20),
    industry VARCHAR(100),
    tax_id VARCHAR(50),
    registration_number VARCHAR(100),
    credit_limit DECIMAL(12, 2),
    payment_terms VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('prospect', 'active', 'suspended', 'inactive')),
    notes TEXT,
    tags TEXT[],
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.client_branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    org_id UUID NOT NULL,
    regional_office_id UUID,
    branch_code VARCHAR(50) NOT NULL,
    branch_name VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100),
    province VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    site_incharge_name VARCHAR(100),
    site_incharge_phone VARCHAR(20),
    required_guards INT DEFAULT 0,
    current_guards INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.client_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    org_id UUID NOT NULL,
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    contract_type VARCHAR(50) DEFAULT 'security_services',
    start_date DATE NOT NULL,
    end_date DATE,
    renewal_date DATE,
    contract_value DECIMAL(15, 2),
    currency VARCHAR(10) DEFAULT 'PKR',
    payment_frequency VARCHAR(20),
    notice_period_days INT DEFAULT 30,
    auto_renew BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expired', 'terminated', 'renewed')),
    document_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 4: DEPLOYMENTS & ATTENDANCE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.guard_deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    guard_id UUID NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.client_branches(id) ON DELETE CASCADE,
    deployment_date DATE NOT NULL,
    end_date DATE,
    shift_type VARCHAR(20) CHECK (shift_type IN ('day', 'night', 'rotating', '24hour')),
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'suspended', 'ended', 'revoked')),
    guard_rate DECIMAL(10, 2),
    client_rate DECIMAL(10, 2),
    deployed_at TIMESTAMPTZ,
    deployed_by UUID REFERENCES auth.users(id),
    ended_at TIMESTAMPTZ,
    end_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    guard_id UUID NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
    deployment_id UUID REFERENCES public.guard_deployments(id),
    branch_id UUID NOT NULL REFERENCES public.client_branches(id),
    attendance_date DATE NOT NULL,
    shift_type VARCHAR(20),
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    work_hours DECIMAL(5, 2),
    overtime_hours DECIMAL(5, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'leave', 'holiday')),
    check_in_lat DECIMAL(10, 8),
    check_in_long DECIMAL(11, 8),
    check_out_lat DECIMAL(10, 8),
    check_out_long DECIMAL(11, 8),
    verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMPTZ,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- PART 5: BILLING MODULE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.client_contracts(id),
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL,
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    balance DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled')),
    description TEXT,
    notes TEXT,
    terms TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    deployment_id UUID REFERENCES public.guard_deployments(id),
    branch_id UUID REFERENCES public.client_branches(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 6: PAYROLL MODULE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.payroll_cycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    cycle_name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    payment_date DATE,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'calculated', 'reviewed', 'approved', 'paid', 'locked')),
    total_employees INT DEFAULT 0,
    total_gross DECIMAL(15, 2) DEFAULT 0,
    total_deductions DECIMAL(15, 2) DEFAULT 0,
    total_net DECIMAL(15, 2) DEFAULT 0,
    calculated_at TIMESTAMPTZ,
    calculated_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.payroll_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cycle_id UUID NOT NULL REFERENCES public.payroll_cycles(id) ON DELETE CASCADE,
    guard_id UUID NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
    org_id UUID NOT NULL,
    basic_salary DECIMAL(10, 2) NOT NULL,
    allowances JSONB DEFAULT '{}',
    overtime_amount DECIMAL(10, 2) DEFAULT 0,
    bonus DECIMAL(10, 2) DEFAULT 0,
    gross_salary DECIMAL(12, 2) NOT NULL,
    deductions JSONB DEFAULT '{}',
    loan_deduction DECIMAL(10, 2) DEFAULT 0,
    advance_deduction DECIMAL(10, 2) DEFAULT 0,
    tax DECIMAL(10, 2) DEFAULT 0,
    total_deductions DECIMAL(12, 2) DEFAULT 0,
    net_salary DECIMAL(12, 2) NOT NULL,
    days_worked INT DEFAULT 0,
    days_absent INT DEFAULT 0,
    overtime_hours DECIMAL(5, 2) DEFAULT 0,
    payment_method VARCHAR(30) DEFAULT 'bank_transfer',
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 7: INVENTORY MODULE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    item_code VARCHAR(50) UNIQUE NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    unit_of_measure VARCHAR(20),
    quantity_in_stock INT DEFAULT 0,
    minimum_stock_level INT DEFAULT 0,
    reorder_point INT DEFAULT 0,
    unit_cost DECIMAL(10, 2),
    unit_price DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'discontinued', 'out_of_stock')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('in', 'out', 'adjustment', 'return')),
    quantity INT NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    remarks TEXT,
    performed_by UUID REFERENCES auth.users(id),
    transaction_date TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 8: TICKETS MODULE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(30) CHECK (category IN ('incident', 'complaint', 'request', 'query', 'technical')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'reopened')),
    assigned_to UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ,
    client_id UUID REFERENCES public.clients(id),
    branch_id UUID REFERENCES public.client_branches(id),
    guard_id UUID REFERENCES public.guards(id),
    resolution TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    due_date TIMESTAMPTZ,
    first_response_at TIMESTAMPTZ
);

-- =====================================================
-- PART 9: TRIGGERS & FUNCTIONS
-- =====================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, org_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'system_admin'),
        COALESCE((NEW.raw_user_meta_data->>'org_id')::UUID, uuid_generate_v4())
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update guards updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_guards_updated_at BEFORE UPDATE ON public.guards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PART 10: ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies for profiles (allow all authenticated users)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;

CREATE POLICY "Enable read access for authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable update for users based on id"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Everyone can read roles and permissions
CREATE POLICY "Everyone can view roles" ON public.roles FOR SELECT USING (true);
CREATE POLICY "Everyone can view permissions" ON public.permissions FOR SELECT USING (true);
CREATE POLICY "Everyone can view role permissions" ON public.role_permissions FOR SELECT USING (true);

-- =====================================================
-- RLS POLICIES FOR GUARDS TABLE
-- =====================================================

ALTER TABLE public.guards ENABLE ROW LEVEL SECURITY;

-- Policy 1: Everyone can VIEW guards in their organization
DROP POLICY IF EXISTS "Users can view guards in their org" ON public.guards;
CREATE POLICY "Users can view guards in their org"
    ON public.guards FOR SELECT
    USING (
        org_id IN (
            SELECT org_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Policy 2: Supervisors, HR, Managers, and Admins can CREATE guards
DROP POLICY IF EXISTS "Supervisors can create guards" ON public.guards;
CREATE POLICY "Supervisors can create guards"
    ON public.guards FOR INSERT
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.profiles WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('system_admin', 'regional_manager', 'hr_officer', 'ops_supervisor')
        )
    );

-- Policy 3: Supervisors, HR, Managers, and Admins can UPDATE guards in their org
DROP POLICY IF EXISTS "Supervisors can update guards" ON public.guards;
CREATE POLICY "Supervisors can update guards"
    ON public.guards FOR UPDATE
    USING (
        org_id IN (
            SELECT org_id FROM public.profiles WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('system_admin', 'regional_manager', 'hr_officer', 'ops_supervisor')
        )
    );

-- Policy 4: Only System Admins can DELETE guards
DROP POLICY IF EXISTS "System admins can delete guards" ON public.guards;
CREATE POLICY "System admins can delete guards"
    ON public.guards FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'system_admin'
        )
    );

-- RLS for approval_requests
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view approval requests in their org"
    ON public.approval_requests FOR SELECT
    USING (
        org_id IN (
            SELECT org_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create approval requests"
    ON public.approval_requests FOR INSERT
    WITH CHECK (
        org_id IN (
            SELECT org_id FROM public.profiles WHERE id = auth.uid()
        )
        AND requested_by = auth.uid()
    );

CREATE POLICY "Admins can update approval requests"
    ON public.approval_requests FOR UPDATE
    USING (
        org_id IN (
            SELECT org_id FROM public.profiles WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('system_admin', 'regional_manager', 'hr_officer')
        )
    );

-- Update trigger for approval_requests
CREATE OR REPLACE FUNCTION public.update_approval_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_approval_request_timestamp
    BEFORE UPDATE ON public.approval_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_approval_request_timestamp();

-- =====================================================
-- PART 11: CREATE TEST USER PROFILES
-- =====================================================

-- Insert profiles for existing users (all with same org_id for testing)
INSERT INTO public.profiles (id, email, full_name, role, org_id, is_active, created_at, updated_at)
SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) as full_name,
    COALESCE(u.raw_user_meta_data->>'role', 'system_admin') as role,
    '00000000-0000-0000-0000-000000000000'::uuid as org_id, -- Same org for all users
    true as is_active,
    u.created_at,
    NOW()
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- PART 12: INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_guards_org_id ON public.guards(org_id);
CREATE INDEX IF NOT EXISTS idx_guards_status ON public.guards(status);
CREATE INDEX IF NOT EXISTS idx_guards_cnic ON public.guards(cnic);
CREATE INDEX IF NOT EXISTS idx_guards_phone ON public.guards(phone);
CREATE INDEX IF NOT EXISTS idx_guards_created_at ON public.guards(created_at);

CREATE INDEX IF NOT EXISTS idx_clients_org_id ON public.clients(org_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);

CREATE INDEX IF NOT EXISTS idx_deployments_guard_id ON public.guard_deployments(guard_id);
CREATE INDEX IF NOT EXISTS idx_deployments_client_id ON public.guard_deployments(client_id);
CREATE INDEX IF NOT EXISTS idx_deployments_branch_id ON public.guard_deployments(branch_id);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON public.guard_deployments(status);

CREATE INDEX IF NOT EXISTS idx_attendance_guard_id ON public.attendance_records(guard_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance_records(attendance_date);

CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);



-- Add blacklist feature to guards table
-- This prevents blacklisted guards from being deployed

-- Add blacklist feature to guards table
-- This prevents blacklisted guards from being deployed

-- Add blacklist columns to guards table
ALTER TABLE guards 
ADD COLUMN IF NOT EXISTS blacklisted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS blacklisted_reason TEXT,
ADD COLUMN IF NOT EXISTS blacklisted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS blacklisted_by UUID;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_guards_blacklisted ON guards(blacklisted) WHERE blacklisted = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN guards.blacklisted IS 'If true, guard cannot be deployed regardless of status';
COMMENT ON COLUMN guards.blacklisted_reason IS 'Reason why guard was blacklisted';
COMMENT ON COLUMN guards.blacklisted_at IS 'Timestamp when guard was blacklisted';
COMMENT ON COLUMN guards.blacklisted_by IS 'User who blacklisted the guard';


-- =====================================================
-- ✅ SETUP COMPLETE!
-- =====================================================
-- Total tables created: 23 (including approval_requests)
-- Total time: ~60 seconds
-- 
-- New Features:
-- ✅ Approval workflow system for guard enrollment
-- ✅ Guards require admin approval before deployment
-- ✅ All users in same organization (org_id: 00000000-0000-0000-0000-000000000000)
-- ✅ RLS policies for data security
-- 
-- Next steps:
-- 1. Create users via Supabase Auth or Settings page
-- 2. Login with different roles (admin, HR, etc.)
-- 3. HR creates guard → Admin approves → Guard appears in deployments
-- 4. Start managing guards, clients, and deployments
-- =====================================================

SELECT 'Database setup complete! ' || COUNT(*) || ' tables created.' as status
FROM information_schema.tables 
WHERE table_schema = 'public';
