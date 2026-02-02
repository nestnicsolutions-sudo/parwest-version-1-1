'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, MapPin } from 'lucide-react';
import { createBranch } from '@/lib/api/clients';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const branchSchema = z.object({
    branch_code: z.string().min(2, 'Branch code is required'),
    branch_name: z.string().min(3, 'Branch name is required'),
    address: z.string().min(10, 'Complete address is required'),
    city: z.string().min(2, 'City is required'),
    province: z.string().optional(),
    site_incharge_name: z.string().optional(),
    site_incharge_phone: z.string().optional(),
    required_guards: z.number().min(0, 'Required guards must be 0 or more'),
    notes: z.string().optional(),
});

type BranchFormData = z.infer<typeof branchSchema>;

interface AddBranchDialogProps {
    clientId: string;
    clientName: string;
}

export function AddBranchDialog({ clientId, clientName }: AddBranchDialogProps) {
    const [open, setOpen] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const router = useRouter();
    const { toast } = useToast();

    const form = useForm<BranchFormData>({
        resolver: zodResolver(branchSchema),
        defaultValues: {
            branch_code: '',
            branch_name: '',
            address: '',
            city: '',
            province: '',
            site_incharge_name: '',
            site_incharge_phone: '',
            required_guards: 0,
            notes: '',
        },
        mode: 'onChange'
    });

    const onSubmit = async (data: BranchFormData) => {
        setIsSubmitting(true);
        
        try {
            await createBranch({
                ...data,
                client_id: clientId,
                status: 'active',
            });

            toast({
                title: 'Branch added successfully!',
                description: `${data.branch_name} has been added to ${clientName}.`,
            });

            setOpen(false);
            form.reset();
            router.refresh();
        } catch (error) {
            console.error('Error creating branch:', error);
            toast({
                title: 'Failed to add branch',
                description: error instanceof Error ? error.message : 'An unexpected error occurred.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Branch
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add New Branch</DialogTitle>
                    <DialogDescription>
                        Add a new branch location for {clientName}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="branch_code">
                                Branch Code <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="branch_code"
                                placeholder="e.g., BR001"
                                {...form.register('branch_code')}
                            />
                            {form.formState.errors.branch_code && (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.branch_code.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="branch_name">
                                Branch Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="branch_name"
                                placeholder="e.g., Main Branch"
                                {...form.register('branch_name')}
                            />
                            {form.formState.errors.branch_name && (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.branch_name.message}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">
                            Address <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="address"
                            placeholder="Complete branch address"
                            {...form.register('address')}
                            rows={3}
                        />
                        {form.formState.errors.address && (
                            <p className="text-sm text-destructive">
                                {form.formState.errors.address.message}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="city">
                                City <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="city"
                                placeholder="e.g., Lahore"
                                {...form.register('city')}
                            />
                            {form.formState.errors.city && (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.city.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="province">Province</Label>
                            <Input
                                id="province"
                                placeholder="e.g., Punjab"
                                {...form.register('province')}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="site_incharge_name">Site In-Charge Name</Label>
                            <Input
                                id="site_incharge_name"
                                placeholder="Person in charge"
                                {...form.register('site_incharge_name')}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="site_incharge_phone">Site In-Charge Phone</Label>
                            <Input
                                id="site_incharge_phone"
                                placeholder="+92 300 1234567"
                                {...form.register('site_incharge_phone')}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="required_guards">
                            Required Guards <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="required_guards"
                            type="number"
                            min="0"
                            placeholder="Number of guards needed"
                            {...form.register('required_guards')}
                        />
                        {form.formState.errors.required_guards && (
                            <p className="text-sm text-destructive">
                                {form.formState.errors.required_guards.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            placeholder="Additional notes or instructions"
                            {...form.register('notes')}
                            rows={3}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <MapPin className="mr-2 h-4 w-4" />
                                    Create Branch
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
