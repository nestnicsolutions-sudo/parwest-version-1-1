'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
    MoreHorizontal,
    Eye,
    Edit,
    Building2,
    MapPin,
    Phone,
    Plus
} from 'lucide-react';
import { EditClientDrawer } from '@/components/clients/edit-client-drawer';
import { AddBranchDrawer } from '@/components/clients/add-branch-drawer';
import type { Client } from '@/types/client';

interface ClientsTableProps {
    clients: Client[];
}

export function ClientsTable({ clients }: ClientsTableProps) {
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
