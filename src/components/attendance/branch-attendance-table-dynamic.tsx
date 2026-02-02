'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Eye } from 'lucide-react';
import { getTodayBranchSummary, type BranchAttendanceSummary } from '@/lib/api/attendance';
import { MarkAttendanceDrawer } from './mark-attendance-drawer';

export function BranchAttendanceTable({ onRefresh }: { onRefresh?: number }) {
    const [branches, setBranches] = useState<BranchAttendanceSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBranch, setSelectedBranch] = useState<BranchAttendanceSummary | null>(null);
    const [markDrawerOpen, setMarkDrawerOpen] = useState(false);

    useEffect(() => {
        loadBranches();
    }, [onRefresh]);

    const loadBranches = async () => {
        try {
            const data = await getTodayBranchSummary();
            setBranches(data);
        } catch (error) {
            console.error('Failed to load branches:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAttendance = (branch: BranchAttendanceSummary) => {
        setSelectedBranch(branch);
        setMarkDrawerOpen(true);
    };

    const handleSuccess = () => {
        loadBranches();
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return (
                    <Badge className="bg-success/10 text-success hover:bg-success/20">
                        Completed
                    </Badge>
                );
            case 'attention':
                return (
                    <Badge className="bg-warning/10 text-warning hover:bg-warning/20">
                        Attention
                    </Badge>
                );
            case 'critical':
                return (
                    <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">
                        Critical
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="bg-muted">
                        Pending
                    </Badge>
                );
        }
    };

    const today = new Date().toISOString().split('T')[0];

    return (
        <>
            <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-medium">Branch Summary</CardTitle>
                    <Button variant="link" size="sm">
                        View Full Report
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading...</div>
                    ) : branches.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No active branches found
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Branch Name</TableHead>
                                    <TableHead className="text-center">Scheduled</TableHead>
                                    <TableHead className="text-center">Present</TableHead>
                                    <TableHead className="text-center">Late</TableHead>
                                    <TableHead className="text-center">Absent</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {branches.map((branch) => (
                                    <TableRow key={branch.branch_id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{branch.branch_name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {branch.client_name}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {branch.scheduled}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="text-success font-medium">
                                                {branch.present}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={branch.late > 0 ? 'text-warning font-medium' : ''}>
                                                {branch.late}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={branch.absent > 0 ? 'text-destructive font-medium' : ''}>
                                                {branch.absent}
                                            </span>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(branch.status)}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() => handleMarkAttendance(branch)}
                                                    >
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        Mark Attendance
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        View Details
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <MarkAttendanceDrawer
                open={markDrawerOpen}
                onOpenChange={setMarkDrawerOpen}
                branchId={selectedBranch?.branch_id}
                branchName={selectedBranch?.branch_name}
                date={today}
                onSuccess={handleSuccess}
            />
        </>
    );
}
