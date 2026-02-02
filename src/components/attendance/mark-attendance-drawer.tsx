'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, X, Clock, UserCheck, UserX } from 'lucide-react';
import { getDailyRoster, markBulkAttendance, type RosterGuard } from '@/lib/api/attendance';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

interface MarkAttendanceDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    branchId?: string;
    branchName?: string;
    date: string;
    onSuccess?: () => void;
}

interface AttendanceMarking {
    guard_id: string;
    deployment_id: string;
    status: 'present' | 'absent' | 'late' | 'half_day';
    check_in_time?: string;
    remarks?: string;
}

export function MarkAttendanceDrawer({
    open,
    onOpenChange,
    branchId,
    branchName,
    date,
    onSuccess,
}: MarkAttendanceDrawerProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [loadingRoster, setLoadingRoster] = useState(false);
    const [roster, setRoster] = useState<RosterGuard[]>([]);
    const [attendance, setAttendance] = useState<Map<string, AttendanceMarking>>(new Map());
    const [selectAll, setSelectAll] = useState(false);

    useEffect(() => {
        if (open && branchId) {
            loadRoster();
        }
    }, [open, branchId, date]);

    const loadRoster = async () => {
        if (!branchId) return;

        setLoadingRoster(true);
        try {
            const data = await getDailyRoster(date, branchId);
            setRoster(data);

            // Initialize attendance map
            const initialAttendance = new Map<string, AttendanceMarking>();
            data.forEach(guard => {
                if (guard.status !== 'marked') {
                    initialAttendance.set(guard.guard_id, {
                        guard_id: guard.guard_id,
                        deployment_id: guard.deployment_id,
                        status: 'present',
                        check_in_time: new Date().toISOString(),
                        remarks: '',
                    });
                }
            });
            setAttendance(initialAttendance);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to load roster',
                variant: 'destructive',
            });
        } finally {
            setLoadingRoster(false);
        }
    };

    const updateAttendanceStatus = (guardId: string, status: AttendanceMarking['status']) => {
        const current = attendance.get(guardId);
        if (current) {
            setAttendance(new Map(attendance.set(guardId, { ...current, status })));
        }
    };

    const updateAttendanceRemarks = (guardId: string, remarks: string) => {
        const current = attendance.get(guardId);
        if (current) {
            setAttendance(new Map(attendance.set(guardId, { ...current, remarks })));
        }
    };

    const toggleGuardSelection = (guardId: string) => {
        const newAttendance = new Map(attendance);
        if (newAttendance.has(guardId)) {
            newAttendance.delete(guardId);
        } else {
            const guard = roster.find(g => g.guard_id === guardId);
            if (guard && guard.status !== 'marked') {
                newAttendance.set(guardId, {
                    guard_id: guard.guard_id,
                    deployment_id: guard.deployment_id,
                    status: 'present',
                    check_in_time: new Date().toISOString(),
                    remarks: '',
                });
            }
        }
        setAttendance(newAttendance);
    };

    const handleSelectAll = () => {
        const newSelectAll = !selectAll;
        setSelectAll(newSelectAll);

        if (newSelectAll) {
            // Select all unmarked guards
            const newAttendance = new Map<string, AttendanceMarking>();
            roster.forEach(guard => {
                if (guard.status !== 'marked') {
                    newAttendance.set(guard.guard_id, {
                        guard_id: guard.guard_id,
                        deployment_id: guard.deployment_id,
                        status: 'present',
                        check_in_time: new Date().toISOString(),
                        remarks: '',
                    });
                }
            });
            setAttendance(newAttendance);
        } else {
            setAttendance(new Map());
        }
    };

    const handleMarkAllPresent = () => {
        const newAttendance = new Map<string, AttendanceMarking>();
        roster.forEach(guard => {
            if (guard.status !== 'marked') {
                newAttendance.set(guard.guard_id, {
                    guard_id: guard.guard_id,
                    deployment_id: guard.deployment_id,
                    status: 'present',
                    check_in_time: new Date().toISOString(),
                    remarks: '',
                });
            }
        });
        setAttendance(newAttendance);
        setSelectAll(true);
    };

    const handleSubmit = async () => {
        if (attendance.size === 0) {
            toast({
                title: 'No attendance selected',
                description: 'Please select at least one guard to mark attendance',
                variant: 'destructive',
            });
            return;
        }

        if (!branchId) return;

        setLoading(true);
        try {
            const result = await markBulkAttendance({
                date,
                branch_id: branchId,
                attendance: Array.from(attendance.values()),
            });

            toast({
                title: 'Success',
                description: result.message,
            });

            onSuccess?.();
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to mark attendance',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const unmarkedGuards = roster.filter(g => g.status !== 'marked');
    const markedGuards = roster.filter(g => g.status === 'marked');

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[600px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Mark Attendance</SheetTitle>
                    <SheetDescription>
                        {branchName && `${branchName} - `}
                        {new Date(date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })}
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                    {loadingRoster ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                            {/* Summary */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="rounded-lg border p-3 text-center">
                                    <div className="text-2xl font-bold">{roster.length}</div>
                                    <div className="text-xs text-muted-foreground">Total Guards</div>
                                </div>
                                <div className="rounded-lg border p-3 text-center bg-success/10">
                                    <div className="text-2xl font-bold text-success">
                                        {markedGuards.length}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Marked</div>
                                </div>
                                <div className="rounded-lg border p-3 text-center bg-warning/10">
                                    <div className="text-2xl font-bold text-warning">
                                        {unmarkedGuards.length}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Pending</div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            {unmarkedGuards.length > 0 && (
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleSelectAll}
                                        className="flex-1"
                                    >
                                        <Check className="h-4 w-4 mr-2" />
                                        {selectAll ? 'Deselect All' : 'Select All'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleMarkAllPresent}
                                        className="flex-1"
                                    >
                                        <UserCheck className="h-4 w-4 mr-2" />
                                        Mark All Present
                                    </Button>
                                </div>
                            )}

                            {/* Guard List */}
                            <div className="space-y-3">
                                <Label className="text-base font-medium">Guards Roster</Label>

                                {unmarkedGuards.length === 0 && markedGuards.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No guards deployed to this branch
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {unmarkedGuards.map(guard => {
                                            const isSelected = attendance.has(guard.guard_id);
                                            const marking = attendance.get(guard.guard_id);

                                            return (
                                                <div
                                                    key={guard.guard_id}
                                                    className={`border rounded-lg p-3 space-y-3 ${
                                                        isSelected ? 'border-primary bg-primary/5' : ''
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onCheckedChange={() =>
                                                                toggleGuardSelection(guard.guard_id)
                                                            }
                                                            className="mt-1"
                                                        />
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="font-medium">
                                                                        {guard.full_name}
                                                                    </p>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        {guard.guard_code}
                                                                        {guard.shift_type &&
                                                                            ` • ${guard.shift_type}`}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {isSelected && marking && (
                                                                <div className="mt-3 space-y-3">
                                                                    <div className="grid grid-cols-4 gap-2">
                                                                        <Button
                                                                            type="button"
                                                                            variant={
                                                                                marking.status === 'present'
                                                                                    ? 'default'
                                                                                    : 'outline'
                                                                            }
                                                                            size="sm"
                                                                            onClick={() =>
                                                                                updateAttendanceStatus(
                                                                                    guard.guard_id,
                                                                                    'present'
                                                                                )
                                                                            }
                                                                            className="h-auto py-2 flex-col gap-1"
                                                                        >
                                                                            <UserCheck className="h-4 w-4" />
                                                                            <span className="text-xs">
                                                                                Present
                                                                            </span>
                                                                        </Button>
                                                                        <Button
                                                                            type="button"
                                                                            variant={
                                                                                marking.status === 'late'
                                                                                    ? 'default'
                                                                                    : 'outline'
                                                                            }
                                                                            size="sm"
                                                                            onClick={() =>
                                                                                updateAttendanceStatus(
                                                                                    guard.guard_id,
                                                                                    'late'
                                                                                )
                                                                            }
                                                                            className="h-auto py-2 flex-col gap-1"
                                                                        >
                                                                            <Clock className="h-4 w-4" />
                                                                            <span className="text-xs">
                                                                                Late
                                                                            </span>
                                                                        </Button>
                                                                        <Button
                                                                            type="button"
                                                                            variant={
                                                                                marking.status === 'absent'
                                                                                    ? 'default'
                                                                                    : 'outline'
                                                                            }
                                                                            size="sm"
                                                                            onClick={() =>
                                                                                updateAttendanceStatus(
                                                                                    guard.guard_id,
                                                                                    'absent'
                                                                                )
                                                                            }
                                                                            className="h-auto py-2 flex-col gap-1"
                                                                        >
                                                                            <UserX className="h-4 w-4" />
                                                                            <span className="text-xs">
                                                                                Absent
                                                                            </span>
                                                                        </Button>
                                                                        <Button
                                                                            type="button"
                                                                            variant={
                                                                                marking.status === 'half_day'
                                                                                    ? 'default'
                                                                                    : 'outline'
                                                                            }
                                                                            size="sm"
                                                                            onClick={() =>
                                                                                updateAttendanceStatus(
                                                                                    guard.guard_id,
                                                                                    'half_day'
                                                                                )
                                                                            }
                                                                            className="h-auto py-2 flex-col gap-1"
                                                                        >
                                                                            <Clock className="h-4 w-4" />
                                                                            <span className="text-xs">
                                                                                Half Day
                                                                            </span>
                                                                        </Button>
                                                                    </div>

                                                                    {(marking.status === 'absent' ||
                                                                        marking.status === 'late') && (
                                                                        <div>
                                                                            <Label className="text-xs">
                                                                                Remarks
                                                                            </Label>
                                                                            <Textarea
                                                                                placeholder="Add reason..."
                                                                                value={marking.remarks || ''}
                                                                                onChange={e =>
                                                                                    updateAttendanceRemarks(
                                                                                        guard.guard_id,
                                                                                        e.target.value
                                                                                    )
                                                                                }
                                                                                className="mt-1 min-h-[60px]"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {markedGuards.length > 0 && (
                                            <div className="pt-4 mt-4 border-t">
                                                <p className="text-sm font-medium mb-2">
                                                    Already Marked ({markedGuards.length})
                                                </p>
                                                <div className="space-y-2">
                                                    {markedGuards.map(guard => (
                                                        <div
                                                            key={guard.guard_id}
                                                            className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                                                        >
                                                            <div>
                                                                <p className="text-sm font-medium">
                                                                    {guard.full_name}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {guard.guard_code}
                                                                </p>
                                                            </div>
                                                            <Badge variant="outline" className="bg-success/10">
                                                                <Check className="h-3 w-3 mr-1" />
                                                                Marked
                                                            </Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Submit Button */}
                            {unmarkedGuards.length > 0 && (
                                <div className="flex gap-2 pt-4 border-t">
                                    <Button
                                        variant="outline"
                                        onClick={() => onOpenChange(false)}
                                        disabled={loading}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={loading || attendance.size === 0}
                                        className="flex-1"
                                    >
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Mark Attendance ({attendance.size})
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
