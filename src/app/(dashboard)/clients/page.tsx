import { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Search,
    Filter,
    Download,
} from 'lucide-react';
import { CreateClientDrawer } from '@/components/clients/create-client-drawer';
import { ClientsTable } from '@/components/clients/clients-table';
import { getClients, getClientsStats } from '@/lib/api/clients';

export const metadata: Metadata = {
    title: 'Clients',
    description: 'Manage clients and contracts',
};

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
    // Fetch clients and stats
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
                        <div className="text-2xl font-bold text-warning">
                            {stats.total_clients - stats.active_clients}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters & Search */}
            <Card className="shadow-sm">
                <CardContent className="pt-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input placeholder="Search clients, contact person..." className="pl-10" />
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
