'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Check } from 'lucide-react';
import { getTodayExceptions, type DailyException } from '@/lib/api/attendance';

export function AttendanceExceptions({ onRefresh }: { onRefresh?: number }) {
    const [exceptions, setExceptions] = useState<DailyException[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadExceptions();
    }, [onRefresh]);

    const loadExceptions = async () => {
        try {
            const data = await getTodayExceptions();
            setExceptions(data);
        } catch (error) {
            console.error('Failed to load exceptions:', error);
        } finally {
            setLoading(false);
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getStatusColor = (status: string) => {
        return status === 'absent' ? 'text-destructive' : 'text-warning';
    };

    const getStatusLabel = (status: string) => {
        return status === 'absent' ? 'Absent' : 'Late (45m)';
    };

    return (
        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle className="text-base font-medium">Daily Exceptions</CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : exceptions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Check className="h-12 w-12 mx-auto mb-2 text-success" />
                        <p>No exceptions today!</p>
                        <p className="text-xs">All guards are present</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {exceptions.map((exception) => (
                            <div
                                key={exception.id}
                                className="flex items-start gap-3 p-3 rounded-lg border"
                            >
                                <div
                                    className={`h-10 w-10 rounded-full flex items-center justify-center font-medium text-sm ${
                                        exception.status === 'absent'
                                            ? 'bg-destructive/10 text-destructive'
                                            : 'bg-warning/10 text-warning'
                                    }`}
                                >
                                    {getInitials(exception.guard_name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">
                                                {exception.guard_name}
                                            </p>
                                            <p className="text-sm text-muted-foreground truncate">
                                                {exception.branch_name}
                                            </p>
                                        </div>
                                        <div className="flex gap-1 flex-shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0"
                                            >
                                                <Check className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className={`mt-1 ${
                                            exception.status === 'absent'
                                                ? 'border-destructive/20 bg-destructive/5'
                                                : 'border-warning/20 bg-warning/5'
                                        }`}
                                    >
                                        <span className={getStatusColor(exception.status)}>
                                            {getStatusLabel(exception.status)}
                                        </span>
                                    </Badge>
                                    {exception.time && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {exception.time}
                                        </p>
                                    )}
                                    {exception.remarks && (
                                        <p className="text-xs text-muted-foreground mt-1 italic">
                                            {exception.remarks}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
