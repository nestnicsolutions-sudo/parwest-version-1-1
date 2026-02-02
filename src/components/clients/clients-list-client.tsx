/**
 * Clients List Client Component
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
    Search,
    Filter,
    Download,
    Loader2,
    Building2,
    Users,
    TrendingUp,
} from 'lucide-react';
import { useClients, useClientsStats } from '@/lib/hooks/use-clients';
import { CreateClientDrawer } from '@/components/clients/create-client-drawer';

const statusStyles: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    prospect: { label: 'Prospect', variant: 'secondary' },
    active: { label: 'Active', variant: 'default' },
    suspended: { label: 'Suspended', variant: 'destructive' },
    inactive: { label: 'Inactive', variant: 'outline' },
};

export function ClientsListClient() {
    const [searchTerm, setSearchTerm] = useState('');
    
    // Fetch data with React Query - instant from cache
    const { data, isLoading, isFetching } = useClients(
        searchTerm ? { search: searchTerm } : undefined,
        1,
        100
    );
    const { data: stats, isLoading: statsLoading } = useClientsStats();

    const clients = data?.clients || [];

    return (
        <>
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Total Clients
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {statsLoading ? (
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            ) : (
                                stats?.total_clients || 0
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Total Branches
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {statsLoading ? (
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            ) : (
                                stats?.total_branches || 0
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Active Clients
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-success">
                            {statsLoading ? (
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            ) : (
                                stats?.active_clients || 0
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
                                placeholder="Search clients..." 
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
                                <Download className="h-4 w-4 mr-2" />
                                Export
                            </Button>
                            <CreateClientDrawer />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Clients Table */}
            <Card className="shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Client Code</TableHead>
                                <TableHead>Client Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>City</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground mt-2">Loading clients...</p>
                                    </TableCell>
                                </TableRow>
                            ) : clients.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                        {searchTerm ? 'No clients found matching your search.' : 'No clients found. Create your first client to get started.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                clients.map((client: any) => (
                                    <TableRow key={client.id}>
                                        <TableCell className="font-medium">{client.client_code}</TableCell>
                                        <TableCell>
                                            <Link
                                                href={`/clients/${client.id}`}
                                                className="font-medium text-primary hover:underline"
                                            >
                                                {client.client_name}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="capitalize">{client.client_type || '—'}</TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <div>{client.primary_contact_name || '—'}</div>
                                                <div className="text-muted-foreground">{client.primary_contact_phone || '—'}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{client.city || '—'}</TableCell>
                                        <TableCell>
                                            <Badge variant={statusStyles[client.status]?.variant || 'secondary'}>
                                                {statusStyles[client.status]?.label || client.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    {isFetching && !isLoading && (
                        <div className="px-4 py-2 text-xs text-muted-foreground text-center border-t">
                            Syncing latest data...
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
}
