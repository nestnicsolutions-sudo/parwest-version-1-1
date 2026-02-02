'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Sidebar, TopBar } from '@/components/layout';
import { createClient } from '@/lib/supabase/client';

interface AppShellProps {
    children: React.ReactNode;
    contextSidebar?: React.ReactNode;
}

export function AppShell({ children, contextSidebar }: AppShellProps) {
    const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
    const [userData, setUserData] = React.useState<{
        name: string;
        email: string;
        role: string;
        avatar?: string;
    } | null>(null);

    React.useEffect(() => {
        const fetchUserProfile = async () => {
            const supabase = createClient();
            
            console.log('🔍 [AppShell] Fetching user profile...');
            
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                console.warn('⚠️ [AppShell] No authenticated user found');
                return;
            }
            
            console.log('✅ [AppShell] User authenticated:', user.email);
            
            // Get user profile with role
            console.log('🔍 [AppShell] Querying profile for user:', user.id);
            
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('full_name, email, role, avatar_url, regional_office_id, org_id, phone, is_active')
                .eq('id', user.id)
                .single();
            
            if (error) {
                // Detailed error logging
                console.error('❌ [AppShell] Error fetching profile:');
                console.error('   Message:', error.message);
                console.error('   Code:', error.code);
                console.error('   Details:', error.details);
                console.error('   Hint:', error.hint);
                console.error('   User ID:', user.id);
                console.error('   User Email:', user.email);
                
                console.log('');
                console.log('⚠️ [AppShell] Troubleshooting steps:');
                console.log('1. Check if profiles table exists');
                console.log('2. Check if user has a profile record');
                console.log('3. Check RLS policies - Run debug-rls.sql in Supabase');
                console.log('4. Verify user is authenticated');
                console.log('');
                console.log('💡 Quick fix: Run this in Supabase SQL Editor:');
                console.log(`   SELECT * FROM public.profiles WHERE id = '${user.id}';`);
                
                // Set default data using auth user email
                setUserData({
                    name: user.email?.split('@')[0] || 'User',
                    email: user.email || '',
                    role: 'User',
                });
                return;
            }
            
            if (profile) {
                // Map role to display name
                const roleDisplayNames: Record<string, string> = {
                    'system_admin': 'System Admin',
                    'regional_manager': 'Regional Manager',
                    'hr_officer': 'HR Officer',
                    'ops_supervisor': 'Operations Supervisor',
                    'finance_officer': 'Finance Officer',
                    'inventory_officer': 'Inventory Officer',
                    'auditor_readonly': 'Auditor (Read-only)',
                    'client_portal': 'Client Portal',
                };
                
                const displayRole = roleDisplayNames[profile.role] || profile.role;
                
                console.log('✅ [AppShell] Profile loaded:', {
                    name: profile.full_name,
                    email: profile.email,
                    role: profile.role,
                    displayRole,
                });
                
                const userProfile = {
                    id: user.id,
                    email: profile.email,
                    full_name: profile.full_name || profile.email || 'User',
                    role: profile.role,
                    regional_office_id: profile.regional_office_id || null,
                    org_id: profile.org_id,
                    phone: profile.phone || null,
                    avatar_url: profile.avatar_url || null,
                    is_active: profile.is_active,
                };
                
                // Cache in sessionStorage for sidebar
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem('user_profile', JSON.stringify(userProfile));
                }
                
                setUserData({
                    name: profile.full_name || profile.email || 'User',
                    email: profile.email,
                    role: displayRole,
                    avatar: profile.avatar_url,
                });
            }
        };
        
        fetchUserProfile();
    }, []);

    return (
        <div className="min-h-screen bg-background">
            {/* Sidebar */}
            <Sidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            />

            {/* Main Content Area */}
            <div
                className={cn(
                    'flex flex-col transition-all duration-300',
                    sidebarCollapsed ? 'ml-[68px]' : 'ml-60'
                )}
            >
                {/* Top Bar */}
                <TopBar 
                    user={userData || undefined}
                />

                {/* Main + Context Sidebar */}
                <div className="flex flex-1">
                    {/* Main Workspace */}
                    <main className="flex-1 p-6 overflow-auto">
                        {children}
                    </main>

                    {/* Context Sidebar (Right Panel) */}
                    {contextSidebar}
                </div>
            </div>
        </div>
    );
}
