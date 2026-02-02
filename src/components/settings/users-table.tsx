'use client';

import { useEffect, useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MoreHorizontal, UserPlus, Mail, Search, Loader2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AddUserDrawer } from './add-user-drawer';
import { getUsers, toggleUserStatus, type UserWithProfile } from '@/lib/api/users';
import { sendPasswordResetAction, deleteUserAction } from '@/lib/actions/users';
import { useToast } from '@/hooks/use-toast';
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

export function UsersTable() {
    const { toast } = useToast();
    const router = useRouter();
    const [users, setUsers] = useState<UserWithProfile[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [addUserOpen, setAddUserOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<UserWithProfile | null>(null);

    // Load users
    useEffect(() => {
        loadUsers();
    }, []);

    // Filter users based on search
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredUsers(users);
            return;
        }

        const term = searchTerm.toLowerCase();
        const filtered = users.filter(
            (user) =>
                user.full_name?.toLowerCase().includes(term) ||
                user.email?.toLowerCase().includes(term) ||
                user.role_name?.toLowerCase().includes(term)
        );
        setFilteredUsers(filtered);
    }, [searchTerm, users]);

    async function loadUsers() {
        console.log('📋 Loading users...');
        setLoading(true);

        try {
            const { data, error } = await getUsers();

            if (error) {
                console.error('❌ Error loading users:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to load users',
                    variant: 'destructive',
                });
                return;
            }

            console.log(`✅ Loaded ${data?.length || 0} users`);
            setUsers(data || []);
            setFilteredUsers(data || []);
        } catch (err) {
            console.error('❌ Exception loading users:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleToggleStatus(user: UserWithProfile) {
        const newStatus = !user.is_active;
        console.log(`🔄 ${newStatus ? 'Activating' : 'Deactivating'} user:`, user.email);

        try {
            const { error } = await toggleUserStatus(user.id, newStatus);

            if (error) {
                throw new Error(error.message || 'Failed to update user status');
            }

            toast({
                title: 'Success',
                description: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
            });

            // Reload users
            await loadUsers();
        } catch (error: any) {
            console.error('❌ Error toggling user status:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to update user status',
                variant: 'destructive',
            });
        }
    }

    async function handleSendPasswordReset(user: UserWithProfile) {
        console.log('📧 Sending password reset to:', user.email);

        try {
            const result = await sendPasswordResetAction(user.email);

            if (!result.success) {
                throw new Error(result.error || 'Failed to send reset email');
            }

            toast({
                title: 'Success',
                description: 'Password reset email sent',
            });
        } catch (error: any) {
            console.error('❌ Error sending password reset:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to send reset email',
                variant: 'destructive',
            });
        }
    }

    async function handleDeleteUser() {
        if (!userToDelete) return;

        console.log('🗑️ Deleting user:', userToDelete.email);

        try {
            const result = await deleteUserAction(userToDelete.id);

            if (!result.success) {
                throw new Error(result.error || 'Failed to delete user');
            }

            toast({
                title: 'Success',
                description: 'User deleted successfully',
            });

            // Reload users
            await loadUsers();
        } catch (error: any) {
            console.error('❌ Error deleting user:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to delete user',
                variant: 'destructive',
            });
        } finally {
            setDeleteDialogOpen(false);
            setUserToDelete(null);
        }
    }

    function getInitials(name: string | null): string {
        if (!name) return '?';
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    function formatDate(dateString: string | null): string {
        if (!dateString) return 'Never';

        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        return date.toLocaleDateString();
    }

    return (
        <>
            <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <CardTitle className="text-base font-medium">System Users</CardTitle>
                    <Button size="sm" onClick={() => setAddUserOpen(true)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add User
                    </Button>
                </CardHeader>
                <CardContent>
                    {/* Search Bar */}
                    <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search users by name, email, or role..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.length === 0 ? (
                                    <TableRow key="empty-state">
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            {searchTerm ? 'No users found matching your search' : 'No users found'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarFallback className="text-xs bg-primary/10">
                                                            {getInitials(user.full_name)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium">{user.full_name || 'Unknown'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-3 w-3" />
                                                    {user.email}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-normal">
                                                    {user.role_name || 'Unknown'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={user.is_active ? 'default' : 'secondary'}
                                                    className="capitalize"
                                                >
                                                    {user.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {formatDate(user.created_at)}
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            onClick={() => handleSendPasswordReset(user)}
                                                        >
                                                            Send Password Reset
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => handleToggleStatus(user)}
                                                        >
                                                            {user.is_active ? 'Deactivate' : 'Activate'}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() => {
                                                                setUserToDelete(user);
                                                                setDeleteDialogOpen(true);
                                                            }}
                                                        >
                                                            Delete User
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Add User Drawer */}
            <AddUserDrawer open={addUserOpen} onOpenChange={setAddUserOpen} />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the user <strong>{userToDelete?.email}</strong> and all
                            associated data. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setUserToDelete(null)}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteUser}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete User
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
