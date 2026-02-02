'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getPendingApprovalsCount, getApprovalRequests } from '@/lib/api/approvals';
import type { ApprovalRequest } from '@/lib/api/approvals';
import { createClient } from '@/lib/supabase/client';

export function ApprovalNotifications() {
    const [pendingCount, setPendingCount] = React.useState(0);
    const [pendingRequests, setPendingRequests] = React.useState<ApprovalRequest[]>([]);
    const [isOpen, setIsOpen] = React.useState(false);
    const supabase = createClient();

    // Fetch pending approvals count
    const fetchPendingCount = React.useCallback(async () => {
        try {
            const count = await getPendingApprovalsCount();
            setPendingCount(count);
        } catch (error) {
            console.error('Error fetching pending approvals count:', error);
        }
    }, []);

    // Fetch pending requests when dropdown opens
    const fetchPendingRequests = React.useCallback(async () => {
        try {
            const { data } = await getApprovalRequests({ status: 'pending' });
            if (data) {
                // Sort by created_at descending and take latest 5
                const sorted = data.sort((a, b) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                ).slice(0, 5);
                setPendingRequests(sorted);
            }
        } catch (error) {
            console.error('Error fetching pending requests:', error);
        }
    }, []);

    // Initial fetch
    React.useEffect(() => {
        fetchPendingCount();
    }, [fetchPendingCount]);

    // Real-time subscription to approval_requests changes
    React.useEffect(() => {
        const channel = supabase
            .channel('approval_notifications')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'approval_requests',
                    filter: 'status=eq.pending',
                },
                () => {
                    console.log('🔔 Approval request changed, refreshing count...');
                    fetchPendingCount();
                    if (isOpen) {
                        fetchPendingRequests();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, fetchPendingCount, fetchPendingRequests, isOpen]);

    // Fetch requests when dropdown opens
    React.useEffect(() => {
        if (isOpen) {
            fetchPendingRequests();
        }
    }, [isOpen, fetchPendingRequests]);

    const getRequestTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            'guard_enrollment': 'Guard Enrollment',
            'guard_termination': 'Guard Termination',
            'deployment_change': 'Deployment Change',
            'leave_request': 'Leave Request',
            'expense_approval': 'Expense Approval',
            'salary_adjustment': 'Salary Adjustment',
            'client_creation': 'New Client',
            'client_branch_creation': 'New Branch',
        };
        return labels[type] || type;
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return 'bg-red-500';
            case 'high':
                return 'bg-orange-500';
            case 'normal':
                return 'bg-blue-500';
            case 'low':
                return 'bg-gray-500';
            default:
                return 'bg-gray-500';
        }
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {pendingCount > 0 && (
                        <Badge 
                            variant="destructive" 
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
                        >
                            {pendingCount > 9 ? '9+' : pendingCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Pending Approvals</span>
                    {pendingCount > 0 && (
                        <Badge variant="secondary">{pendingCount}</Badge>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {pendingRequests.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        No pending approvals
                    </div>
                ) : (
                    <ScrollArea className="max-h-[400px]">
                        {pendingRequests.map((request) => (
                            <Link 
                                key={request.id} 
                                href="/approvals"
                                onClick={() => setIsOpen(false)}
                            >
                                <DropdownMenuItem className="cursor-pointer flex flex-col items-start gap-1 p-3">
                                    <div className="flex items-center justify-between w-full">
                                        <span className="font-medium text-sm">
                                            {getRequestTypeLabel(request.request_type)}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <div 
                                                className={`h-2 w-2 rounded-full ${getPriorityColor(request.priority)}`}
                                                title={request.priority}
                                            />
                                            <span className="text-xs text-muted-foreground">
                                                {formatTimeAgo(request.requested_at)}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-xs text-muted-foreground line-clamp-2">
                                        {request.title}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        by {request.requested_by_name || 'Unknown'}
                                    </span>
                                </DropdownMenuItem>
                            </Link>
                        ))}
                    </ScrollArea>
                )}
                
                <DropdownMenuSeparator />
                <Link href="/approvals" onClick={() => setIsOpen(false)}>
                    <DropdownMenuItem className="cursor-pointer justify-center font-medium">
                        View All Approvals
                    </DropdownMenuItem>
                </Link>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
