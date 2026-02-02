import { Metadata } from 'next';
import { PageHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProtectedButton } from '@/components/ui/protected-button';
import { Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DeploymentMatrix } from '@/components/deployments/deployment-matrix';
import { DeployGuardDrawer } from '@/components/deployments/deploy-guard-drawer';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
    title: 'Deployments',
    description: 'Manage guard deployments',
};

export const dynamic = 'force-dynamic';

async function getDeploymentStats() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

    if (!profile?.org_id) return null;

    // Get total requirements from branches
    const { data: branches } = await supabase
        .from('client_branches')
        .select('required_guards')
        .eq('org_id', profile.org_id)
        .eq('status', 'active');

    const totalRequired = branches?.reduce((sum, b) => sum + (b.required_guards || 0), 0) || 0;

    // Get active deployments count
    const { count: activeDeployments } = await supabase
        .from('guard_deployments')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', profile.org_id)
        .in('status', ['active', 'planned']);

    const filled = activeDeployments || 0;
    const openSlots = Math.max(0, totalRequired - filled);
    const fillRate = totalRequired > 0 ? ((filled / totalRequired) * 100).toFixed(1) : '0.0';

    return {
        totalRequired,
        filled,
        openSlots,
        fillRate,
    };
}

export default async function DeploymentsPage() {
    const stats = await getDeploymentStats();

    return (
        <div className="space-y-6">
            <PageHeader
                title="Deployments"
                description="Manage guard deployments and roster matrix"
                breadcrumbs={[{ label: 'Deployments' }]}
                actions={
                    <>
                        <ProtectedButton
                            module="deployments"
                            action="export"
                            variant="outline"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Export Roster
                        </ProtectedButton>
                        <DeployGuardDrawer />
                    </>
                }
            />

            {/* Deployment Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Requirements
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalRequired || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total guard slots</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Fill Rate
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-success">{stats?.fillRate || 0}%</div>
                        <div className="flex items-center text-xs text-success mt-1">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {stats?.filled || 0} / {stats?.totalRequired || 0} Filled
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Open Slots
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">{stats?.openSlots || 0}</div>
                        <div className="flex items-center text-xs text-destructive mt-1">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {stats?.openSlots ? 'Action Required' : 'All Filled'}
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Active Guards
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.filled || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Currently deployed</p>
                    </CardContent>
                </Card>
            </div>

            {/* Matrix Component */}
            <DeploymentMatrix />
        </div>
    );
}
