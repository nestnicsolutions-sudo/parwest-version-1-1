'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Download, Calendar as CalendarIcon, Filter, RefreshCw } from 'lucide-react';
import { AttendanceStats } from '@/components/attendance/attendance-stats-dynamic';
import { BranchAttendanceTable } from '@/components/attendance/branch-attendance-table-dynamic';
import { AttendanceExceptions } from '@/components/attendance/attendance-exceptions-dynamic';

export default function AttendancePage() {
    const [refreshKey, setRefreshKey] = useState(0);
    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Attendance Dashboard"
                description="Daily tracking, roster verification, and exception management"
                breadcrumbs={[{ label: 'Attendance' }]}
                actions={
                    <>
                        <Button variant="outline">
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            Today: {today}
                        </Button>
                        <Button variant="outline" onClick={handleRefresh}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                        <Button variant="outline">
                            <Filter className="h-4 w-4 mr-2" />
                            Filters
                        </Button>
                        <Button>
                            <Download className="h-4 w-4 mr-2" />
                            Export Report
                        </Button>
                    </>
                }
            />

            {/* KPI Stats */}
            <AttendanceStats onRefresh={refreshKey} />

            {/* Main Content Layout */}
            <div className="grid gap-6 md:grid-cols-3">
                {/* Branch Table - Takes up 2/3 width */}
                <div className="md:col-span-2">
                    <BranchAttendanceTable onRefresh={refreshKey} />
                </div>

                {/* Exceptions Panel - Takes up 1/3 width */}
                <div className="md:col-span-1">
                    <AttendanceExceptions onRefresh={refreshKey} />
                </div>
            </div>
        </div>
    );
}

