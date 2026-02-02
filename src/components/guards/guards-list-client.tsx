/**
 * Guards List Client Component
 * Uses React Query for instant loads and background sync
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Search,
    Filter,
    Download,
    MoreHorizontal,
    Eye,
    Edit,
    MapPin,
    FileText,
    Loader2,
    AlertCircle,
    Ban,
    CheckCircle,
} from 'lucide-react';
import { useGuards } from '@/lib/hooks/use-guards';
import type { Guard } from '@/types/guard';

const statusStyles: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    active: { label: 'Active', variant: 'default' },
    deployed: { label: 'Deployed', variant: 'default' },
    pending_deployment: { label: 'Pending', variant: 'secondary' },
    suspended: { label: 'Suspended', variant: 'destructive' },
    terminated: { label: 'Terminated', variant: 'outline' },
    applicant: { label: 'Pending Approval', variant: 'secondary' },
    screening: { label: 'Under Screening', variant: 'secondary' },
    approved: { label: 'Approved', variant: 'default' },
    onboarding: { label: 'Onboarding', variant: 'default' },
    archived: { label: 'Archived', variant: 'outline' },
};

export function GuardsListClient() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    
    // Fetch guards with React Query - instant from cache, background sync
    const { data, isLoading, isFetching, error } = useGuards({
        page: 1,
        limit: 100, // Load more at once
        search: searchTerm || undefined,
        status: statusFilter as any,
    });

    const guards = data?.data || [];

    // Calculate stats from cached data
    const stats = useMemo(() => ({
        total: guards.length,
        active: guards.filter((g: Guard) => g.status === 'approved' || g.status === 'active').length,
        pending: guards.filter((g: Guard) => g.status === 'applicant').length,
        blacklisted: guards.filter((g: Guard) => g.blacklisted).length,
    }), [guards]);

    // Client-side filtering for instant response
    const filteredGuards = useMemo(() => {
        return guards;
    }, [guards]);

    return (
        <>
            {/* Stats Cards */}
            <div className="grid gap-6 md:grid-cols-4 mb-8">
                <Card className="group relative overflow-hidden border-0 bg-white/80 backdrop-blur-sm shadow-lg shadow-slate-200/50 transition-all duration-300 hover:shadow-xl hover:shadow-slate-300/50 hover:-translate-y-1">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <CardHeader className="pb-3 relative z-10">
                        <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                            Total Guards
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-3xl font-bold bg-gradient-to-br from-slate-900 to-slate-700 bg-clip-text text-transparent">
                            {isLoading ? (
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            ) : (
                                stats.total
                            )}
                        </div>
                        {isFetching && !isLoading && (
                            <p className="text-xs text-muted-foreground mt-1">Syncing...</p>
                        )}
                    </CardContent>
                </Card>
                <Card className="group relative overflow-hidden border-0 bg-white/80 backdrop-blur-sm shadow-lg shadow-slate-200/50 transition-all duration-300 hover:shadow-xl hover:shadow-green-200/50 hover:-translate-y-1">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <CardHeader className="pb-3 relative z-10">
                        <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                            Active
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-3xl font-bold text-green-600">
                            {isLoading ? (
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            ) : (
                                stats.active
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card className="group relative overflow-hidden border-0 bg-white/80 backdrop-blur-sm shadow-lg shadow-slate-200/50 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-200/50 hover:-translate-y-1">
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <CardHeader className="pb-3 relative z-10">
                        <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                            Pending Deployment
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-3xl font-bold text-yellow-600">
                            {isLoading ? (
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            ) : (
                                stats.pending
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card className="group relative overflow-hidden border-0 bg-white/80 backdrop-blur-sm shadow-lg shadow-red-200/30 transition-all duration-300 hover:shadow-xl hover:shadow-red-300/50 hover:-translate-y-1">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <CardHeader className="pb-3 relative z-10">
                        <CardTitle className="text-sm font-semibold text-red-600 uppercase tracking-wide">
                            Blacklisted
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-3xl font-bold text-red-600">
                            {isLoading ? (
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            ) : (
                                stats.blacklisted
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters & Search */}
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg shadow-slate-200/50 mb-6">
                <CardContent className="pt-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <Input 
                                placeholder="Search by name, CNIC, ID..." 
                                className="pl-12 h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white rounded-xl"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="rounded-xl border-slate-200 hover:bg-slate-50 hover:border-slate-300">
                                <Filter className="h-4 w-4 mr-2" />
                                Filters
                            </Button>
                            <Button variant="outline" size="sm" className="rounded-xl border-slate-200 hover:bg-slate-50 hover:border-slate-300">
                                Status
                            </Button>
                            <Button variant="outline" size="sm" className="rounded-xl border-slate-200 hover:bg-slate-50 hover:border-slate-300">
                                Region
                            </Button>
                            <Button variant="outline" size="sm" className="rounded-xl border-slate-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600">
                                <Download className="h-4 w-4 mr-2" />
                                Export
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Guards Table */}
            <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg shadow-slate-200/50">
                <CardContent className="p-0">
                    {error && (
                        <div className="p-4 text-center text-destructive">
                            Error loading guards. Please try again.
                        </div>
                    )}
                    
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Guard ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>CNIC</TableHead>
                                <TableHead>Designation</TableHead>
                                <TableHead>Region</TableHead>
                                <TableHead>Current Deployment</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground mt-2">Loading guards...</p>
                                    </TableCell>
                                </TableRow>
                            ) : filteredGuards.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                        {searchTerm ? 'No guards found matching your search.' : 'No guards found. Create your first guard to get started.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredGuards.map((guard: Guard) => (
                                    <TableRow key={guard.id}>
                                        <TableCell className="font-medium">{guard.guard_code}</TableCell>
                                        <TableCell>
                                            <Link
                                                href={`/guards/${guard.id}`}
                                                className="font-medium text-primary hover:underline"
                                            >
                                                {guard.first_name} {guard.last_name}
                                            </Link>
                                            <p className="text-xs text-muted-foreground">{guard.phone}</p>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">{guard.cnic}</TableCell>
                                        <TableCell>{guard.designation || '—'}</TableCell>
                                        <TableCell>—</TableCell>
                                        <TableCell>
                                            <span className="text-sm text-muted-foreground">—</span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {guard.blacklisted && (
                                                    <Badge variant="destructive" className="gap-1">
                                                        <Ban className="h-3 w-3" />
                                                        Blacklisted
                                                    </Badge>
                                                )}
                                                {!guard.blacklisted && (
                                                    <Badge variant={statusStyles[guard.status]?.variant || 'secondary'}>
                                                        {statusStyles[guard.status]?.label || guard.status}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/guards/${guard.id}`}>
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            View Case File
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        disabled={guard.blacklisted || guard.status !== 'approved'}
                                                        title={guard.blacklisted ? 'Cannot deploy blacklisted guard' : guard.status !== 'approved' ? 'Guard must be approved before deployment' : ''}
                                                    >
                                                        <MapPin className="h-4 w-4 mr-2" />
                                                        Deploy
                                                        {(guard.blacklisted || guard.status !== 'approved') && (
                                                            <AlertCircle className="h-3 w-3 ml-auto text-destructive" />
                                                        )}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                        <FileText className="h-4 w-4 mr-2" />
                                                        Upload Document
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    {guard.blacklisted ? (
                                                        <DropdownMenuItem
                                                            className="text-green-600"
                                                            onClick={async () => {
                                                                if (confirm('Remove this guard from blacklist?')) {
                                                                    const { unblacklistGuard } = await import('@/lib/api/guards');
                                                                    const result = await unblacklistGuard(guard.id);
                                                                    if (result.success) {
                                                                        window.location.reload();
                                                                    } else {
                                                                        alert('Error: ' + result.error);
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            <CheckCircle className="h-4 w-4 mr-2" />
                                                            Remove from Blacklist
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={async () => {
                                                                const reason = prompt('Reason for blacklisting this guard:');
                                                                if (reason) {
                                                                    const { blacklistGuard } = await import('@/lib/api/guards');
                                                                    const result = await blacklistGuard(guard.id, reason);
                                                                    if (result.success) {
                                                                        window.location.reload();
                                                                    } else {
                                                                        alert('Error: ' + result.error);
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            <Ban className="h-4 w-4 mr-2" />
                                                            Blacklist Guard
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </>
    );
}
