-- =====================================================
-- COMPLETE ERP DATABASE SCHEMA
-- All Modules - Run after guards schema
-- =====================================================

-- =====================================================
-- CLIENTS & CONTRACTS MODULE
-- =====================================================

-- Clients table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    
    client_code VARCHAR(50) UNIQUE NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_type VARCHAR(50) DEFAULT 'corporate' CHECK (client_type IN ('corporate', 'government', 'individual', 'ngo')),
    
    -- Contact
    primary_contact_name VARCHAR(100),
    primary_contact_email VARCHAR(255),
    primary_contact_phone VARCHAR(20),
    
    -- Address
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(10),
    
    -- Business
    industry VARCHAR(100),
    tax_id VARCHAR(50),
    registration_number VARCHAR(50),
    
    -- Financials
    credit_limit DECIMAL(12, 2),
    payment_terms VARCHAR(50), -- net30, net60, etc
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('prospect', 'active', 'suspended', 'inactive')),
    
    -- Metadata
    notes TEXT,
    tags TEXT[],
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_clients_org ON public.clients(org_id);
CREATE INDEX idx_clients_status ON public.clients(status) WHERE is_deleted = false;
CREATE INDEX idx_clients_code ON public.clients(client_code);

-- Client branches (locations)
CREATE TABLE IF NOT EXISTS public.client_branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    org_id UUID NOT NULL,
    regional_office_id UUID,
    
    branch_code VARCHAR(50) NOT NULL,
    branch_name VARCHAR(255) NOT NULL,
    
    -- Location
    address TEXT NOT NULL,
    city VARCHAR(100),
    province VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Contact
    site_incharge_name VARCHAR(100),
    site_incharge_phone VARCHAR(20),
    
    -- Capacity
    required_guards INT DEFAULT 0,
    current_guards INT DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
    
    -- Metadata
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    
    UNIQUE(client_id, branch_code)
);

CREATE INDEX idx_client_branches_client ON public.client_branches(client_id);
CREATE INDEX idx_client_branches_regional ON public.client_branches(regional_office_id);

-- Client contracts
CREATE TABLE IF NOT EXISTS public.client_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    org_id UUID NOT NULL,
    
    contract_number VARCHAR(50) UNIQUE NOT NULL,
    contract_type VARCHAR(50) DEFAULT 'security_services',
    
    -- Dates
    start_date DATE NOT NULL,
    end_date DATE,
    renewal_date DATE,
    
    -- Financial
    contract_value DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'PKR',
    payment_frequency VARCHAR(20), -- monthly, quarterly, annual
    
    -- Terms
    notice_period_days INT DEFAULT 30,
    auto_renew BOOLEAN DEFAULT false,
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expired', 'terminated', 'renewed')),
    
    -- Documents
    document_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contracts_client ON public.client_contracts(client_id);
CREATE INDEX idx_contracts_status ON public.client_contracts(status);
CREATE INDEX idx_contracts_dates ON public.client_contracts(start_date, end_date);

-- =====================================================
-- DEPLOYMENTS MODULE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.guard_deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    
    guard_id UUID NOT NULL REFERENCES public.guards(id),
    client_id UUID NOT NULL REFERENCES public.clients(id),
    branch_id UUID NOT NULL REFERENCES public.client_branches(id),
    
    -- Schedule
    deployment_date DATE NOT NULL,
    end_date DATE,
    shift_type VARCHAR(20) CHECK (shift_type IN ('day', 'night', 'rotating', '24hour')),
    
    -- Status
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'suspended', 'ended', 'revoked')),
    
    -- Rates
    guard_rate DECIMAL(10, 2),
    client_rate DECIMAL(10, 2),
    
    -- Tracking
    deployed_at TIMESTAMPTZ,
    deployed_by UUID REFERENCES auth.users(id),
    ended_at TIMESTAMPTZ,
    end_reason TEXT,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deployments_guard ON public.guard_deployments(guard_id);
CREATE INDEX idx_deployments_client ON public.guard_deployments(client_id);
CREATE INDEX idx_deployments_branch ON public.guard_deployments(branch_id);
CREATE INDEX idx_deployments_status ON public.guard_deployments(status);
CREATE INDEX idx_deployments_date ON public.guard_deployments(deployment_date);

-- =====================================================
-- ATTENDANCE MODULE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    
    guard_id UUID NOT NULL REFERENCES public.guards(id),
    deployment_id UUID REFERENCES public.guard_deployments(id),
    branch_id UUID NOT NULL REFERENCES public.client_branches(id),
    
    attendance_date DATE NOT NULL,
    shift_type VARCHAR(20),
    
    -- Time
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    work_hours DECIMAL(5, 2),
    overtime_hours DECIMAL(5, 2) DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'leave', 'holiday')),
    
    -- Location
    check_in_lat DECIMAL(10, 8),
    check_in_long DECIMAL(11, 8),
    check_out_lat DECIMAL(10, 8),
    check_out_long DECIMAL(11, 8),
    
    -- Verification
    verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMPTZ,
    
    -- Metadata
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(guard_id, attendance_date)
);

CREATE INDEX idx_attendance_guard ON public.attendance_records(guard_id);
CREATE INDEX idx_attendance_branch ON public.attendance_records(branch_id);
CREATE INDEX idx_attendance_date ON public.attendance_records(attendance_date DESC);
CREATE INDEX idx_attendance_status ON public.attendance_records(status);

-- =====================================================
-- PAYROLL MODULE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.payroll_cycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    
    cycle_name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    payment_date DATE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'calculated', 'reviewed', 'approved', 'paid', 'locked')),
    
    -- Totals
    total_employees INT DEFAULT 0,
    total_gross DECIMAL(15, 2) DEFAULT 0,
    total_deductions DECIMAL(15, 2) DEFAULT 0,
    total_net DECIMAL(15, 2) DEFAULT 0,
    
    -- Processing
    calculated_at TIMESTAMPTZ,
    calculated_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_payroll_cycles_org ON public.payroll_cycles(org_id);
CREATE INDEX idx_payroll_cycles_dates ON public.payroll_cycles(start_date, end_date);
CREATE INDEX idx_payroll_cycles_status ON public.payroll_cycles(status);

CREATE TABLE IF NOT EXISTS public.payroll_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cycle_id UUID NOT NULL REFERENCES public.payroll_cycles(id) ON DELETE CASCADE,
    guard_id UUID NOT NULL REFERENCES public.guards(id),
    org_id UUID NOT NULL,
    
    -- Earnings
    basic_salary DECIMAL(10, 2) NOT NULL,
    allowances JSONB DEFAULT '{}',
    overtime_amount DECIMAL(10, 2) DEFAULT 0,
    bonus DECIMAL(10, 2) DEFAULT 0,
    gross_salary DECIMAL(10, 2) NOT NULL,
    
    -- Deductions
    deductions JSONB DEFAULT '{}',
    loan_deduction DECIMAL(10, 2) DEFAULT 0,
    advance_deduction DECIMAL(10, 2) DEFAULT 0,
    tax DECIMAL(10, 2) DEFAULT 0,
    total_deductions DECIMAL(10, 2) DEFAULT 0,
    
    -- Net
    net_salary DECIMAL(10, 2) NOT NULL,
    
    -- Attendance
    days_worked INT DEFAULT 0,
    days_absent INT DEFAULT 0,
    overtime_hours DECIMAL(5, 2) DEFAULT 0,
    
    -- Payment
    payment_method VARCHAR(20) DEFAULT 'bank_transfer',
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
    paid_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payroll_items_cycle ON public.payroll_items(cycle_id);
CREATE INDEX idx_payroll_items_guard ON public.payroll_items(guard_id);

-- =====================================================
-- BILLING MODULE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id),
    contract_id UUID REFERENCES public.client_contracts(id),
    
    -- Dates
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    
    -- Amounts
    subtotal DECIMAL(15, 2) NOT NULL,
    tax_amount DECIMAL(15, 2) DEFAULT 0,
    discount_amount DECIMAL(15, 2) DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL,
    paid_amount DECIMAL(15, 2) DEFAULT 0,
    balance DECIMAL(15, 2) NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled')),
    
    -- Details
    description TEXT,
    notes TEXT,
    terms TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_client ON public.invoices(client_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_date ON public.invoices(invoice_date DESC);
CREATE INDEX idx_invoices_due ON public.invoices(due_date) WHERE status != 'paid';

CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    
    -- Reference
    deployment_id UUID REFERENCES public.guard_deployments(id),
    branch_id UUID REFERENCES public.client_branches(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice ON public.invoice_items(invoice_id);

-- =====================================================
-- INVENTORY MODULE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    
    item_code VARCHAR(50) UNIQUE NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    
    -- Details
    description TEXT,
    unit_of_measure VARCHAR(50),
    
    -- Quantities
    quantity_in_stock INT DEFAULT 0,
    minimum_stock_level INT DEFAULT 0,
    reorder_point INT DEFAULT 0,
    
    -- Pricing
    unit_cost DECIMAL(10, 2),
    unit_price DECIMAL(10, 2),
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'discontinued', 'out_of_stock')),
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_org ON public.inventory_items(org_id);
CREATE INDEX idx_inventory_code ON public.inventory_items(item_code);
CREATE INDEX idx_inventory_category ON public.inventory_items(category);

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    item_id UUID NOT NULL REFERENCES public.inventory_items(id),
    
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('in', 'out', 'adjustment', 'return')),
    quantity INT NOT NULL,
    
    -- Reference
    reference_type VARCHAR(50), -- 'purchase', 'issue', 'guard_assignment'
    reference_id UUID,
    
    -- Details
    remarks TEXT,
    performed_by UUID REFERENCES auth.users(id),
    transaction_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_trans_item ON public.inventory_transactions(item_id);
CREATE INDEX idx_inventory_trans_date ON public.inventory_transactions(transaction_date DESC);

-- =====================================================
-- TICKETS MODULE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- Classification
    category VARCHAR(50) CHECK (category IN ('incident', 'complaint', 'request', 'query', 'technical')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Status
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'reopened')),
    
    -- Assignment
    assigned_to UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ,
    
    -- References
    client_id UUID REFERENCES public.clients(id),
    branch_id UUID REFERENCES public.client_branches(id),
    guard_id UUID REFERENCES public.guards(id),
    
    -- Resolution
    resolution TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- SLA tracking
    due_date TIMESTAMPTZ,
    first_response_at TIMESTAMPTZ
);

CREATE INDEX idx_tickets_org ON public.tickets(org_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_assigned ON public.tickets(assigned_to);
CREATE INDEX idx_tickets_client ON public.tickets(client_id);
CREATE INDEX idx_tickets_created ON public.tickets(created_at DESC);

-- =====================================================
-- RLS POLICIES FOR NEW TABLES
-- =====================================================

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guard_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (org-level isolation)
CREATE POLICY "org_isolation_clients" ON public.clients
    FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "org_isolation_client_branches" ON public.client_branches
    FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "org_isolation_deployments" ON public.guard_deployments
    FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "org_isolation_attendance" ON public.attendance_records
    FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "org_isolation_payroll_cycles" ON public.payroll_cycles
    FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "org_isolation_invoices" ON public.invoices
    FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "org_isolation_inventory" ON public.inventory_items
    FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "org_isolation_tickets" ON public.tickets
    FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- =====================================================
-- DONE! All modules schema created
-- =====================================================
