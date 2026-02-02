-- Create approval_requests table
CREATE TABLE IF NOT EXISTS public.approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN (
        'guard_enrollment', 'guard_termination', 'deployment_change', 
        'leave_request', 'expense_approval', 'salary_adjustment'
    )),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'rejected', 'cancelled'
    )),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN (
        'low', 'normal', 'high', 'urgent'
    )),
    
    -- Reference to the entity being approved
    entity_type VARCHAR(50) NOT NULL, -- 'guard', 'deployment', 'leave', etc.
    entity_id UUID, -- ID of the guard, deployment, etc.
    entity_data JSONB, -- Complete data for the entity
    
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON public.approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_type ON public.approval_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_approval_requests_org ON public.approval_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_by ON public.approval_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_approval_requests_entity ON public.approval_requests(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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
            AND role IN ('system_admin', 'org_admin')
        )
    );

-- Update trigger
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

-- Verify table was created
SELECT 'Approval requests table created successfully' as message;
