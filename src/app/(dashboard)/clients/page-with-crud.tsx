'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
    Building2,
    MapPin,
    Phone,
    Plus
} from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { CreateClientDrawer } from '@/components/clients/create-client-drawer';
import { EditClientDrawer } from '@/components/clients/edit-client-drawer';
import { AddBranchDrawer } from '@/components/clients/add-branch-drawer';
import { getClients, getClientsStats } from '@/lib/api/clients';
import type { Client } from '@/types/client';

export default async function ClientsPage() {
    const clientsResponse = await getClients();
    const clients = clientsResponse.clients;
    const stats = await getClientsStats();

    return (
        <div className="space-y-6">
            <PageHeader
                title="Clients"
                description="Manage clients, branches, and service contracts"
                breadcrumbs={[{ label: 'Clients' }]}
                actions={
                    <>
                        <Button variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                        <CreateClientDrawer />
                    </>
                }
            />

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Clients
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total_clients}</div>
                        <p className="text-xs text-muted-foreground mt-1">All registered clients</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Active Clients
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-success">{stats.active_clients}</div>
                        <p className="text-xs text-muted-foreground mt-1">Currently active</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Branches
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">{stats.total_branches}</div>
                        <p className="text-xs text-muted-foreground mt-1">All locations</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Pending Setup
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Filters */}
            <Card className="shadow-sm">
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search clients, contact person..."
                                className="pl-10"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                                <Filter className="h-4 w-4 mr-2" />
                                Filters
                            </Button>
                            <Button variant="outline" size="sm">
                                Region
                            </Button>
                            <Button variant="outline" size="sm">
                                Status
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Clients Table */}
            <ClientsTable clients={clients} />
        </div>
    );
}

interface ClientsTableProps {
    clients: Client[];
}

function ClientsTable({ clients }: ClientsTableProps) {
    const [editClient, setEditClient] = useState<Client | null>(null);
    const [addBranchClient, setAddBranchClient] = useState<{ id: string; name: string } | null>(null);

    return (
        <>
            <Card className="shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Company</TableHead>
                                <TableHead>Contact Person</TableHead>
                                <TableHead>Region</TableHead>
                                <TableHead className="text-center">Branches</TableHead>
                                <TableHead className="text-center">Deployed Guards</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {clients && clients.length > 0 ? (
                                clients.map((client) => (
                                    <TableRow key={client.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <Link
                                                    href={`/clients/${client.id}`}
                                                    className="font-medium text-primary hover:underline flex items-center gap-2"
                                                >
                                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                                    {client.client_name}
                                                </Link>
                                                <span className="text-xs text-muted-foreground ml-6">
                                                    {client.client_code}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-sm">
                                                <span className="font-medium">
                                                    {client.primary_contact_name || 'N/A'}
                                                </span>
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Phone className="h-3 w-3" />
                                                    {client.primary_contact_phone || 'N/A'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <MapPin className="h-3 w-3" />
                                                {client.city || 'N/A'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className="font-mono">
                                                0
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className="font-mono">
                                                0
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                                                {client.status === 'active' ? 'Active' : client.status}
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
                                                        <Link href={`/clients/${client.id}`}>
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            View Details
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setEditClient(client)}>
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        Edit Client
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => setAddBranchClient({ id: client.id, name: client.client_name })}>
                                                        <Plus className="h-4 w-4 mr-2" />
                                                        Add Branch
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/clients/${client.id}?tab=contracts`}>
                                                            View Contracts
                                                        </Link>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                        No clients found. Create your first client to get started.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Edit Client Drawer */}
            {editClient && (
                <EditClientDrawer
                    client={editClient}
                    open={!!editClient}
                    onOpenChange={(open) => !open && setEditClient(null)}
                />
            )}

            {/* Add Branch Drawer */}
            {addBranchClient && (
                <AddBranchDrawer
                    clientId={addBranchClient.id}
                    clientName={addBranchClient.name}
                    open={!!addBranchClient}
                    onOpenChange={(open) => !open && setAddBranchClient(null)}
                />
            )}
        </>
    );
}
