'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, UserX, Clock, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getTodayAttendanceStats } from '@/lib/api/attendance';

interface AttendanceStatsData {
    total_rostered: number;
    present: number;
    absent: number;
    late: number;
    missing_data: number;
    attendance_rate: string;
}

export function AttendanceStats({ onRefresh }: { onRefresh?: number }) {
    const [stats, setStats] = useState<AttendanceStatsData>({
        total_rostered: 0,
        present: 0,
        absent: 0,
        late: 0,
        missing_data: 0,
        attendance_rate: '0.0',
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, [onRefresh]);

    const loadStats = async () => {
        try {
            const data = await getTodayAttendanceStats();
            setStats(data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid gap-4 md:grid-cols-5">
            <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Rostered
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.total_rostered}</div>
                    <p className="text-xs text-muted-foreground mt-1">Scheduled today</p>
                </CardContent>
            </Card>

            <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Present
                    </CardTitle>
                    <UserCheck className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-success">{stats.present}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {stats.attendance_rate}% Completion
                    </p>
                </CardContent>
            </Card>

            <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Absent
                    </CardTitle>
                    <UserX className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-destructive">{stats.absent}</div>
                    <p className="text-xs text-muted-foreground mt-1">Unexcused</p>
                </CardContent>
            </Card>

            <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Late Arrival
                    </CardTitle>
                    <Clock className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-warning">{stats.late}</div>
                    <p className="text-xs text-muted-foreground mt-1">&gt; 15 mins late</p>
                </CardContent>
            </Card>

            <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Missing Data
                    </CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.missing_data}</div>
                    <p className="text-xs text-muted-foreground mt-1">Pending sync</p>
                </CardContent>
            </Card>
        </div>
    );
}
