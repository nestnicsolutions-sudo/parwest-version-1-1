-- Update the approval request to match the users' org_id
UPDATE approval_requests
SET org_id = '00000000-0000-0000-0000-000000000000'::uuid
WHERE org_id != '00000000-0000-0000-0000-000000000000'::uuid;

-- Verify it's fixed
SELECT 
    id,
    title,
    requested_by_name,
    org_id,
    status,
    created_at
FROM approval_requests;
