-- Fix org_id mismatch by setting all users to the same org_id
-- First, check what org_ids exist
SELECT DISTINCT org_id FROM profiles;

-- Option 1: Update all users to use the same org_id
-- Replace 'YOUR_ORG_ID_HERE' with the org_id you want to use
UPDATE profiles 
SET org_id = '00000000-0000-0000-0000-000000000000'::uuid
WHERE org_id IS NOT NULL;

-- Also update the approval request to match
UPDATE approval_requests
SET org_id = '00000000-0000-0000-0000-000000000000'::uuid;

-- Verify all users now have the same org_id
SELECT 
    email,
    full_name,
    role,
    org_id
FROM profiles
ORDER BY role;
