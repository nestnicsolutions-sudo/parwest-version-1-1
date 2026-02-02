'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, UserPlus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { getGuardsForDeployment } from '@/lib/api/guards';
import { useRouter } from 'next/navigation';

interface Guard {
    id: string;
    first_name: string;
    last_name: string;
    guard_code: string;
}

interface Client {
    id: string;
    client_name: string;
}

interface Branch {
    id: string;
    branch_name: string;
    client_id: string;
}

export function DeployGuardDrawer() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [availableGuards, setAvailableGuards] = useState<Guard[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedGuard, setSelectedGuard] = useState('');
    const [selectedClient, setSelectedClient] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('');
    const [shiftType, setShiftType] = useState('');
    const [startDate, setStartDate] = useState<Date>();
    const [endDate, setEndDate] = useState<Date>();
    const [guardRate, setGuardRate] = useState('');
    const [clientRate, setClientRate] = useState('');
    const [notes, setNotes] = useState('');
    const { toast } = useToast();
    const router = useRouter();

    const selectedBranches = branches.filter(b => b.client_id === selectedClient);

    useEffect(() => {
        console.log('🔍 Selected client:', selectedClient);
        console.log('🏢 All branches:', branches);
        console.log('✅ Filtered branches for client:', selectedBranches);
        
        // Reload branches when client is selected
        if (selectedClient && open) {
            reloadBranches();
        }
    }, [selectedClient]);

    useEffect(() => {
        if (open) {
            loadData();
        }
    }, [open]);

    async function loadData() {
        try {
            setLoading(true);
            const supabase = createClient();

            // Get available guards
            const guardsData = await getGuardsForDeployment();
            setAvailableGuards(guardsData.data as Guard[]);

            // Get clients
            const { data: clientsData } = await supabase
                .from('clients')
                .select('id, client_name')
                .eq('status', 'active')
                .order('client_name');
            
            setClients(clientsData || []);

            // Get all branches
            const { data: branchesData } = await supabase
                .from('client_branches')
                .select('id, branch_name, client_id, status, is_active')
                .eq('is_active', true)
                .order('branch_name');
            
            console.log('📍 All branches loaded:', branchesData);
            console.log('📍 Total branches:', branchesData?.length);
            setBranches(branchesData || []);
        } catch (error) {
            console.error('Error loading data:', error);
            toast({
                title: 'Error',
                description: 'Failed to load deployment data',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }

    async function reloadBranches() {
        try {
            const supabase = createClient();
            const { data: branchesData, error } = await supabase
                .from('client_branches')
                .select('id, branch_name, client_id, status, is_active')
                .eq('is_active', true)
                .order('branch_name');
            
            if (error) {
                console.error('❌ Error reloading branches:', error);
            } else {
                console.log('🔄 Branches reloaded:', branchesData);
                setBranches(branchesData || []);
            }
        } catch (error) {
            console.error('❌ Exception reloading branches:', error);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        // Validation
        if (!selectedGuard || !selectedClient || !selectedBranch || !shiftType || !startDate) {
            toast({
                title: 'Validation Error',
                description: 'Please fill in all required fields. Note: Branch is required for deployment.',
                variant: 'destructive',
            });
            return;
        }

        if (endDate && endDate < startDate) {
            toast({
                title: 'Validation Error',
                description: 'End date must be after start date',
                variant: 'destructive',
            });
            return;
        }

        try {
            setLoading(true);
            const supabase = createClient();

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: profile } = await supabase
                .from('profiles')
                .select('org_id')
                .eq('id', user.id)
                .single();

            if (!profile?.org_id) throw new Error('Organization not found');

            // Check if guard is already deployed
            const { data: existingDeployment, error: checkError } = await supabase
                .from('guard_deployments')
                .select('id, status')
                .eq('guard_id', selectedGuard)
                .in('status', ['active', 'planned'])
                .maybeSingle();

            if (checkError) {
                console.error('Error checking existing deployment:', checkError);
            }

            if (existingDeployment) {
                const guard = availableGuards.find(g => g.id === selectedGuard);
                toast({
                    title: 'Guard Already Deployed',
                    description: `${guard?.first_name} ${guard?.last_name} is already deployed. Please select another guard or end the current deployment first.`,
                    variant: 'destructive',
                });
                setLoading(false);
                return;
            }

            // Create deployment
            const { data: deployData, error: deployError } = await supabase
                .from('guard_deployments')
                .insert({
                    org_id: profile.org_id,
                    guard_id: selectedGuard,
                    client_id: selectedClient,
                    branch_id: selectedBranch,
                    deployment_date: format(startDate, 'yyyy-MM-dd'),
                    end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
                    shift_type: shiftType,
                    status: 'planned',
                    guard_rate: guardRate ? parseFloat(guardRate) : null,
                    client_rate: clientRate ? parseFloat(clientRate) : null,
                    notes,
                    created_by: user.id,
                });

            if (deployError) {
                console.error('Deployment error details:', {
                    message: deployError.message,
                    details: deployError.details,
                    hint: deployError.hint,
                    code: deployError.code,
                });
                throw new Error(deployError.message || 'Failed to create deployment');
            }

            // Update guard status to deployed
            await supabase
                .from('guards')
                .update({ status: 'deployed' })
                .eq('id', selectedGuard);

            const guard = availableGuards.find(g => g.id === selectedGuard);
            const branch = branches.find(b => b.id === selectedBranch);

            toast({
                title: 'Deployment Created',
                description: `${guard?.first_name} ${guard?.last_name} deployed to ${branch?.branch_name}`,
            });

            // Reset form
            setSelectedGuard('');
            setSelectedClient('');
            setSelectedBranch('');
            setShiftType('');
            setStartDate(undefined);
            setEndDate(undefined);
            setGuardRate('');
            setClientRate('');
            setNotes('');
            setOpen(false);
            
            // Refresh the page
            router.refresh();
        } catch (error: any) {
            console.error('Error creating deployment:', {
                error,
                message: error?.message,
                stack: error?.stack,
            });
            toast({
                title: 'Deployment Failed',
                description: error.message || 'Failed to create deployment. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
                <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Deploy Guard
                </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[90vh]">
                <DrawerHeader>
                    <DrawerTitle>Deploy Guard to Site</DrawerTitle>
                    <DrawerDescription>
                        Assign a guard to a client site with shift details
                    </DrawerDescription>
                </DrawerHeader>
                {loading && !availableGuards.length ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="px-4 overflow-y-auto">
                        <div className="pb-4">
                            {/* 3-Column Grid Layout */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                                {/* Guard Selection */}
                                <div className="space-y-2">
                                    <Label htmlFor="guard">Guard *</Label>
                                    <Select value={selectedGuard} onValueChange={setSelectedGuard} disabled={loading}>
                                        <SelectTrigger id="guard">
                                            <SelectValue placeholder="Select guard" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[300px] overflow-y-auto">
                                            {availableGuards.length === 0 ? (
                                                <div className="p-2 text-sm text-muted-foreground">No guards available</div>
                                            ) : (
                                                availableGuards.map((guard) => (
                                                    <SelectItem key={guard.id} value={guard.id}>
                                                        {guard.first_name} {guard.last_name} ({guard.guard_code})
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Client Selection */}
                                <div className="space-y-2">
                                    <Label htmlFor="client">Client *</Label>
                                    <Select value={selectedClient} onValueChange={(value) => {
                                        setSelectedClient(value);
                                        setSelectedBranch('');
                                    }} disabled={loading}>
                                        <SelectTrigger id="client">
                                            <SelectValue placeholder="Select client" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[300px] overflow-y-auto">
                                            {clients.map((client) => (
                                                <SelectItem key={client.id} value={client.id}>
                                                    {client.client_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Branch Selection */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="branch">Branch *</Label>
                                        {selectedClient && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={reloadBranches}
                                                className="h-6 text-xs"
                                            >
                                                Refresh
                                            </Button>
                                        )}
                                    </div>
                                    <Select
                                        value={selectedBranch}
                                        onValueChange={setSelectedBranch}
                                        disabled={!selectedClient || loading}
                                    >
                                        <SelectTrigger id="branch">
                                            <SelectValue placeholder="Select branch" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[300px] overflow-y-auto">
                                            {selectedBranches.length === 0 ? (
                                                <div className="p-3 text-sm">
                                                    <p className="text-muted-foreground mb-2">No branches found for this client.</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        💡 Branch is required for deployment. Please add a branch in the Clients section first.
                                                    </p>
                                                </div>
                                            ) : (
                                                selectedBranches.map((branch) => (
                                                    <SelectItem key={branch.id} value={branch.id}>
                                                        {branch.branch_name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Shift Type */}
                                <div className="space-y-2">
                                    <Label htmlFor="shift">Shift Type *</Label>
                                    <Select value={shiftType} onValueChange={setShiftType} disabled={loading}>
                                        <SelectTrigger id="shift">
                                            <SelectValue placeholder="Select shift" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[300px] overflow-y-auto">
                                            <SelectItem value="day">Day Shift (8 AM - 8 PM)</SelectItem>
                                            <SelectItem value="night">Night Shift (8 PM - 8 AM)</SelectItem>
                                            <SelectItem value="rotating">Rotating</SelectItem>
                                            <SelectItem value="24hour">24 Hour</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Start Date */}
                                <div className="space-y-2">
                                    <Label>Start Date *</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                disabled={loading}
                                                className={cn(
                                                    'w-full justify-start text-left font-normal',
                                                    !startDate && 'text-muted-foreground'
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={startDate}
                                                onSelect={setStartDate}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                {/* End Date */}
                                <div className="space-y-2">
                                    <Label>End Date (Optional)</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                disabled={loading}
                                                className={cn(
                                                    'w-full justify-start text-left font-normal',
                                                    !endDate && 'text-muted-foreground'
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={endDate}
                                                onSelect={setEndDate}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            {/* Notes - Full Width */}
                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Additional deployment notes..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <DrawerFooter className="px-0">
                            <Button type="submit" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Deploying...
                                    </>
                                ) : (
                                    'Deploy Guard'
                                )}
                            </Button>
                            <DrawerClose asChild>
                                <Button variant="outline" disabled={loading}>Cancel</Button>
                            </DrawerClose>
                        </DrawerFooter>
                    </form>
                )}
            </DrawerContent>
        </Drawer>
    );
}
