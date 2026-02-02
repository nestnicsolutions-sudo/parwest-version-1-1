import { Metadata } from 'next';
import { PageHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    CheckCircle2,
    XCircle,
    Clock,
    FileText,
} from 'lucide-react';
import { ApprovalsTable } from '@/components/approvals/approvals-table';

export const metadata: Metadata = {
    title: 'Approval Center',
    description: 'Manage pending approvals',
};

export default function ApprovalsPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Approval Center"
                description="Review and manage pending approval requests"
                breadcrumbs={[{ label: 'Approval Center' }]}
            />

            <ApprovalsTable />
        </div>
    );
}
