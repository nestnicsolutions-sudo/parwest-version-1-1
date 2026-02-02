-- =====================================================
-- Assign Permissions to Roles (Based on IAM Matrix)
-- Run AFTER supabase-schema.sql
-- =====================================================

-- Helper function to assign permission
CREATE OR REPLACE FUNCTION assign_permission(
    role_name TEXT,
    module_name TEXT,
    action_name TEXT
) RETURNS VOID AS $$
DECLARE
    v_role_id UUID;
    v_permission_id UUID;
BEGIN
    -- Get role ID
    SELECT id INTO v_role_id FROM public.roles WHERE name = role_name;
    
    -- Get permission ID
    SELECT id INTO v_permission_id FROM public.permissions 
    WHERE module = module_name AND action = action_name;
    
    -- Insert if both found
    IF v_role_id IS NOT NULL AND v_permission_id IS NOT NULL THEN
        INSERT INTO public.role_permissions (role_id, permission_id)
        VALUES (v_role_id, v_permission_id)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SYSTEM ADMIN - Full Access
-- =====================================================
SELECT assign_permission('system_admin', 'dashboard', 'view');
SELECT assign_permission('system_admin', 'dashboard', 'export');
SELECT assign_permission('system_admin', 'guards', 'view');
SELECT assign_permission('system_admin', 'guards', 'create');
SELECT assign_permission('system_admin', 'guards', 'edit');
SELECT assign_permission('system_admin', 'guards', 'delete');
SELECT assign_permission('system_admin', 'guards', 'approve');
SELECT assign_permission('system_admin', 'clients', 'view');
SELECT assign_permission('system_admin', 'clients', 'create');
SELECT assign_permission('system_admin', 'clients', 'edit');
SELECT assign_permission('system_admin', 'clients', 'delete');
SELECT assign_permission('system_admin', 'deployments', 'view');
SELECT assign_permission('system_admin', 'deployments', 'create');
SELECT assign_permission('system_admin', 'deployments', 'edit');
SELECT assign_permission('system_admin', 'deployments', 'delete');
SELECT assign_permission('system_admin', 'deployments', 'approve');
SELECT assign_permission('system_admin', 'attendance', 'view');
SELECT assign_permission('system_admin', 'attendance', 'create');
SELECT assign_permission('system_admin', 'attendance', 'edit');
SELECT assign_permission('system_admin', 'attendance', 'approve');
SELECT assign_permission('system_admin', 'attendance', 'export');
SELECT assign_permission('system_admin', 'payroll', 'view');
SELECT assign_permission('system_admin', 'payroll', 'create');
SELECT assign_permission('system_admin', 'payroll', 'edit');
SELECT assign_permission('system_admin', 'payroll', 'approve');
SELECT assign_permission('system_admin', 'payroll', 'export');
SELECT assign_permission('system_admin', 'billing', 'view');
SELECT assign_permission('system_admin', 'billing', 'create');
SELECT assign_permission('system_admin', 'billing', 'edit');
SELECT assign_permission('system_admin', 'billing', 'delete');
SELECT assign_permission('system_admin', 'billing', 'approve');
SELECT assign_permission('system_admin', 'billing', 'export');
SELECT assign_permission('system_admin', 'inventory', 'view');
SELECT assign_permission('system_admin', 'inventory', 'create');
SELECT assign_permission('system_admin', 'inventory', 'edit');
SELECT assign_permission('system_admin', 'inventory', 'delete');
SELECT assign_permission('system_admin', 'tickets', 'view');
SELECT assign_permission('system_admin', 'tickets', 'create');
SELECT assign_permission('system_admin', 'tickets', 'edit');
SELECT assign_permission('system_admin', 'tickets', 'delete');
SELECT assign_permission('system_admin', 'tickets', 'approve');
SELECT assign_permission('system_admin', 'reports', 'view');
SELECT assign_permission('system_admin', 'reports', 'export');
SELECT assign_permission('system_admin', 'settings', 'view');
SELECT assign_permission('system_admin', 'settings', 'create');
SELECT assign_permission('system_admin', 'settings', 'edit');
SELECT assign_permission('system_admin', 'settings', 'delete');

-- =====================================================
-- REGIONAL MANAGER
-- =====================================================
SELECT assign_permission('regional_manager', 'dashboard', 'view');
SELECT assign_permission('regional_manager', 'guards', 'view');
SELECT assign_permission('regional_manager', 'guards', 'create');
SELECT assign_permission('regional_manager', 'guards', 'edit');
SELECT assign_permission('regional_manager', 'clients', 'view');
SELECT assign_permission('regional_manager', 'clients', 'create');
SELECT assign_permission('regional_manager', 'clients', 'edit');
SELECT assign_permission('regional_manager', 'deployments', 'view');
SELECT assign_permission('regional_manager', 'deployments', 'create');
SELECT assign_permission('regional_manager', 'deployments', 'edit');
SELECT assign_permission('regional_manager', 'deployments', 'approve');
SELECT assign_permission('regional_manager', 'attendance', 'view');
SELECT assign_permission('regional_manager', 'attendance', 'create');
SELECT assign_permission('regional_manager', 'attendance', 'edit');
SELECT assign_permission('regional_manager', 'attendance', 'approve');
SELECT assign_permission('regional_manager', 'payroll', 'view');
SELECT assign_permission('regional_manager', 'billing', 'view');
SELECT assign_permission('regional_manager', 'inventory', 'view');
SELECT assign_permission('regional_manager', 'tickets', 'view');
SELECT assign_permission('regional_manager', 'tickets', 'create');
SELECT assign_permission('regional_manager', 'tickets', 'edit');
SELECT assign_permission('regional_manager', 'tickets', 'approve');
SELECT assign_permission('regional_manager', 'reports', 'view');
SELECT assign_permission('regional_manager', 'settings', 'view');

-- =====================================================
-- HR OFFICER
-- =====================================================
SELECT assign_permission('hr_officer', 'dashboard', 'view');
SELECT assign_permission('hr_officer', 'guards', 'view');
SELECT assign_permission('hr_officer', 'guards', 'create');
SELECT assign_permission('hr_officer', 'guards', 'edit');
SELECT assign_permission('hr_officer', 'guards', 'approve');
SELECT assign_permission('hr_officer', 'clients', 'view');
SELECT assign_permission('hr_officer', 'deployments', 'view');
SELECT assign_permission('hr_officer', 'attendance', 'view');
SELECT assign_permission('hr_officer', 'payroll', 'view');
SELECT assign_permission('hr_officer', 'billing', 'view');
SELECT assign_permission('hr_officer', 'inventory', 'view');
SELECT assign_permission('hr_officer', 'tickets', 'view');
SELECT assign_permission('hr_officer', 'tickets', 'create');
SELECT assign_permission('hr_officer', 'tickets', 'edit');
SELECT assign_permission('hr_officer', 'reports', 'view');
SELECT assign_permission('hr_officer', 'reports', 'export');
SELECT assign_permission('hr_officer', 'settings', 'view');

-- =====================================================
-- OPERATIONS SUPERVISOR
-- =====================================================
SELECT assign_permission('ops_supervisor', 'dashboard', 'view');
SELECT assign_permission('ops_supervisor', 'guards', 'view');
SELECT assign_permission('ops_supervisor', 'clients', 'view');
SELECT assign_permission('ops_supervisor', 'deployments', 'view');
SELECT assign_permission('ops_supervisor', 'deployments', 'create');
SELECT assign_permission('ops_supervisor', 'deployments', 'edit');
SELECT assign_permission('ops_supervisor', 'attendance', 'view');
SELECT assign_permission('ops_supervisor', 'attendance', 'create');
SELECT assign_permission('ops_supervisor', 'attendance', 'edit');
SELECT assign_permission('ops_supervisor', 'payroll', 'view');
SELECT assign_permission('ops_supervisor', 'billing', 'view');
SELECT assign_permission('ops_supervisor', 'inventory', 'view');
SELECT assign_permission('ops_supervisor', 'tickets', 'view');
SELECT assign_permission('ops_supervisor', 'tickets', 'create');
SELECT assign_permission('ops_supervisor', 'tickets', 'edit');
SELECT assign_permission('ops_supervisor', 'reports', 'view');
SELECT assign_permission('ops_supervisor', 'settings', 'view');

-- =====================================================
-- FINANCE OFFICER
-- =====================================================
SELECT assign_permission('finance_officer', 'dashboard', 'view');
SELECT assign_permission('finance_officer', 'guards', 'view');
SELECT assign_permission('finance_officer', 'clients', 'view');
SELECT assign_permission('finance_officer', 'deployments', 'view');
SELECT assign_permission('finance_officer', 'attendance', 'view');
SELECT assign_permission('finance_officer', 'attendance', 'export');
SELECT assign_permission('finance_officer', 'payroll', 'view');
SELECT assign_permission('finance_officer', 'payroll', 'create');
SELECT assign_permission('finance_officer', 'payroll', 'edit');
SELECT assign_permission('finance_officer', 'payroll', 'approve');
SELECT assign_permission('finance_officer', 'payroll', 'export');
SELECT assign_permission('finance_officer', 'billing', 'view');
SELECT assign_permission('finance_officer', 'billing', 'create');
SELECT assign_permission('finance_officer', 'billing', 'edit');
SELECT assign_permission('finance_officer', 'billing', 'approve');
SELECT assign_permission('finance_officer', 'billing', 'export');
SELECT assign_permission('finance_officer', 'inventory', 'view');
SELECT assign_permission('finance_officer', 'tickets', 'view');
SELECT assign_permission('finance_officer', 'tickets', 'create');
SELECT assign_permission('finance_officer', 'tickets', 'edit');
SELECT assign_permission('finance_officer', 'reports', 'view');
SELECT assign_permission('finance_officer', 'reports', 'export');
SELECT assign_permission('finance_officer', 'settings', 'view');

-- =====================================================
-- INVENTORY OFFICER
-- =====================================================
SELECT assign_permission('inventory_officer', 'dashboard', 'view');
SELECT assign_permission('inventory_officer', 'guards', 'view');
SELECT assign_permission('inventory_officer', 'clients', 'view');
SELECT assign_permission('inventory_officer', 'deployments', 'view');
SELECT assign_permission('inventory_officer', 'attendance', 'view');
SELECT assign_permission('inventory_officer', 'payroll', 'view');
SELECT assign_permission('inventory_officer', 'billing', 'view');
SELECT assign_permission('inventory_officer', 'inventory', 'view');
SELECT assign_permission('inventory_officer', 'inventory', 'create');
SELECT assign_permission('inventory_officer', 'inventory', 'edit');
SELECT assign_permission('inventory_officer', 'inventory', 'delete');
SELECT assign_permission('inventory_officer', 'tickets', 'view');
SELECT assign_permission('inventory_officer', 'tickets', 'create');
SELECT assign_permission('inventory_officer', 'tickets', 'edit');
SELECT assign_permission('inventory_officer', 'reports', 'view');
SELECT assign_permission('inventory_officer', 'settings', 'view');

-- =====================================================
-- AUDITOR (Read-Only)
-- =====================================================
SELECT assign_permission('auditor_readonly', 'dashboard', 'view');
SELECT assign_permission('auditor_readonly', 'guards', 'view');
SELECT assign_permission('auditor_readonly', 'clients', 'view');
SELECT assign_permission('auditor_readonly', 'deployments', 'view');
SELECT assign_permission('auditor_readonly', 'attendance', 'view');
SELECT assign_permission('auditor_readonly', 'payroll', 'view');
SELECT assign_permission('auditor_readonly', 'billing', 'view');
SELECT assign_permission('auditor_readonly', 'inventory', 'view');
SELECT assign_permission('auditor_readonly', 'tickets', 'view');
SELECT assign_permission('auditor_readonly', 'reports', 'view');
SELECT assign_permission('auditor_readonly', 'reports', 'export');
SELECT assign_permission('auditor_readonly', 'settings', 'view');

-- =====================================================
-- CLIENT PORTAL
-- =====================================================
SELECT assign_permission('client_portal', 'dashboard', 'view');
SELECT assign_permission('client_portal', 'clients', 'view');
SELECT assign_permission('client_portal', 'billing', 'view');
SELECT assign_permission('client_portal', 'tickets', 'view');
SELECT assign_permission('client_portal', 'tickets', 'create');
SELECT assign_permission('client_portal', 'tickets', 'edit');
SELECT assign_permission('client_portal', 'reports', 'view');

-- =====================================================
-- Verify assignments
-- =====================================================
SELECT 
    r.display_name as role,
    COUNT(*) as permission_count
FROM public.roles r
LEFT JOIN public.role_permissions rp ON rp.role_id = r.id
GROUP BY r.id, r.display_name
ORDER BY r.display_name;

-- Drop helper function
DROP FUNCTION assign_permission(TEXT, TEXT, TEXT);
