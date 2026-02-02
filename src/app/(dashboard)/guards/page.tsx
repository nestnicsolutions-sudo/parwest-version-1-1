import { Metadata } from 'next';
import { PageHeader } from '@/components/layout';
import { ProtectedButton } from '@/components/ui/protected-button';
import { Download } from 'lucide-react';
import { CreateGuardDrawer } from '@/components/guards/create-guard-drawer';
import { GuardsListClient } from '@/components/guards/guards-list-client';

export const metadata: Metadata = {
    title: 'Guards | Parwest ERP',
    description: 'Manage security guards',
};

export default function GuardsPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Guards"
                description="Manage security guards across all regions"
                breadcrumbs={[{ label: 'Guards' }]}
                actions={
                    <>
                        <ProtectedButton
                            module="guards"
                            action="export"
                            variant="outline"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </ProtectedButton>
                        <CreateGuardDrawer />
                    </>
                }
            />

            <GuardsListClient />
        </div>
    );
}
