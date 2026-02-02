-- =====================================================
-- FIX: Guards Table RLS Policies
-- Run this to allow supervisors to create and update guards
-- =====================================================

-- Enable RLS on guards table (if not already enabled)
ALTER TABLE public.guards ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view guards in their org" ON public.guards;
DROP POLICY IF EXISTS "Supervisors can create guards" ON public.guards;
DROP POLICY IF EXISTS "Supervisors can update guards" ON public.guards;
DROP POLICY IF EXISTS "System admins can delete guards" ON public.guards;
DROP POLICY IF EXISTS "System admins can manage all guards" ON public.guards;
DROP POLICY IF EXISTS "HR can manage guards" ON public.guards;

-- Policy 1: Everyone can VIEW guards in their organization
CREATE POLICY "Users can view guards in their org"
    ON public.guards FOR SELECT
    USING (
        org_id IN (
            SELECT org_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Policy 2: Supervisors, HR, Managers, and Admins can CREATE guards
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
CREATE POLICY "System admins can delete guards"
    ON public.guards FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'system_admin'
        )
    );

-- =====================================================
-- FIX: Approval Requests RLS Policies
-- Update to allow regional_manager and hr_officer to approve
-- =====================================================

-- Drop and recreate approval update policy
DROP POLICY IF EXISTS "Admins can update approval requests" ON public.approval_requests;

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

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check if policies are created
SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('guards', 'approval_requests')
ORDER BY tablename, policyname;

-- =====================================================
-- ✅ RLS POLICIES FIXED!
-- =====================================================
-- Changes made:
-- ✅ ops_supervisor can now CREATE guards
-- ✅ ops_supervisor can now UPDATE guards in their org
-- ✅ regional_manager and hr_officer can APPROVE guard requests
-- ✅ All users can VIEW guards in their organization
-- ✅ Only system_admin can DELETE guards
-- 
-- Workflow:
-- 1. Supervisor creates guard → Status: 'applicant'
-- 2. System creates approval request
-- 3. Admin/Manager approves → Guard status: 'approved'
-- 4. Guard appears in guards list with approved status
-- 5. Supervisor can deploy approved guards
-- =====================================================
