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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    Filter,
    FileText,
    Users,
    DollarSign,
    Loader2,
} from 'lucide-react';
import { getApprovalRequests, type ApprovalRequest } from '@/lib/api/approvals';
import { approveRequestAction, rejectRequestAction } from '@/lib/actions/approvals';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';

export function ApprovalsTable() {
    const { toast } = useToast();
    const router = useRouter();
    const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
    const [filteredApprovals, setFilteredApprovals] = useState<ApprovalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [processingId, setProcessingId] = useState<string | null>(null);
    
    // Reject dialog state
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectingRequest, setRejectingRequest] = useState<ApprovalRequest | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    useEffect(() => {
        loadApprovals();
    }, []);

    useEffect(() => {
        filterApprovals();
    }, [searchTerm, statusFilter, typeFilter, approvals]);

    async function loadApprovals() {
        setLoading(true);
        console.log('📋 Loading approval requests...');
        try {
            const { data, error } = await getApprovalRequests();
            console.log('📥 Approval requests response:', { data, error });
            
            if (error) {
                console.error('❌ Error loading approvals:', error);
                toast({
                    title: 'Error',
                    description: `Failed to load approval requests: ${error}`,
                    variant: 'destructive',
                });
                return;
            }
            
            console.log(`✅ Loaded ${data?.length || 0} approval requests`);
            setApprovals(data || []);
            setFilteredApprovals(data || []);
        } catch (err) {
            console.error('❌ Exception loading approvals:', err);
        } finally {
            setLoading(false);
        }
    }

    function filterApprovals() {
        let filtered = [...approvals];

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(a => a.status === statusFilter);
        }

        // Type filter
        if (typeFilter !== 'all') {
            filtered = filtered.filter(a => a.request_type === typeFilter);
        }

        // Search
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(a =>
                a.id.toLowerCase().includes(term) ||
                a.title.toLowerCase().includes(term) ||
                a.requested_by_name?.toLowerCase().includes(term) ||
                a.description?.toLowerCase().includes(term)
            );
        }

        setFilteredApprovals(filtered);
    }

    async function handleApprove(request: ApprovalRequest) {
        try {
            setProcessingId(request.id);
            
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                toast({
                    title: 'Error',
                    description: 'You must be logged in',
                    variant: 'destructive',
                });
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', user.id)
                .single();

            const result = await approveRequestAction(
                request.id,
                user.id,
                profile?.full_name || 'Unknown'
            );

            if (!result.success) {
                throw new Error(result.error);
            }

            toast({
                title: 'Request Approved',
                description: 'The approval request has been processed successfully',
            });

            await loadApprovals();
            router.refresh();
        } catch (err: any) {
            console.error('Error approving request:', err);
            toast({
                title: 'Error',
                description: err.message || 'Failed to approve request',
                variant: 'destructive',
            });
        } finally {
            setProcessingId(null);
        }
    }

    function openRejectDialog(request: ApprovalRequest) {
        setRejectingRequest(request);
        setRejectionReason('');
        setRejectDialogOpen(true);
    }

    async function handleReject() {
        if (!rejectingRequest) return;

        if (!rejectionReason.trim()) {
            toast({
                title: 'Rejection Reason Required',
                description: 'Please provide a reason for rejection',
                variant: 'destructive',
            });
            return;
        }

        try {
            setProcessingId(rejectingRequest.id);
            
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                toast({
                    title: 'Error',
                    description: 'You must be logged in',
                    variant: 'destructive',
                });
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', user.id)
                .single();

            const result = await rejectRequestAction(
                rejectingRequest.id,
                user.id,
                profile?.full_name || 'Unknown',
                rejectionReason
            );

            if (!result.success) {
                throw new Error(result.error);
            }

            toast({
                title: 'Request Rejected',
                description: 'The approval request has been rejected',
            });

            setRejectDialogOpen(false);
            setRejectingRequest(null);
            await loadApprovals();
            router.refresh();
        } catch (err: any) {
            console.error('Error rejecting request:', err);
            toast({
                title: 'Error',
                description: err.message || 'Failed to reject request',
                variant: 'destructive',
            });
        } finally {
            setProcessingId(null);
        }
    }

    const getStatusBadge = (status: ApprovalRequest['status']) => {
        switch (status) {
            case 'pending':
                return <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">Pending</Badge>;
            case 'approved':
                return <Badge variant="default" className="bg-success/10 text-success border-success/20">Approved</Badge>;
            case 'rejected':
                return <Badge variant="destructive">Rejected</Badge>;
            case 'cancelled':
                return <Badge variant="outline">Cancelled</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const getPriorityBadge = (priority: ApprovalRequest['priority']) => {
        switch (priority) {
            case 'urgent':
                return <Badge variant="destructive" className="text-xs">Urgent</Badge>;
            case 'high':
                return <Badge variant="default" className="text-xs bg-orange-500">High</Badge>;
            case 'normal':
                return <Badge variant="secondary" className="text-xs">Normal</Badge>;
            case 'low':
                return <Badge variant="outline" className="text-xs">Low</Badge>;
            default:
                return null;
        }
    };

    const getTypeIcon = (type: ApprovalRequest['request_type']) => {
        switch (type) {
            case 'guard_enrollment':
            case 'guard_termination':
                return <Users className="h-4 w-4" />;
            case 'expense_approval':
            case 'salary_adjustment':
                return <DollarSign className="h-4 w-4" />;
            default:
                return <FileText className="h-4 w-4" />;
        }
    };

    const formatRequestType = (type: string) => {
        return type.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };

    if (loading) {
        return (
            <Card className="shadow-sm">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card className="shadow-sm">
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by ID, title, or requester..."
                                    className="pl-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <Filter className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="guard_enrollment">Guard Enrollment</SelectItem>
                                <SelectItem value="guard_termination">Guard Termination</SelectItem>
                                <SelectItem value="deployment_change">Deployment Change</SelectItem>
                                <SelectItem value="leave_request">Leave Request</SelectItem>
                                <SelectItem value="expense_approval">Expense Approval</SelectItem>
                                <SelectItem value="salary_adjustment">Salary Adjustment</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Type</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Requested By</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredApprovals.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No approval requests found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredApprovals.map((request) => (
                                    <TableRow key={request.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {getTypeIcon(request.request_type)}
                                                <span className="text-sm">{formatRequestType(request.request_type)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{request.title}</span>
                                                {request.description && (
                                                    <span className="text-xs text-muted-foreground line-clamp-1">
                                                        {request.description}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span>{request.requested_by_name || 'Unknown'}</span>
                                                {request.requested_by_role && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {request.requested_by_role}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(request.requested_at).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })}
                                        </TableCell>
                                        <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                                        <TableCell className="text-right">
                                            {request.status === 'pending' ? (
                                                <div className="flex justify-end gap-2">
                                                    <Button 
                                                        size="sm" 
                                                        variant="default"
                                                        onClick={() => handleApprove(request)}
                                                        disabled={processingId === request.id}
                                                    >
                                                        {processingId === request.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                                                Approve
                                                            </>
                                                        )}
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        variant="destructive"
                                                        onClick={() => openRejectDialog(request)}
                                                        disabled={processingId === request.id}
                                                    >
                                                        <XCircle className="h-4 w-4 mr-1" />
                                                        Reject
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Badge variant="outline" className="text-xs">
                                                    {request.status === 'approved' ? 'Approved by ' : 'Rejected by '}
                                                    {request.approved_by_name || 'Admin'}
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Reject Dialog */}
            <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reject Approval Request</AlertDialogTitle>
                        <AlertDialogDescription>
                            Please provide a reason for rejecting this request.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="my-4">
                        <Textarea
                            placeholder="Enter rejection reason..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={4}
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleReject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Reject Request
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
