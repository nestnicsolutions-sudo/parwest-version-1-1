# Guards Workflow - Complete Process Flow

## 🔄 Complete Guard Lifecycle

### Phase 1: Guard Creation (Supervisor Portal)
**Who:** `ops_supervisor`, `hr_officer`, `regional_manager`, `system_admin`

1. **Supervisor adds new guard**
   - Opens "Add New Guard" drawer
   - Fills in all required information (personal, contact, documents)
   - Clicks "Submit"

2. **System creates guard record**
   - Status: `applicant`
   - Guard saved to database with `blacklisted: false`
   - Guard assigned to supervisor's organization (`org_id`)
   - Guard code auto-generated (e.g., `GRD123456`)

3. **System creates approval request**
   - Type: `guard_enrollment`
   - Status: `pending`
   - Links to the guard record via `entity_id`
   - Requested by: Supervisor's user ID

4. **Confirmation**
   - Success message shown to supervisor
   - Guard appears in guards list with **"Pending Approval"** badge

---

### Phase 2: Admin Approval
**Who:** `system_admin`, `regional_manager`, `hr_officer`

1. **Admin views approval requests**
   - Goes to `/approvals` page
   - Sees pending guard enrollment requests
   - Can view all guard details

2. **Admin reviews and decides**
   - **Option A: APPROVE**
     - Clicks "Approve" button
     - System updates guard status: `applicant` → `approved`
     - System marks approval request: `pending` → `approved`
     - System sets `documents_verified: true`
     - Guard now appears with **"Approved"** badge
   
   - **Option B: REJECT**
     - Clicks "Reject" button
     - Provides rejection reason
     - System marks approval request: `pending` → `rejected`
     - Guard remains with **"Pending Approval"** badge
     - Guard CANNOT be deployed

---

### Phase 3: Guard Status Updates
**Status Progression:**
```
applicant (Pending Approval)
    ↓ [Admin Approves]
approved (Approved)
    ↓ [HR Updates]
onboarding (Onboarding)
    ↓ [Training Complete]
active (Active)
    ↓ [If Issues]
suspended (Suspended) OR blacklisted (Blacklisted)
```

---

### Phase 4: Deployment (After Approval)
**Who:** `ops_supervisor`, `regional_manager`

1. **Supervisor deploys guard**
   - Guard must be in `approved` status
   - Guard must NOT be blacklisted
   - Supervisor selects client and branch
   - System creates deployment record

2. **Deployment validation**
   - ✅ Status = `approved`? → Can deploy
   - ❌ Status = `applicant`? → Cannot deploy (pending approval)
   - ❌ Status = `suspended`? → Cannot deploy (suspended)
   - ❌ Blacklisted = `true`? → Cannot deploy (blacklisted)

---

### Phase 5: Blacklist Management
**Who:** `system_admin`, `regional_manager`, `hr_officer`

1. **Blacklist a guard**
   - Right-click guard in list → "Blacklist Guard"
   - Enter reason (required)
   - System updates:
     - `blacklisted: true`
     - `blacklisted_reason: "Reason text"`
     - `blacklisted_at: timestamp`
     - `blacklisted_by: admin_user_id`
   - Guard shows **red "Blacklisted"** badge
   - Deploy button disabled with warning

2. **Remove from blacklist**
   - Right-click blacklisted guard → "Remove from Blacklist"
   - System updates:
     - `blacklisted: false`
     - Clears blacklist fields
   - Guard can be deployed again (if approved)

---

## 🔒 Permission Matrix

| Action | ops_supervisor | hr_officer | regional_manager | system_admin |
|--------|---------------|------------|------------------|--------------|
| View guards | ✅ (own org) | ✅ (own org) | ✅ (own org) | ✅ (all) |
| Create guards | ✅ | ✅ | ✅ | ✅ |
| Update guards | ✅ (own org) | ✅ (own org) | ✅ (own org) | ✅ (all) |
| Delete guards | ❌ | ❌ | ❌ | ✅ |
| Approve guards | ❌ | ✅ | ✅ | ✅ |
| Deploy guards | ✅ | ✅ | ✅ | ✅ |
| Blacklist guards | ❌ | ✅ | ✅ | ✅ |

---

## 📊 Guards List Dashboard

### Stats Cards
1. **Total Guards** - Count of all guards in organization
2. **Active** - Guards with status `approved` or `active`
3. **Pending Deployment** - Guards with status `applicant`
4. **Blacklisted** - Guards with `blacklisted: true` (red card)

### Guard Status Badges
- 🟡 **Pending Approval** (applicant) - Yellow badge, awaiting admin approval
- 🟢 **Approved** (approved) - Green badge, ready for deployment
- 🔵 **Onboarding** (onboarding) - Blue badge, in training
- 🟢 **Active** (active) - Green badge, currently deployed
- 🟠 **Suspended** (suspended) - Orange badge, temporarily inactive
- 🔴 **Blacklisted** (blacklisted: true) - Red badge, cannot deploy
- ⚫ **Terminated** (terminated) - Gray badge, employment ended
- ⚫ **Archived** (archived) - Gray badge, historical record

---

## 🔄 Auto-Sync Behavior

### React Query Caching (Instant Loading)
- **First load:** ~300-500ms (fetches from database)
- **Subsequent loads:** <50ms (serves from browser cache)
- **Cache duration:** 10 minutes (stale time)
- **Background refresh:** Automatic every 10 minutes
- **Manual refresh:** Pull-to-refresh or invalidate queries

### When Data Syncs
1. **After creating guard:** Guards list auto-refreshes
2. **After approval:** Approval list AND guards list refresh
3. **After update:** Specific guard details + guards list refresh
4. **After blacklist:** Guards list refreshes with updated badge
5. **On page focus:** Background refetch if data is stale

### Manual Refresh
- User can click refresh button (if provided)
- System automatically syncs in background
- No loading spinners on cached data

---

## 🚀 Deployment Rules

### Guards Eligible for Deployment
✅ Status: `approved` OR `active`  
✅ Blacklisted: `false`  
✅ Documents verified: `true`  
✅ Not currently deployed (no active deployment)

### Guards NOT Eligible for Deployment
❌ Status: `applicant` (pending approval)  
❌ Status: `suspended` (suspended by admin)  
❌ Status: `terminated` (employment ended)  
❌ Blacklisted: `true` (blacklisted by admin)  
❌ Already deployed (has active deployment)

### Deploy Button States
- **Enabled:** Green, clickable, shows "Deploy"
- **Disabled + Warning:** Gray, shows alert icon, tooltip explains why

---

## 🛠️ Technical Implementation

### Database Tables
- `guards` - Main guard records
- `approval_requests` - Approval workflow
- `guard_deployments` - Deployment history

### Key Fields
```typescript
// guards table
{
  id: UUID
  guard_code: string (unique)
  status: 'applicant' | 'approved' | 'active' | ...
  blacklisted: boolean
  blacklisted_reason: string?
  org_id: UUID (organization isolation)
  created_by: UUID (audit trail)
}

// approval_requests table
{
  id: UUID
  entity_type: 'guard_enrollment'
  entity_id: UUID (guard.id)
  status: 'pending' | 'approved' | 'rejected'
  requested_by: UUID
  approved_by: UUID?
}
```

### RLS Policies
- Supervisors can CREATE/UPDATE guards in their org
- All users can VIEW guards in their org
- Only system_admin can DELETE guards
- Admins/Managers can APPROVE/REJECT requests

---

## 📝 SQL Files

### Setup Files
1. **complete-database-setup.sql** - Full database schema with RLS
2. **fix-guards-rls-policies.sql** - RLS policy fixes for supervisors
3. **add-blacklist-feature.sql** - Blacklist columns

### Run Order (First Time Setup)
```bash
1. Run: complete-database-setup.sql
2. Run: add-blacklist-feature.sql (if not in complete setup)
3. Run: fix-guards-rls-policies.sql (fixes supervisor permissions)
```

### Run Order (Fixing Existing Database)
```bash
1. Run: fix-guards-rls-policies.sql
2. Run: add-blacklist-feature.sql
```

---

## ✅ Verification Checklist

### Supervisor Can:
- [ ] View guards in their organization
- [ ] Create new guards (status: applicant)
- [ ] Update guard details
- [ ] See "Pending Approval" badge for new guards
- [ ] Cannot deploy unapproved guards

### Admin Can:
- [ ] View all approval requests
- [ ] Approve guard enrollments
- [ ] Reject guard enrollments
- [ ] See guards change status after approval
- [ ] Blacklist/unblacklist guards

### System Should:
- [ ] Auto-refresh guards list after changes
- [ ] Show correct status badges
- [ ] Disable deploy button for ineligible guards
- [ ] Display blacklist badge prominently
- [ ] Cache data for instant subsequent loads
- [ ] Sync in background without blocking UI

---

## 🐛 Troubleshooting

### Error: "new row violates row-level security policy"
**Cause:** Missing RLS policy for user's role  
**Solution:** Run `fix-guards-rls-policies.sql`

### Guards not showing after creation
**Cause:** Cache not invalidated  
**Solution:** System auto-invalidates, check React Query DevTools

### Cannot deploy approved guard
**Cause:** Guard might be blacklisted or already deployed  
**Solution:** Check blacklist status and deployment history

### Approval not updating guard status
**Cause:** Approval action not updating guard record  
**Solution:** Check `src/lib/actions/approvals.ts` - should UPDATE guard.status

---

## 📞 Support

For issues or questions:
1. Check React Query DevTools (shows cache status)
2. Check browser console for errors
3. Verify RLS policies in Supabase
4. Check user role and permissions
