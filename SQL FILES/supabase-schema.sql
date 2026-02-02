-- =====================================================
-- Parwest ERP - Database Schema Setup
-- Run this in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROFILES TABLE (User Profile Data)
-- =====================================================
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
        'system_admin',
        'regional_manager',
        'hr_officer',
        'ops_supervisor',
        'finance_officer',
        'inventory_officer',
        'auditor_readonly',
        'client_portal'
    ))
);

-- =====================================================
-- 2. ROLES TABLE (Role Definitions)
-- =====================================================
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

-- =====================================================
-- 3. PERMISSIONS TABLE (Granular Permissions)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(module, action),
    CONSTRAINT valid_action CHECK (action IN ('view', 'create', 'edit', 'delete', 'approve', 'export'))
);

-- Insert permissions for all modules
INSERT INTO public.permissions (module, action, description) VALUES
-- Dashboard
('dashboard', 'view', 'View dashboard'),
('dashboard', 'export', 'Export dashboard data'),
-- Guards
('guards', 'view', 'View guards'),
('guards', 'create', 'Create new guards'),
('guards', 'edit', 'Edit guard information'),
('guards', 'delete', 'Delete guards'),
('guards', 'approve', 'Approve guard verifications'),
-- Clients
('clients', 'view', 'View clients'),
('clients', 'create', 'Create new clients'),
('clients', 'edit', 'Edit client information'),
('clients', 'delete', 'Delete clients'),
-- Deployments
('deployments', 'view', 'View deployments'),
('deployments', 'create', 'Create deployments'),
('deployments', 'edit', 'Edit deployments'),
('deployments', 'delete', 'Delete deployments'),
('deployments', 'approve', 'Approve deployment changes'),
-- Attendance
('attendance', 'view', 'View attendance'),
('attendance', 'create', 'Record attendance'),
('attendance', 'edit', 'Edit attendance records'),
('attendance', 'approve', 'Approve attendance'),
('attendance', 'export', 'Export attendance data'),
-- Payroll
('payroll', 'view', 'View payroll'),
('payroll', 'create', 'Create payroll'),
('payroll', 'edit', 'Edit payroll'),
('payroll', 'approve', 'Approve/finalize payroll'),
('payroll', 'export', 'Export payroll data'),
-- Billing
('billing', 'view', 'View billing'),
('billing', 'create', 'Create invoices'),
('billing', 'edit', 'Edit billing records'),
('billing', 'delete', 'Delete billing records'),
('billing', 'approve', 'Approve billing'),
('billing', 'export', 'Export billing data'),
-- Inventory
('inventory', 'view', 'View inventory'),
('inventory', 'create', 'Add inventory items'),
('inventory', 'edit', 'Edit inventory'),
('inventory', 'delete', 'Delete inventory items'),
-- Tickets
('tickets', 'view', 'View tickets'),
('tickets', 'create', 'Create tickets'),
('tickets', 'edit', 'Edit tickets'),
('tickets', 'delete', 'Delete tickets'),
('tickets', 'approve', 'Resolve/close tickets'),
-- Reports
('reports', 'view', 'View reports'),
('reports', 'export', 'Export reports'),
-- Settings
('settings', 'view', 'View settings'),
('settings', 'create', 'Create settings'),
('settings', 'edit', 'Edit settings'),
('settings', 'delete', 'Delete settings')
ON CONFLICT (module, action) DO NOTHING;

-- =====================================================
-- 4. ROLE_PERMISSIONS TABLE (Role-Permission Mapping)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(role_id, permission_id)
);

-- =====================================================
-- 5. AUTO-CREATE PROFILE ON USER SIGNUP
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, org_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'guard'),
        COALESCE((NEW.raw_user_meta_data->>'org_id')::UUID, uuid_generate_v4())
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read their own profile, admins can read all
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "System admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'system_admin'
        )
    );

CREATE POLICY "System admins can update profiles"
    ON public.profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'system_admin'
        )
    );

-- Roles: Everyone can read, only admins can modify
CREATE POLICY "Everyone can view roles"
    ON public.roles FOR SELECT
    USING (true);

CREATE POLICY "Only admins can modify roles"
    ON public.roles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'system_admin'
        )
    );

-- Permissions: Everyone can read
CREATE POLICY "Everyone can view permissions"
    ON public.permissions FOR SELECT
    USING (true);

-- Role Permissions: Everyone can read
CREATE POLICY "Everyone can view role permissions"
    ON public.role_permissions FOR SELECT
    USING (true);

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Get user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if user has permission
CREATE OR REPLACE FUNCTION public.has_permission(p_module TEXT, p_action TEXT)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        JOIN public.roles r ON r.name = p.role
        JOIN public.role_permissions rp ON rp.role_id = r.id
        JOIN public.permissions perm ON perm.id = rp.permission_id
        WHERE p.id = auth.uid()
        AND perm.module = p_module
        AND perm.action = p_action
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================
-- 8. UPDATE EXISTING USERS WITH PROFILES
-- =====================================================
-- This will create profiles for users that were created before the trigger
INSERT INTO public.profiles (id, email, full_name, role, org_id)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', au.email),
    COALESCE(au.raw_user_meta_data->>'role', 'guard'),
    uuid_generate_v4()
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- DONE! Next Steps:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Assign role permissions using the admin panel
-- 3. Test authentication flow
-- =====================================================
