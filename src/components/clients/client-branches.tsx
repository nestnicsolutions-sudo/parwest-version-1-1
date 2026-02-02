'use client';

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
import { Plus, MapPin, MoreHorizontal, Building } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ClientBranch } from '@/types/client';

interface ClientBranchesProps {
    clientId: string;
    branches: ClientBranch[];
}

export function ClientBranches({ clientId, branches }: ClientBranchesProps) {
    return (
        <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-medium">
                    Branch Locations ({branches.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                {branches.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Branch Name</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Site In-Charge</TableHead>
                                <TableHead className="text-center">Required Guards</TableHead>
                                <TableHead className="text-center">Current Guards</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {branches.map((branch) => (
                                <TableRow key={branch.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <Building className="h-4 w-4 text-muted-foreground" />
                                            {branch.branch_name}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                            {branch.branch_code}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                                            <MapPin className="h-3 w-3" />
                                            <div>
                                                {branch.address}
                                                {branch.city && <div className="text-xs">{branch.city}</div>}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            {branch.site_incharge_name || 'N/A'}
                                            {branch.site_incharge_phone && (
                                                <div className="text-xs text-muted-foreground">
                                                    {branch.site_incharge_phone}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="secondary" className="font-mono">
                                            {branch.required_guards}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge 
                                            variant={
                                                branch.current_guards >= branch.required_guards 
                                                    ? 'default' 
                                                    : 'destructive'
                                            }
                                            className="font-mono"
                                        >
                                            {branch.current_guards}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge 
                                            variant={
                                                branch.status === 'active' 
                                                    ? 'default' 
                                                    : branch.status === 'suspended'
                                                    ? 'secondary'
                                                    : 'destructive'
                                            }
                                        >
                                            {branch.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem>View Details</DropdownMenuItem>
                                                <DropdownMenuItem>Edit Branch</DropdownMenuItem>
                                                <DropdownMenuItem>View Guards</DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive">
                                                    Close Branch
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        <Building className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No branches added yet.</p>
                        <p className="text-sm mt-1">Add a branch to start deploying guards.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
