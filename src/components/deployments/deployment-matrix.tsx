'use client';

import { useEffect, useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Sun, Moon, MoreHorizontal, Loader2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SwapGuardDrawer } from './swap-guard-drawer';
import { RevokeDeploymentDialog } from './revoke-deployment-dialog';
import { createClient } from '@/lib/supabase/client';

interface BranchDeployment {
    id: string;
    client: string;
    branch: string;
    location: string;
    day_shift: { required: number; assigned: number };
    night_shift: { required: number; assigned: number };
    status: 'fully_deployed' | 'understaffed';
}

export function DeploymentMatrix() {
    const [matrixData, setMatrixData] = useState<BranchDeployment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDeploymentMatrix();
        
        // Set up real-time subscription
        const supabase = createClient();
        const channel = supabase
            .channel('deployment-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'guard_deployments' }, () => {
                loadDeploymentMatrix();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    async function loadDeploymentMatrix() {
        try {
            const supabase = createClient();

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('org_id')
                .eq('id', user.id)
                .single();

            if (!profile?.org_id) return;

            // Get all branches with client info
            const { data: branches } = await supabase
                .from('client_branches')
                .select(`
                    id,
                    branch_name,
                    branch_code,
                    address,
                    city,
                    required_guards,
                    client:clients(client_name)
                `)
                .eq('org_id', profile.org_id)
                .eq('status', 'active');

            if (!branches) return;

            // Get all active deployments for these branches
            const { data: deployments } = await supabase
                .from('guard_deployments')
                .select('branch_id, shift_type')
                .eq('org_id', profile.org_id)
                .in('status', ['active', 'planned']);

            // Calculate deployment stats for each branch
            const matrixRows: BranchDeployment[] = branches.map((branch: any) => {
                const branchDeployments = deployments?.filter(d => d.branch_id === branch.id) || [];
                
                const dayAssigned = branchDeployments.filter(d => d.shift_type === 'day' || d.shift_type === '24hour').length;
                const nightAssigned = branchDeployments.filter(d => d.shift_type === 'night' || d.shift_type === '24hour').length;
                
                // Assume half for day, half for night if required_guards specified
                const requiredPerShift = Math.ceil((branch.required_guards || 0) / 2);
                
                const totalAssigned = branchDeployments.length;
                const totalRequired = branch.required_guards || 0;
                const status = totalAssigned >= totalRequired ? 'fully_deployed' : 'understaffed';

                return {
                    id: branch.id,
                    client: branch.client?.client_name || 'Unknown',
                    branch: branch.branch_name,
                    location: `${branch.address || ''}, ${branch.city || ''}`.trim().replace(/^,\s*/, ''),
                    day_shift: { required: requiredPerShift, assigned: dayAssigned },
                    night_shift: { required: requiredPerShift, assigned: nightAssigned },
                    status,
                };
            });

            setMatrixData(matrixRows);
        } catch (error) {
            console.error('Error loading deployment matrix:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <Card className="shadow-sm">
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    if (matrixData.length === 0) {
        return (
            <Card className="shadow-sm">
                <CardContent className="flex items-center justify-center py-12">
                    <p className="text-muted-foreground">No deployment sites found. Add clients and branches first.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-medium">Deployment Matrix</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Deployment Site</TableHead>
                            <TableHead className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                    <Sun className="h-4 w-4" /> Day Shift
                                </div>
                            </TableHead>
                            <TableHead className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                    <Moon className="h-4 w-4" /> Night Shift
                                </div>
                            </TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {matrixData.map((site) => {
                            const dayStatus = site.day_shift.assigned >= site.day_shift.required ? 'text-success' : 'text-destructive';
                            const nightStatus = site.night_shift.assigned >= site.night_shift.required ? 'text-success' : 'text-destructive';

                            return (
                                <TableRow key={site.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{site.branch}</span>
                                            <span className="text-xs text-muted-foreground">{site.client}</span>
                                            {site.location && (
                                                <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                                                    <MapPin className="h-3 w-3" /> {site.location}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center">
                                            <span className={`font-mono font-medium ${dayStatus}`}>
                                                {site.day_shift.assigned}/{site.day_shift.required}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground uppercase">Guards</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center">
                                            <span className={`font-mono font-medium ${nightStatus}`}>
                                                {site.night_shift.assigned}/{site.night_shift.required}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground uppercase">Guards</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={site.status === 'fully_deployed' ? 'default' : 'destructive'} className="uppercase text-[10px]">
                                            {site.status === 'fully_deployed' ? 'Full' : 'Short'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                    <SwapGuardDrawer
                                                        trigger={
                                                            <span className="w-full cursor-pointer">Swap Guard</span>
                                                        }
                                                    />
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                    <RevokeDeploymentDialog
                                                        trigger={
                                                            <span className="w-full cursor-pointer">Revoke Deployment</span>
                                                        }
                                                    />
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>View Schedule</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
