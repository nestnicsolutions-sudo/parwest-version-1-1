'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, User, LogOut, Settings, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ApprovalNotifications } from './approval-notifications';

interface TopBarProps {
    user?: {
        name: string;
        email: string;
        avatar?: string;
        role?: string;
    };
    onSearch?: (query: string) => void;
}

export function TopBar({
    user,
    onSearch,
}: TopBarProps) {
    const [searchQuery, setSearchQuery] = React.useState('');
    const router = useRouter();
    const supabase = createClient();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch?.(searchQuery);
    };

    const handleSignOut = async () => {
        console.log('🚪 [TopBar] Signing out user...');
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // Use default user if not loaded yet
    const displayUser = user || { name: 'Loading...', email: 'user@parwest.com', role: 'User' };

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background px-6">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 max-w-md">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search guards, clients, invoices..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 bg-muted/50 border-0 focus-visible:bg-background focus-visible:ring-1"
                    />
                    <kbd className="pointer-events-none absolute right-3 top-1/2 hidden h-5 -translate-y-1/2 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground sm:flex">
                        <span className="text-xs">⌘</span>K
                    </kbd>
                </div>
            </form>

            {/* Right Actions */}
            <div className="flex items-center gap-2 ml-4">
                {/* Help */}
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <HelpCircle className="h-5 w-5" />
                </Button>

                {/* Approval Notifications - Real-time */}
                <ApprovalNotifications />

                {/* User Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-2 pl-2 pr-3">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={displayUser.avatar} alt={displayUser.name} />
                                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                    {getInitials(displayUser.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="hidden flex-col items-start text-left md:flex">
                                <span className="text-sm font-medium">{displayUser.name}</span>
                                <span className="text-xs text-muted-foreground">{displayUser.role}</span>
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>
                            <div className="flex flex-col">
                                <span>{displayUser.name}</span>
                                <span className="text-xs font-normal text-muted-foreground">
                                    {displayUser.email}
                                </span>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/profile" className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Profile
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/settings" className="flex items-center gap-2">
                                <Settings className="h-4 w-4" />
                                Settings
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                            className="text-destructive focus:text-destructive cursor-pointer"
                            onClick={handleSignOut}
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Sign out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
