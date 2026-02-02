-- =====================================================
-- Sync User Profiles Script
-- Run this to create missing profiles for existing users
-- =====================================================

-- Insert profiles for users that don't have them yet
INSERT INTO public.profiles (id, email, full_name, role, org_id, is_active, created_at, updated_at)
SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) as full_name,
    COALESCE(u.raw_user_meta_data->>'role', 'system_admin') as role,
    COALESCE((u.raw_user_meta_data->>'org_id')::UUID, uuid_generate_v4()) as org_id,
    true as is_active,
    u.created_at,
    NOW()
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

-- Verify the sync
SELECT 
    u.email,
    p.full_name,
    p.role,
    CASE WHEN p.id IS NULL THEN 'Missing Profile' ELSE 'Profile Exists' END as status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC;
