# DATABASE DEPLOYMENT GUIDE

## 📋 Step-by-Step SQL Execution

Execute these SQL files in **EXACT** order in your Supabase SQL Editor:

### Step 1: RBAC Foundation (REQUIRED FIRST)
```sql
-- File: app/supabase-schema.sql
-- Creates: profiles, roles, permissions, role_permissions tables
-- Run this FIRST before anything else
```

Navigate to: `https://supabase.com/dashboard/project/qbkvryozojzzzhbwsxwf/sql/new`

1. Open `app/supabase-schema.sql`
2. Copy entire contents
3. Paste into SQL Editor
4. Click "Run"
5. Verify: Check Tables section - should see `profiles`, `roles`, `permissions`, `role_permissions`

### Step 2: Permission Assignments
```sql
-- File: app/supabase-permissions.sql
-- Creates: 143 role-permission mappings
-- Run this AFTER Step 1
```

1. Open `app/supabase-permissions.sql`
2. Copy entire contents
3. Paste into SQL Editor
4. Click "Run"
5. Verify: `SELECT COUNT(*) FROM role_permissions;` should return 143

### Step 3: Guards Module
```sql
-- File: app/database-schema-guards.sql
-- Creates: 6 tables (guards, guard_documents, guard_status_history, etc.)
-- Run this AFTER Steps 1 & 2
```

1. Open `app/database-schema-guards.sql`
2. Copy entire contents
3. Paste into SQL Editor
4. Click "Run"
5. Verify: Check Tables - should see all 6 guards tables

### Step 4: All Other Modules
```sql
-- File: app/database-schema-all-modules.sql
-- Creates: 12 tables for Clients, Deployments, Attendance, Payroll, Billing, Inventory, Tickets
-- Run this AFTER Steps 1, 2, 3
```

1. Open `app/database-schema-all-modules.sql`
2. Copy entire contents
3. Paste into SQL Editor
4. Click "Run"
5. Verify: Check Tables - should see all module tables

## ✅ Verification Checklist

After all scripts run successfully, verify:

- [ ] **RBAC Tables** (4 tables)
  - profiles
  - roles (8 rows)
  - permissions (48 rows)
  - role_permissions (143 rows)

- [ ] **Guards Module** (6 tables)
  - guards
  - guard_documents
  - guard_status_history
  - guard_verifications
  - guard_loans
  - guard_clearance

- [ ] **Clients Module** (3 tables)
  - clients
  - client_branches
  - client_contracts

- [ ] **Deployments Module** (1 table)
  - guard_deployments

- [ ] **Attendance Module** (1 table)
  - attendance_records

- [ ] **Payroll Module** (2 tables)
  - payroll_cycles
  - payroll_items

- [ ] **Billing Module** (2 tables)
  - invoices
  - invoice_items

- [ ] **Inventory Module** (2 tables)
  - inventory_items
  - inventory_transactions

- [ ] **Tickets Module** (1 table)
  - tickets

**Total: 22 tables**

## 🔍 Verification SQL

Run this to verify all tables exist:

```sql
SELECT 
  schemaname, 
  tablename 
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN (
    -- RBAC
    'profiles', 'roles', 'permissions', 'role_permissions',
    -- Guards
    'guards', 'guard_documents', 'guard_status_history', 
    'guard_verifications', 'guard_loans', 'guard_clearance',
    -- Clients
    'clients', 'client_branches', 'client_contracts',
    -- Deployments
    'guard_deployments',
    -- Attendance
    'attendance_records',
    -- Payroll
    'payroll_cycles', 'payroll_items',
    -- Billing
    'invoices', 'invoice_items',
    -- Inventory
    'inventory_items', 'inventory_transactions',
    -- Tickets
    'tickets'
  )
ORDER BY tablename;
```

Should return 22 rows.

## 🚨 Troubleshooting

### Error: "relation does not exist"
- **Cause**: Running scripts out of order
- **Fix**: Start over from Step 1

### Error: "duplicate key value"
- **Cause**: Script already ran
- **Fix**: Skip that script or use `DROP TABLE IF EXISTS` first

### Error: "permission denied"
- **Cause**: Using anon key instead of service role
- **Fix**: Make sure you're logged into Supabase dashboard

## 📝 Post-Deployment

After successful deployment:

1. **Test Authentication**: Login with test users
2. **Verify RLS**: Check that users can only see their org data
3. **Test Permissions**: Verify role-based access works
4. **Create Sample Data**: Use the app to create test guards, clients, etc.

## 🔗 Quick Links

- Supabase Dashboard: https://supabase.com/dashboard/project/qbkvryozojzzzhbwsxwf
- SQL Editor: https://supabase.com/dashboard/project/qbkvryozojzzzhbwsxwf/sql/new
- Table Editor: https://supabase.com/dashboard/project/qbkvryozojzzzhbwsxwf/editor

## ⚡ Quick Deploy (All at Once)

If you want to run everything in one go, concatenate files in this order:

```bash
cat app/supabase-schema.sql \
    app/supabase-permissions.sql \
    app/database-schema-guards.sql \
    app/database-schema-all-modules.sql > deploy-all.sql
```

Then run `deploy-all.sql` in Supabase SQL Editor.

**Warning**: This will take a few seconds. Wait for completion!
