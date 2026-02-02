import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    ChevronLeft,
    Building2,
    MapPin,
    Phone,
    Mail,
    Plus
} from 'lucide-react';
import { ClientOverview } from '@/components/clients/client-overview';
import { ClientBranches } from '@/components/clients/client-branches';
import { getClientById } from '@/lib/api/clients';
import { AddBranchDialog } from '@/components/clients/add-branch-dialog';

export const metadata: Metadata = {
    title: 'Client Details',
    description: 'View client information and contracts',
};

export const dynamic = 'force-dynamic';

export default async function ClientDetailsPage({ 
    params 
}: { 
    params: Promise<{ id: string }> 
}) {
    const { id } = await params;
    const clientDetail = await getClientById(id);
    
    if (!clientDetail) {
        notFound();
    }

    return (
        <div className="space-y-6">
            {/* Custom Breadcrumb Back Link */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link href="/clients" className="hover:text-primary flex items-center gap-1 transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                    Back to Clients
                </Link>
            </div>

            <div className="flex flex-col md:flex-row gap-6 md:items-start md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        {clientDetail.client_name}
                        <Badge variant={clientDetail.status === 'active' ? 'default' : 'secondary'} className="text-sm font-normal">
                            {clientDetail.status}
                        </Badge>
                    </h1>
                    <div className="text-muted-foreground mt-2 flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                            <Building2 className="h-4 w-4" /> {clientDetail.client_code}
                        </span>
                        <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" /> {clientDetail.city || 'N/A'}
                        </span>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline">Edit Details</Button>
                    <AddBranchDialog clientId={clientDetail.id} clientName={clientDetail.client_name} />
                </div>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-5 lg:w-[600px]">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="branches">
                        Branches ({clientDetail.total_branches})
                    </TabsTrigger>
                    <TabsTrigger value="contracts">Contracts</TabsTrigger>
                    <TabsTrigger value="guards">
                        Guards ({clientDetail.active_guards})
                    </TabsTrigger>
                    <TabsTrigger value="invoices">Invoices</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-6">
                    <ClientOverview client={clientDetail} />
                </TabsContent>

                {/* Branches Tab */}
                <TabsContent value="branches" className="mt-6">
                    <ClientBranches clientId={clientDetail.id} branches={clientDetail.branches} />
                </TabsContent>

                {/* Placeholders */}
                {['contracts', 'guards', 'invoices'].map((tab) => (
                    <TabsContent key={tab} value={tab} className="mt-6">
                        <Card>
                            <CardContent className="py-12 text-center text-muted-foreground">
                                <p className="capitalize">{tab} module coming soon.</p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
