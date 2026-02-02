'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
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
import { updateClient } from '@/lib/api/clients';
import type { Client } from '@/types/client';
import { Loader2 } from 'lucide-react';

const editClientSchema = z.object({
    client_name: z.string().min(3, 'Client name is required'),
    client_type: z.enum(['corporate', 'government', 'individual', 'ngo']),
    primary_contact_name: z.string().optional(),
    primary_contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
    primary_contact_phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    postal_code: z.string().optional(),
    industry: z.string().optional(),
    status: z.enum(['prospect', 'active', 'suspended', 'inactive']),
    notes: z.string().optional(),
});

type EditClientFormData = z.infer<typeof editClientSchema>;

interface EditClientDrawerProps {
    client: Client;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditClientDrawer({ client, open, onOpenChange }: EditClientDrawerProps) {
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const router = useRouter();
    const { toast } = useToast();

    const form = useForm<EditClientFormData>({
        resolver: zodResolver(editClientSchema),
        defaultValues: {
            client_name: client.client_name,
            client_type: client.client_type,
            primary_contact_name: client.primary_contact_name || '',
            primary_contact_email: client.primary_contact_email || '',
            primary_contact_phone: client.primary_contact_phone || '',
            address: client.address || '',
            city: client.city || '',
            province: client.province || '',
            postal_code: client.postal_code || '',
            industry: client.industry || '',
            status: client.status,
            notes: client.notes || '',
        },
        mode: 'onChange',
    });

    const onSubmit = async (data: EditClientFormData) => {
        setIsSubmitting(true);

        try {
            console.log('📝 Updating client:', client.id, data);
            
            const result = await updateClient(client.id, data);
            
            console.log('✅ Update result:', result);
            
            // Show appropriate success message
            if (result.client) {
                // Super admin - client updated directly
                toast({
                    title: 'Client updated successfully!',
                    description: `${data.client_name} has been updated.`,
                });
            } else if (result.approvalRequestId) {
                // Regular user - approval request submitted
                toast({
                    title: 'Update request submitted!',
                    description: `Your changes to ${data.client_name} have been sent to admin for approval.`,
                });
            }
            
            onOpenChange(false);
            router.refresh();
            
        } catch (error) {
            console.error('❌ Error updating client:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to update client',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="max-h-[95vh] flex flex-col">
                <DrawerHeader className="border-b flex-shrink-0">
                    <DrawerTitle>Edit Client</DrawerTitle>
                    <DrawerDescription>
                        Update client information - {client.client_code}
                    </DrawerDescription>
                </DrawerHeader>

                <div className="flex-1 overflow-y-auto">
                    <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 max-w-3xl mx-auto space-y-6">
                        {/* Basic Information */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-sm text-muted-foreground">Basic Information</h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="client_name">
                                        Client Name <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="client_name"
                                        placeholder="Client name"
                                        {...form.register('client_name')}
                                    />
                                    {form.formState.errors.client_name && (
                                        <p className="text-sm text-destructive">
                                            {form.formState.errors.client_name.message}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="client_type">
                                        Client Type <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={form.watch('client_type')}
                                        onValueChange={(value) => form.setValue('client_type', value as any, { shouldValidate: true })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="corporate">Corporate</SelectItem>
                                            <SelectItem value="government">Government</SelectItem>
                                            <SelectItem value="individual">Individual</SelectItem>
                                            <SelectItem value="ngo">NGO</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="industry">Industry</Label>
                                    <Input
                                        id="industry"
                                        placeholder="e.g. Banking, Retail"
                                        {...form.register('industry')}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Select
                                        value={form.watch('status')}
                                        onValueChange={(value) => form.setValue('status', value as any, { shouldValidate: true })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="prospect">Prospect</SelectItem>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="suspended">Suspended</SelectItem>
                                            <SelectItem value="inactive">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-sm text-muted-foreground">Contact Information</h3>
                            
                            <div className="space-y-2">
                                <Label htmlFor="primary_contact_name">Contact Person Name</Label>
                                <Input
                                    id="primary_contact_name"
                                    placeholder="Contact person"
                                    {...form.register('primary_contact_name')}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="primary_contact_email">Email</Label>
                                    <Input
                                        id="primary_contact_email"
                                        type="email"
                                        placeholder="email@example.com"
                                        {...form.register('primary_contact_email')}
                                    />
                                    {form.formState.errors.primary_contact_email && (
                                        <p className="text-sm text-destructive">
                                            {form.formState.errors.primary_contact_email.message}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="primary_contact_phone">Phone</Label>
                                    <Input
                                        id="primary_contact_phone"
                                        placeholder="+92 300 1234567"
                                        {...form.register('primary_contact_phone')}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Address Information */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-sm text-muted-foreground">Address</h3>
                            
                            <div className="space-y-2">
                                <Label htmlFor="address">Street Address</Label>
                                <Textarea
                                    id="address"
                                    placeholder="Complete address"
                                    className="resize-none"
                                    rows={2}
                                    {...form.register('address')}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="city">City</Label>
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
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="province">Province</Label>
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
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="postal_code">Postal Code</Label>
                                    <Input
                                        id="postal_code"
                                        placeholder="54000"
                                        {...form.register('postal_code')}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                placeholder="Additional notes"
                                className="resize-none"
                                rows={3}
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
                                        Saving...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
