'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
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
import { createBranch } from '@/lib/api/clients';
import { Loader2 } from 'lucide-react';

const addBranchSchema = z.object({
    branch_name: z.string().min(3, 'Branch name is required'),
    address: z.string().min(10, 'Complete branch address is required'),
    city: z.string().min(2, 'City is required'),
    province: z.string().min(2, 'Province is required'),
    site_incharge_name: z.string().optional(),
    site_incharge_phone: z.string().optional(),
    required_guards: z.string().optional(),
    notes: z.string().optional(),
});

type AddBranchFormData = z.infer<typeof addBranchSchema>;

interface AddBranchDrawerProps {
    clientId: string;
    clientName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddBranchDrawer({ clientId, clientName, open, onOpenChange }: AddBranchDrawerProps) {
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const router = useRouter();
    const { toast } = useToast();

    const form = useForm<AddBranchFormData>({
        resolver: zodResolver(addBranchSchema),
        defaultValues: {
            branch_name: '',
            address: '',
            city: '',
            province: '',
            site_incharge_name: '',
            site_incharge_phone: '',
            required_guards: '1',
            notes: '',
        },
        mode: 'onChange',
    });

    const onSubmit = async (data: AddBranchFormData) => {
        setIsSubmitting(true);

        try {
            console.log('🏢 Creating branch for client:', clientId, data);
            
            const branchData = {
                client_id: clientId,
                branch_name: data.branch_name,
                address: data.address,
                city: data.city,
                province: data.province,
                site_incharge_name: data.site_incharge_name || undefined,
                site_incharge_phone: data.site_incharge_phone || undefined,
                required_guards: data.required_guards ? parseInt(data.required_guards) : 1,
                notes: data.notes || undefined,
                status: 'active' as const,
            };

            const result = await createBranch(branchData);
            
            console.log('✅ Branch created:', result);
            
            // Show appropriate success message
            if (result.branch) {
                // Super admin - branch created directly
                toast({
                    title: 'Branch created successfully!',
                    description: `${data.branch_name} has been added to ${clientName}.`,
                });
            } else if (result.approvalRequestId) {
                // Regular user - approval request submitted
                toast({
                    title: 'Branch request submitted!',
                    description: `Your request to add ${data.branch_name} has been sent to admin for approval.`,
                });
            }
            
            form.reset();
            onOpenChange(false);
            router.refresh();
            
        } catch (error) {
            console.error('❌ Error creating branch:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to create branch',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="max-h-[95vh] flex flex-col">
                <DrawerHeader className="border-b flex-shrink-0">
                    <DrawerTitle>Add New Branch</DrawerTitle>
                    <DrawerDescription>
                        Create a new branch for {clientName}
                    </DrawerDescription>
                </DrawerHeader>

                <div className="flex-1 overflow-y-auto">
                    <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 max-w-3xl mx-auto space-y-6">
                        {/* Branch Details */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="branch_name">
                                    Branch Name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="branch_name"
                                    placeholder="e.g. Main Branch, Gulberg Branch"
                                    {...form.register('branch_name')}
                                />
                                {form.formState.errors.branch_name && (
                                    <p className="text-sm text-destructive">
                                        {form.formState.errors.branch_name.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address">
                                    Branch Address <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    id="address"
                                    placeholder="Complete branch address"
                                    className="resize-none"
                                    rows={2}
                                    {...form.register('address')}
                                />
                                {form.formState.errors.address && (
                                    <p className="text-sm text-destructive">
                                        {form.formState.errors.address.message}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="city">
                                        City <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={form.watch('city')}
                                        onValueChange={(value) => form.setValue('city', value, { shouldValidate: true })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select city" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Lahore">Lahore</SelectItem>
                                            <SelectItem value="Karachi">Karachi</SelectItem>
                                            <SelectItem value="Islamabad">Islamabad</SelectItem>
                                            <SelectItem value="Rawalpindi">Rawalpindi</SelectItem>
                                            <SelectItem value="Faisalabad">Faisalabad</SelectItem>
                                            <SelectItem value="Multan">Multan</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {form.formState.errors.city && (
                                        <p className="text-sm text-destructive">
                                            {form.formState.errors.city.message}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="province">
                                        Province <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={form.watch('province')}
                                        onValueChange={(value) => form.setValue('province', value, { shouldValidate: true })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select province" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Punjab">Punjab</SelectItem>
                                            <SelectItem value="Sindh">Sindh</SelectItem>
                                            <SelectItem value="KPK">KPK</SelectItem>
                                            <SelectItem value="Balochistan">Balochistan</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {form.formState.errors.province && (
                                        <p className="text-sm text-destructive">
                                            {form.formState.errors.province.message}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Site In-charge */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-sm text-muted-foreground">Site In-charge (Optional)</h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="site_incharge_name">Name</Label>
                                    <Input
                                        id="site_incharge_name"
                                        placeholder="In-charge name"
                                        {...form.register('site_incharge_name')}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="site_incharge_phone">Phone</Label>
                                    <Input
                                        id="site_incharge_phone"
                                        placeholder="+92 300 1234567"
                                        {...form.register('site_incharge_phone')}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Capacity */}
                        <div className="space-y-2">
                            <Label htmlFor="required_guards">Required Guards</Label>
                            <Input
                                id="required_guards"
                                type="number"
                                min="1"
                                defaultValue="1"
                                placeholder="Number of guards needed"
                                className="w-full sm:w-1/2"
                                {...form.register('required_guards')}
                            />
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                placeholder="Additional notes"
                                className="resize-none"
                                rows={2}
                                {...form.register('notes')}
                            />
                        </div>

                        {/* Form Actions */}
                        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting}
                                className="w-full sm:w-auto"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || !form.formState.isValid}
                                className="w-full sm:w-auto"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Branch'
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
