'use client';

import * as React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Check, ArrowRight, Building2, ArrowLeft, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createClient, createBranch } from '@/lib/api/clients';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

// Schema Definitions
const basicInfoSchema = z.object({
    clientName: z.string().min(3, 'Client name is required (min 3 characters)'),
    clientType: z.enum(['corporate', 'government', 'individual', 'ngo']),
    clientEmail: z.string().email('Invalid email format').optional().or(z.literal('')),
    enrollmentDate: z.string(),
});

const contactInfoSchema = z.object({
    contactPerson: z.string().min(2, 'Contact person name is required'),
    contactNumber: z.string().regex(/^(\+92|0)?3\d{9}$/, 'Invalid mobile number format'),
    clientLocation: z.string().min(2, 'Location/city is required'),
    postalCode: z.string().optional(),
    headOfficeAddress: z.string().min(10, 'Complete head office address is required'),
});

const introducerSchema = z.object({
    introducerName: z.string().optional(),
    introducerContact: z.string().optional(),
    introducerAddress: z.string().optional(),
    introducerCnic: z.string().optional(),
});

const weaponSchema = z.object({
    licenseNumber: z.string().optional(),
    serialNumber: z.string().optional(),
});

const operationalSchema = z.object({
    operationalTerritory: z.array(z.string()).optional(),
});

const branchSchema = z.object({
    branchName: z.string().min(3, 'Branch name is required'),
    branchAddress: z.string().min(10, 'Complete branch address is required'),
    branchCity: z.string().min(2, 'City is required'),
    branchProvince: z.string().min(2, 'Province is required'),
    siteInchargeName: z.string().optional(),
    siteInchargePhone: z.string().optional(),
    requiredGuards: z.string().optional(),
});

// Combined Schema
const clientFormSchema = z.intersection(
    z.intersection(
        z.intersection(basicInfoSchema, contactInfoSchema),
        introducerSchema
    ),
    z.intersection(z.intersection(weaponSchema, operationalSchema), branchSchema)
);

type ClientFormData = z.infer<typeof clientFormSchema>;

const STEPS = [
    { id: 1, title: 'Basic Information', description: 'Client details' },
    { id: 2, title: 'Contact Information', description: 'Contact person and address' },
    { id: 3, title: 'Branch Details', description: 'Add first branch' },
    { id: 4, title: 'Introducer/Referral', description: 'Referral information' },
    { id: 5, title: 'Assign Weapon', description: 'Weapon assignment' },
    { id: 6, title: 'Operational Territory', description: 'Service areas' },
];

export function CreateClientDrawer() {
    const [open, setOpen] = React.useState(false);
    const [step, setStep] = React.useState(1);
    const [formData, setFormData] = React.useState<Partial<ClientFormData>>({});
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const router = useRouter();
    const { toast } = useToast();

    // Step 1 Form - Basic Information
    const form1 = useForm<z.infer<typeof basicInfoSchema>>({
        resolver: zodResolver(basicInfoSchema),
        defaultValues: {
            clientName: '',
            clientType: 'corporate',
            clientEmail: '',
            enrollmentDate: new Date().toISOString().split('T')[0],
        },
        mode: 'onChange'
    });

    // Step 2 Form - Contact Information
    const form2 = useForm<z.infer<typeof contactInfoSchema>>({
        resolver: zodResolver(contactInfoSchema),
        defaultValues: {
            contactPerson: '',
            contactNumber: '',
            clientLocation: '',
            postalCode: '',
            headOfficeAddress: '',
        },
        mode: 'onChange'
    });

    // Step 3 Form - Branch Details
    const form3 = useForm<z.infer<typeof branchSchema>>({
        resolver: zodResolver(branchSchema),
        defaultValues: {
            branchName: '',
            branchAddress: '',
            branchCity: '',
            branchProvince: '',
            siteInchargeName: '',
            siteInchargePhone: '',
            requiredGuards: '1',
        },
        mode: 'onChange'
    });

    // Step 4 Form - Introducer/Referral
    const form4 = useForm<z.infer<typeof introducerSchema>>({
        resolver: zodResolver(introducerSchema),
        defaultValues: {
            introducerName: '',
            introducerContact: '',
            introducerAddress: '',
            introducerCnic: '',
        },
        mode: 'onChange'
    });

    // Step 5 Form - Weapon Assignment
    const form5 = useForm<z.infer<typeof weaponSchema>>({
        resolver: zodResolver(weaponSchema),
        defaultValues: {
            licenseNumber: '',
            serialNumber: '',
        },
        mode: 'onChange'
    });

    // Step 6 Form - Operational Territory
    const form6 = useForm<z.infer<typeof operationalSchema>>({
        resolver: zodResolver(operationalSchema),
        defaultValues: {
            operationalTerritory: [],
        },
        mode: 'onChange'
    });

    const onStep1Submit: SubmitHandler<z.infer<typeof basicInfoSchema>> = (data) => {
        setFormData((prev) => ({ ...prev, ...data }));
        setStep(2);
    };

    const onStep2Submit: SubmitHandler<z.infer<typeof contactInfoSchema>> = (data) => {
        setFormData((prev) => ({ ...prev, ...data }));
        setStep(3);
    };

    const onStep3Submit: SubmitHandler<z.infer<typeof branchSchema>> = (data) => {
        setFormData((prev) => ({ ...prev, ...data }));
        setStep(4);
    };

    const onStep4Submit: SubmitHandler<z.infer<typeof introducerSchema>> = (data) => {
        setFormData((prev) => ({ ...prev, ...data }));
        setStep(5);
    };

    const onStep5Submit: SubmitHandler<z.infer<typeof weaponSchema>> = (data) => {
        setFormData((prev) => ({ ...prev, ...data }));
        setStep(6);
    };

    const onFinalSubmit: SubmitHandler<z.infer<typeof operationalSchema>> = async (data) => {
        const finalData = { ...formData, ...data };
        console.log('📋 Creating client with data:', finalData);
        
        setIsSubmitting(true);
        
        try {
            // Map form data to client data structure
            const clientData = {
                client_name: finalData.clientName!,
                client_type: finalData.clientType as 'corporate' | 'government' | 'individual' | 'ngo',
                primary_contact_name: finalData.contactPerson,
                primary_contact_email: finalData.clientEmail || undefined,
                primary_contact_phone: finalData.contactNumber,
                address: finalData.headOfficeAddress,
                city: finalData.clientLocation,
                postal_code: finalData.postalCode,
                status: 'active' as const,
                notes: [
                    finalData.introducerName && `Introducer: ${finalData.introducerName}`,
                    finalData.introducerContact && `Introducer Contact: ${finalData.introducerContact}`,
                    finalData.introducerCnic && `Introducer CNIC: ${finalData.introducerCnic}`,
                    finalData.licenseNumber && `License: ${finalData.licenseNumber}`,
                    finalData.serialNumber && `Serial: ${finalData.serialNumber}`,
                ].filter(Boolean).join('\n'),
            };

            // Prepare branch data
            const branchData = finalData.branchName ? {
                branch_name: finalData.branchName,
                address: finalData.branchAddress!,
                city: finalData.branchCity!,
                province: finalData.branchProvince!,
                site_incharge_name: finalData.siteInchargeName || undefined,
                site_incharge_phone: finalData.siteInchargePhone || undefined,
                required_guards: finalData.requiredGuards ? parseInt(finalData.requiredGuards) : 0,
                status: 'active' as const,
            } : null;

            console.log('🚀 Creating client:', clientData);
            console.log('🏢 Branch data:', branchData);
            
            const result = await createClient(clientData, branchData);
            
            console.log('✅ Result:', result);
            
            // Show appropriate success message based on result
            if (result.client) {
                // Super admin - client created directly
                toast({
                    title: 'Client created successfully!',
                    description: `${finalData.clientName} has been added to the system.`,
                });
            } else if (result.approvalRequestId) {
                // Regular user - approval request submitted
                toast({
                    title: 'Approval request submitted!',
                    description: `${finalData.clientName} creation request has been sent to admin for approval.`,
                });
            }
            
            // Reset form and close drawer
            setOpen(false);
            setStep(1);
            form1.reset();
            form2.reset();
            form3.reset();
            form4.reset();
            form5.reset();
            form6.reset();
            setFormData({});
            setIsSubmitting(false);
            
            // Refresh the page
            router.refresh();
            
        } catch (error) {
            console.error('❌ Error creating client:', error);
            toast({
                title: 'Failed to create client',
                description: error instanceof Error ? error.message : 'An unexpected error occurred.',
                variant: 'destructive',
            });
            setIsSubmitting(false);
        }
    };

    const goBack = () => {
        if (step > 1) setStep(step - 1);
    };

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Client
                </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[95vh] flex flex-col">
                <DrawerHeader className="border-b flex-shrink-0">
                    <DrawerTitle>CLIENT ENROLMENT FORM</DrawerTitle>
                    <DrawerDescription>
                        Complete client registration in {STEPS.length} steps
                    </DrawerDescription>
                </DrawerHeader>

                {/* Progress Steps */}
                <div className="px-4 py-3 border-b flex-shrink-0 overflow-x-auto">
                    <div className="flex items-center justify-between min-w-max">
                        {STEPS.map((s) => (
                            <div key={s.id} className="flex items-center">
                                <div className="flex flex-col items-center">
                                    <div
                                        className={cn(
                                            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                                            step === s.id
                                                ? 'bg-primary text-primary-foreground'
                                                : step > s.id
                                                ? 'bg-primary/20 text-primary'
                                                : 'bg-muted text-muted-foreground'
                                        )}
                                    >
                                        {step > s.id ? <Check className="h-4 w-4" /> : s.id}
                                    </div>
                                    <p className="text-xs mt-1 text-center max-w-[80px]">{s.title}</p>
                                </div>
                                {s.id < STEPS.length && (
                                    <div className={cn(
                                        'w-12 h-0.5 mx-2 transition-colors',
                                        step > s.id ? 'bg-primary' : 'bg-muted'
                                    )} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <ScrollArea className="flex-1 overflow-y-auto">
                    <div className="p-6 max-w-4xl mx-auto">
                    {/* Step 1: Basic Information */}
                    {step === 1 && (
                        <form onSubmit={form1.handleSubmit(onStep1Submit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="clientName">
                                        Client's Name <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="clientName"
                                        placeholder="Client's Name"
                                        {...form1.register('clientName')}
                                    />
                                    {form1.formState.errors.clientName && (
                                        <p className="text-sm text-destructive">
                                            {form1.formState.errors.clientName.message}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="clientEmail">
                                        Client's Email <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="clientEmail"
                                        type="email"
                                        placeholder="Client's Email"
                                        {...form1.register('clientEmail')}
                                    />
                                    {form1.formState.errors.clientEmail && (
                                        <p className="text-sm text-destructive">
                                            {form1.formState.errors.clientEmail.message}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="clientType">
                                        Client Type <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={form1.watch('clientType')}
                                        onValueChange={(value) => form1.setValue('clientType', value as any)}
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

                                <div className="space-y-2">
                                    <Label htmlFor="enrollmentDate">
                                        Enrollment Date <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="enrollmentDate"
                                        type="date"
                                        {...form1.register('enrollmentDate')}
                                    />
                                    <p className="text-xs text-red-500">
                                        PLEASE ENTER CORRECT ENROLLMENT DATE FOR ACCURATE REPORTING
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button type="submit" disabled={!form1.formState.isValid}>
                                    Next
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* Step 2: Contact Information */}
                    {step === 2 && (
                        <form onSubmit={form2.handleSubmit(onStep2Submit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="contactPerson">
                                        Contact Person <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="contactPerson"
                                        placeholder="Contact Person"
                                        {...form2.register('contactPerson')}
                                    />
                                    {form2.formState.errors.contactPerson && (
                                        <p className="text-sm text-destructive">
                                            {form2.formState.errors.contactPerson.message}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="contactNumber">
                                        Contact Number <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="contactNumber"
                                        placeholder="Contact Number"
                                        {...form2.register('contactNumber')}
                                    />
                                    {form2.formState.errors.contactNumber && (
                                        <p className="text-sm text-destructive">
                                            {form2.formState.errors.contactNumber.message}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="clientLocation">
                                        Client Location <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={form2.watch('clientLocation')}
                                        onValueChange={(value) => form2.setValue('clientLocation', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select location" />
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
                                    <Label htmlFor="postalCode">Client's Postal Code</Label>
                                    <Input
                                        id="postalCode"
                                        placeholder="Client's Postal Code"
                                        {...form2.register('postalCode')}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="headOfficeAddress">
                                    Head Office Address <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    id="headOfficeAddress"
                                    placeholder="Head Office Address"
                                    {...form2.register('headOfficeAddress')}
                                    rows={3}
                                />
                                {form2.formState.errors.headOfficeAddress && (
                                    <p className="text-sm text-destructive">
                                        {form2.formState.errors.headOfficeAddress.message}
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-between pt-4">
                                <Button type="button" variant="outline" onClick={goBack}>
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back
                                </Button>
                                <Button type="submit" disabled={!form2.formState.isValid}>
                                    Next
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* Step 3: Branch Details */}
                    {step === 3 && (
                        <form onSubmit={form3.handleSubmit(onStep3Submit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="branchName">
                                    Branch Name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="branchName"
                                    placeholder="Main Branch / Head Office"
                                    {...form3.register('branchName')}
                                />
                                {form3.formState.errors.branchName && (
                                    <p className="text-sm text-destructive">
                                        {form3.formState.errors.branchName.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="branchAddress">
                                    Branch Address <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    id="branchAddress"
                                    placeholder="Complete branch address"
                                    {...form3.register('branchAddress')}
                                    rows={3}
                                />
                                {form3.formState.errors.branchAddress && (
                                    <p className="text-sm text-destructive">
                                        {form3.formState.errors.branchAddress.message}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="branchCity">
                                        City <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={form3.watch('branchCity')}
                                        onValueChange={(value) => form3.setValue('branchCity', value, { shouldValidate: true })}
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
                                    {form3.formState.errors.branchCity && (
                                        <p className="text-sm text-destructive">
                                            {form3.formState.errors.branchCity.message}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="branchProvince">
                                        Province <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={form3.watch('branchProvince')}
                                        onValueChange={(value) => form3.setValue('branchProvince', value, { shouldValidate: true })}
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
                                    {form3.formState.errors.branchProvince && (
                                        <p className="text-sm text-destructive">
                                            {form3.formState.errors.branchProvince.message}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="siteInchargeName">Site In-charge Name</Label>
                                    <Input
                                        id="siteInchargeName"
                                        placeholder="In-charge name"
                                        {...form3.register('siteInchargeName')}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="siteInchargePhone">Site In-charge Phone</Label>
                                    <Input
                                        id="siteInchargePhone"
                                        placeholder="Phone number"
                                        {...form3.register('siteInchargePhone')}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="requiredGuards">Required Guards</Label>
                                <Input
                                    id="requiredGuards"
                                    type="number"
                                    min="1"
                                    defaultValue="1"
                                    placeholder="Number of guards needed"
                                    className="w-full sm:w-1/2"
                                    {...form3.register('requiredGuards')}
                                />
                                {form3.formState.errors.requiredGuards && (
                                    <p className="text-sm text-destructive">
                                        {form3.formState.errors.requiredGuards.message}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-6 mt-6 border-t">
                                <Button type="button" variant="outline" onClick={goBack} className="w-full sm:w-auto">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back
                                </Button>
                                <Button type="submit" disabled={!form3.formState.isValid} className="w-full sm:w-auto">
                                    Next
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* Step 4: Introducer/Referral */}
                    {step === 4 && (
                        <form onSubmit={form4.handleSubmit(onStep4Submit)} className="space-y-4">\n                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="introducerName">Name</Label>
                                    <Input
                                        id="introducerName"
                                        placeholder="Name"
                                        {...form4.register('introducerName')}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="introducerContact">Contact Number</Label>
                                    <Input
                                        id="introducerContact"
                                        placeholder="Contact Number"
                                        {...form4.register('introducerContact')}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="introducerAddress">Address</Label>
                                    <Input
                                        id="introducerAddress"
                                        placeholder="Address"
                                        {...form4.register('introducerAddress')}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="introducerCnic">CNIC Number</Label>
                                    <Input
                                        id="introducerCnic"
                                        placeholder="CNIC Number"
                                        {...form4.register('introducerCnic')}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between pt-4">
                                <Button type="button" variant="outline" onClick={goBack}>
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back
                                </Button>
                                <Button type="submit">
                                    Next
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* Step 5: Assign Weapon */}
                    {step === 5 && (
                        <form onSubmit={form5.handleSubmit(onStep5Submit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="licenseNumber">License Number</Label>
                                    <Input
                                        id="licenseNumber"
                                        placeholder="License"
                                        {...form5.register('licenseNumber')}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="serialNumber">Serial Number</Label>
                                    <Input
                                        id="serialNumber"
                                        placeholder="Serial"
                                        {...form5.register('serialNumber')}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between pt-4">
                                <Button type="button" variant="outline" onClick={goBack}>
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back
                                </Button>
                                <Button type="submit">
                                    Next
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* Step 6: Operational Territory */}
                    {step === 6 && (
                        <form onSubmit={form6.handleSubmit(onFinalSubmit)} className="space-y-4">\n                            <div className="space-y-2">
                                <Label htmlFor="operationalTerritory">Operational Provinces</Label>
                                <Select>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Operational Territory" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="punjab">Punjab</SelectItem>
                                        <SelectItem value="sindh">Sindh</SelectItem>
                                        <SelectItem value="kpk">KPK</SelectItem>
                                        <SelectItem value="balochistan">Balochistan</SelectItem>
                                        <SelectItem value="gilgit">Gilgit-Baltistan</SelectItem>
                                        <SelectItem value="ajk">AJK</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex justify-between pt-4">
                                <Button type="button" variant="outline" onClick={goBack}>
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="mr-2 h-4 w-4" />
                                            Submit
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    )}
                    </div>
                </ScrollArea>
            </DrawerContent>
        </Drawer>
    );
}
