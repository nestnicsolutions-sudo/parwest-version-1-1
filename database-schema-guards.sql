-- =====================================================
-- GUARDS MODULE - Complete Database Schema
-- Run this AFTER supabase-schema.sql
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search

-- =====================================================
-- 1. GUARDS TABLE (Core Entity)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.guards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    
    -- Personal Information
    guard_code VARCHAR(50) UNIQUE NOT NULL, -- Auto-generated: GRD-YYYY-XXXX
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    father_name VARCHAR(100),
    cnic VARCHAR(15) UNIQUE NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    blood_group VARCHAR(5),
    religion VARCHAR(50),
    nationality VARCHAR(50) DEFAULT 'Pakistani',
    
    -- Contact Information
    phone VARCHAR(20) NOT NULL,
    phone_secondary VARCHAR(20),
    email VARCHAR(255),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relation VARCHAR(50),
    
    -- Address
    permanent_address TEXT NOT NULL,
    permanent_city VARCHAR(100),
    permanent_province VARCHAR(100),
    current_address TEXT,
    current_city VARCHAR(100),
    current_province VARCHAR(100),
    
    -- Employment Information
    status VARCHAR(20) NOT NULL DEFAULT 'applicant' CHECK (status IN (
        'applicant', 'screening', 'approved', 'onboarding', 
        'active', 'suspended', 'terminated', 'archived'
    )),
    employment_start_date DATE,
    employment_end_date DATE,
    regional_office_id UUID,
    assigned_branch_id UUID,
    
    -- Job Details
    designation VARCHAR(100) DEFAULT 'Security Guard',
    rank VARCHAR(50),
    shift_preference VARCHAR(20),
    
    -- Compensation
    basic_salary DECIMAL(10, 2),
    allowances JSONB DEFAULT '{}', -- {housing: 5000, transport: 3000, etc}
    deductions JSONB DEFAULT '{}', -- {advance: 2000, etc}
    
    -- Documents Status
    documents_verified BOOLEAN DEFAULT false,
    documents_verified_at TIMESTAMPTZ,
    documents_verified_by UUID,
    
    -- Background Verification
    police_verification_status VARCHAR(20) DEFAULT 'pending',
    police_verification_date DATE,
    police_verification_number VARCHAR(50),
    character_certificate_status VARCHAR(20) DEFAULT 'pending',
    medical_certificate_status VARCHAR(20) DEFAULT 'pending',
    
    -- Banking
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(50),
    bank_branch VARCHAR(100),
    
    -- Profile
    profile_photo_url TEXT,
    notes TEXT,
    tags TEXT[], -- ['experienced', 'night-shift', 'armed']
    
    -- Performance Metrics (cached)
    total_deployments INT DEFAULT 0,
    active_deployments INT DEFAULT 0,
    attendance_percentage DECIMAL(5, 2),
    rating DECIMAL(3, 2), -- 1.00 to 5.00
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    
    -- Search optimization
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', 
            coalesce(guard_code, '') || ' ' ||
            coalesce(first_name, '') || ' ' ||
            coalesce(last_name, '') || ' ' ||
            coalesce(cnic, '') || ' ' ||
            coalesce(phone, '')
        )
    ) STORED
);

-- Indexes for performance
CREATE INDEX idx_guards_org_id ON public.guards(org_id);
CREATE INDEX idx_guards_status ON public.guards(status) WHERE is_deleted = false;
CREATE INDEX idx_guards_regional_office ON public.guards(regional_office_id) WHERE is_deleted = false;
CREATE INDEX idx_guards_branch ON public.guards(assigned_branch_id) WHERE is_deleted = false;
CREATE INDEX idx_guards_cnic ON public.guards(cnic) WHERE is_deleted = false;
CREATE INDEX idx_guards_guard_code ON public.guards(guard_code);
CREATE INDEX idx_guards_search ON public.guards USING GIN(search_vector);
CREATE INDEX idx_guards_created_at ON public.guards(created_at DESC);

-- =====================================================
-- 2. GUARD DOCUMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.guard_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guard_id UUID NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
    org_id UUID NOT NULL,
    
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
        'cnic_front', 'cnic_back', 'photo', 'cv', 
        'police_verification', 'character_certificate', 
        'medical_certificate', 'domicile', 'education_certificate',
        'experience_letter', 'bank_statement', 'contract', 'other'
    )),
    document_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL, -- Supabase Storage path
    file_url TEXT, -- Public URL if needed
    file_size BIGINT,
    mime_type VARCHAR(100),
    
    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES auth.users(id),
    verification_notes TEXT,
    
    -- Expiry tracking (for certificates)
    issue_date DATE,
    expiry_date DATE,
    
    -- Metadata
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID REFERENCES auth.users(id),
    
    UNIQUE(guard_id, document_type, document_name)
);

CREATE INDEX idx_guard_documents_guard ON public.guard_documents(guard_id);
CREATE INDEX idx_guard_documents_type ON public.guard_documents(document_type);
CREATE INDEX idx_guard_documents_expiry ON public.guard_documents(expiry_date) WHERE expiry_date IS NOT NULL;

-- =====================================================
-- 3. GUARD STATUS HISTORY TABLE (Audit Trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.guard_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guard_id UUID NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
    org_id UUID NOT NULL,
    
    from_status VARCHAR(20),
    to_status VARCHAR(20) NOT NULL,
    transition_reason TEXT,
    
    -- Workflow tracking
    transitioned_by UUID REFERENCES auth.users(id),
    transitioned_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Additional context
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_guard_status_history_guard ON public.guard_status_history(guard_id);
CREATE INDEX idx_guard_status_history_date ON public.guard_status_history(transitioned_at DESC);

-- =====================================================
-- 4. GUARD VERIFICATIONS TABLE
-- =====================================================
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
    
    -- Verification details
    verified_by_name VARCHAR(100),
    verified_by_organization VARCHAR(200),
    verification_number VARCHAR(100),
    verification_date DATE,
    expiry_date DATE,
    
    -- Results
    result TEXT,
    remarks TEXT,
    attachments JSONB DEFAULT '[]', -- Array of document IDs
    
    -- Process tracking
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    requested_by UUID REFERENCES auth.users(id),
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES auth.users(id),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_guard_verifications_guard ON public.guard_verifications(guard_id);
CREATE INDEX idx_guard_verifications_type ON public.guard_verifications(verification_type);
CREATE INDEX idx_guard_verifications_status ON public.guard_verifications(status);
CREATE INDEX idx_guard_verifications_expiry ON public.guard_verifications(expiry_date) WHERE expiry_date IS NOT NULL;

-- =====================================================
-- 5. GUARD LOANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.guard_loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guard_id UUID NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
    org_id UUID NOT NULL,
    
    loan_type VARCHAR(50) DEFAULT 'advance' CHECK (loan_type IN ('advance', 'loan', 'emergency')),
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

CREATE INDEX idx_guard_loans_guard ON public.guard_loans(guard_id);
CREATE INDEX idx_guard_loans_status ON public.guard_loans(status);

-- =====================================================
-- 6. GUARD CLEARANCE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.guard_clearance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guard_id UUID NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
    org_id UUID NOT NULL,
    
    clearance_type VARCHAR(50) DEFAULT 'final_settlement' CHECK (clearance_type IN (
        'final_settlement', 'resignation', 'termination'
    )),
    
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'on_hold')),
    
    -- Financial details
    final_salary DECIMAL(10, 2),
    pending_loans DECIMAL(10, 2),
    other_deductions DECIMAL(10, 2),
    gratuity_amount DECIMAL(10, 2),
    net_payable DECIMAL(10, 2),
    
    -- Checklist
    uniform_returned BOOLEAN DEFAULT false,
    id_card_returned BOOLEAN DEFAULT false,
    equipment_returned BOOLEAN DEFAULT false,
    documents_collected BOOLEAN DEFAULT false,
    
    -- Process tracking
    initiated_at TIMESTAMPTZ DEFAULT NOW(),
    initiated_by UUID REFERENCES auth.users(id),
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES auth.users(id),
    
    remarks TEXT,
    attachments JSONB DEFAULT '[]'
);

CREATE INDEX idx_guard_clearance_guard ON public.guard_clearance(guard_id);
CREATE INDEX idx_guard_clearance_status ON public.guard_clearance(status);

-- =====================================================
-- 7. AUTO-UPDATE TIMESTAMP TRIGGER
-- =====================================================
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
-- 8. AUTO-GENERATE GUARD CODE TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION generate_guard_code()
RETURNS TRIGGER AS $$
DECLARE
    year_code TEXT;
    sequence_num INT;
    new_code TEXT;
BEGIN
    IF NEW.guard_code IS NULL OR NEW.guard_code = '' THEN
        year_code := TO_CHAR(NOW(), 'YYYY');
        
        -- Get next sequence number for this year
        SELECT COALESCE(MAX(
            CAST(SUBSTRING(guard_code FROM 'GRD-' || year_code || '-([0-9]+)') AS INT)
        ), 0) + 1
        INTO sequence_num
        FROM public.guards
        WHERE guard_code LIKE 'GRD-' || year_code || '-%';
        
        new_code := 'GRD-' || year_code || '-' || LPAD(sequence_num::TEXT, 4, '0');
        NEW.guard_code := new_code;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_guard_code_trigger
    BEFORE INSERT ON public.guards
    FOR EACH ROW
    EXECUTE FUNCTION generate_guard_code();

-- =====================================================
-- 9. GUARD STATUS HISTORY TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION log_guard_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.guard_status_history (
            guard_id, org_id, from_status, to_status, 
            transitioned_by, metadata
        )
        VALUES (
            NEW.id, NEW.org_id, OLD.status, NEW.status,
            NEW.updated_by,
            jsonb_build_object(
                'updated_fields', 
                jsonb_build_object('status', NEW.status)
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_guard_status_change_trigger
    AFTER UPDATE ON public.guards
    FOR EACH ROW
    EXECUTE FUNCTION log_guard_status_change();

-- =====================================================
-- 10. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.guards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guard_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guard_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guard_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guard_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guard_clearance ENABLE ROW LEVEL SECURITY;

-- Guards: Users can view guards in their org/region
CREATE POLICY "Users can view guards in their org"
    ON public.guards FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() 
            AND org_id = guards.org_id
        )
    );

CREATE POLICY "System admins can manage all guards"
    ON public.guards FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() 
            AND role = 'system_admin'
        )
    );

CREATE POLICY "HR can manage guards"
    ON public.guards FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() 
            AND role IN ('hr_officer', 'regional_manager')
            AND org_id = guards.org_id
        )
    );

-- Guard documents
CREATE POLICY "Users can view guard documents"
    ON public.guard_documents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            INNER JOIN public.guards g ON g.org_id = p.org_id
            WHERE p.id = auth.uid() 
            AND g.id = guard_documents.guard_id
        )
    );

CREATE POLICY "HR can manage guard documents"
    ON public.guard_documents FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            INNER JOIN public.guards g ON g.org_id = p.org_id
            WHERE p.id = auth.uid() 
            AND p.role IN ('system_admin', 'hr_officer', 'regional_manager')
            AND g.id = guard_documents.guard_id
        )
    );

-- Similar RLS policies for other tables...

-- =====================================================
-- 11. HELPER FUNCTIONS
-- =====================================================

-- Get guards with filters
CREATE OR REPLACE FUNCTION get_guards_filtered(
    p_status TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_regional_office_id UUID DEFAULT NULL,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    guard_code VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    cnic VARCHAR,
    phone VARCHAR,
    status VARCHAR,
    employment_start_date DATE,
    assigned_branch_id UUID,
    regional_office_id UUID,
    total_deployments INT,
    active_deployments INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.id, g.guard_code, g.first_name, g.last_name, g.cnic, 
        g.phone, g.status, g.employment_start_date, g.assigned_branch_id,
        g.regional_office_id, g.total_deployments, g.active_deployments
    FROM public.guards g
    WHERE g.is_deleted = false
        AND (p_status IS NULL OR g.status = p_status)
        AND (p_search IS NULL OR g.search_vector @@ plainto_tsquery('english', p_search))
        AND (p_regional_office_id IS NULL OR g.regional_office_id = p_regional_office_id)
    ORDER BY g.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DONE! Guards Module Schema Complete
-- =====================================================
