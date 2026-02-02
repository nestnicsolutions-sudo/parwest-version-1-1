import { Metadata } from 'next';
import { PageHeader } from '@/components/layout';
import { ClientsListClient } from '@/components/clients/clients-list-client';

export const metadata: Metadata = {
    title: 'Clients',
    description: 'Manage clients and contracts',
};

export default function ClientsPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Clients"
                description="Manage clients and contracts"
                breadcrumbs={[{ label: 'Clients' }]}
            />

            <ClientsListClient />
        </div>
    );
}
