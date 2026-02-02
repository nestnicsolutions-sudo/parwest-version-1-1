-- Diagnostic script to check clients and branches
-- Run this and share the complete output

-- 1. Check all clients
SELECT 'CLIENTS' as section, 
       id, 
       client_name, 
       org_id, 
       created_at::date as created_date
FROM clients
ORDER BY created_at DESC;

-- 2. Check all branches with full details
SELECT 'BRANCHES' as section,
       id,
       branch_name,
       client_id,
       org_id,
       is_active,
       status,
       address,
       city,
       province,
       created_at::date as created_date
FROM client_branches
ORDER BY created_at DESC;

-- 3. Check client-branch relationships (JOIN to see which clients have branches)
SELECT 'CLIENT-BRANCH RELATIONSHIPS' as section,
       c.client_name,
       c.id as client_id,
       cb.branch_name,
       cb.id as branch_id,
       cb.is_active,
       cb.status
FROM clients c
LEFT JOIN client_branches cb ON c.id = cb.client_id
ORDER BY c.created_at DESC;

-- 4. Check the client_branches table structure
SELECT 'TABLE STRUCTURE' as section,
       column_name,
       data_type,
       is_nullable,
       column_default
FROM information_schema.columns
WHERE table_name = 'client_branches'
ORDER BY ordinal_position;

-- 5. Count summary
SELECT 'SUMMARY' as section,
       (SELECT COUNT(*) FROM clients) as total_clients,
       (SELECT COUNT(*) FROM client_branches) as total_branches,
       (SELECT COUNT(*) FROM client_branches WHERE is_active = true) as active_branches;
