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
} from 'lucide-react';
import { useGuards } from '@/lib/hooks/use-guards';
import type { Guard } from '@/types/guard';

const statusStyles: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    active: { label: 'Active', variant: 'default' },
    deployed: { label: 'Deployed', variant: 'default' },
    pending_deployment: { label: 'Pending', variant: 'secondary' },
    suspended: { label: 'Suspended', variant: 'destructive' },
    terminated: { label: 'Terminated', variant: 'outline' },
    applicant: { label: 'Applicant', variant: 'secondary' },
    approved: { label: 'Approved', variant: 'default' },
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
        verification: guards.filter((g: Guard) => 
            g.police_verification_status !== 'approved' || 
            g.medical_certificate_status !== 'approved'
        ).length,
    }), [guards]);

    // Client-side filtering for instant response
    const filteredGuards = useMemo(() => {
        return guards;
    }, [guards]);

    return (
        <>
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Guards
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
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
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Active
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-success">
                            {isLoading ? (
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            ) : (
                                stats.active
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Pending Deployment
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-warning">
                            {isLoading ? (
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            ) : (
                                stats.pending
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Verification Pending
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-info">
                            {isLoading ? (
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            ) : (
                                stats.verification
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters & Search */}
            <Card className="shadow-sm">
                <CardContent className="pt-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input 
                                placeholder="Search by name, CNIC, ID..." 
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                                <Filter className="h-4 w-4 mr-2" />
                                Filters
                            </Button>
                            <Button variant="outline" size="sm">
                                Status
                            </Button>
                            <Button variant="outline" size="sm">
                                Region
                            </Button>
                            <Button variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-2" />
                                Export
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Guards Table */}
            <Card className="shadow-sm">
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
                                            <Badge variant={statusStyles[guard.status]?.variant || 'secondary'}>
                                                {statusStyles[guard.status]?.label || guard.status}
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
                                                    <DropdownMenuItem>
                                                        <MapPin className="h-4 w-4 mr-2" />
                                                        Deploy
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                        <FileText className="h-4 w-4 mr-2" />
                                                        Upload Document
                                                    </DropdownMenuItem>
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
