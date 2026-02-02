import { Metadata } from 'next';
import { PageHeader } from '@/components/layout';
import { DashboardClient } from '@/components/dashboard/dashboard-client';

export const metadata: Metadata = {
    title: 'Dashboard',
    description: 'Overview of your security operations',
};

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Dashboard"
                description="Welcome back! Here's an overview of your security operations"
                breadcrumbs={[{ label: 'Dashboard' }]}
            />

            <DashboardClient />
        </div>
    );
}
