'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createUserAction, type CreateUserData } from '@/lib/actions/users';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AddUserDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface Role {
    id: string;
    name: string;
    description: string | null;
}

export function AddUserDrawer({ open, onOpenChange }: AddUserDrawerProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loadingRoles, setLoadingRoles] = useState(true);

    // Form state
    const [formData, setFormData] = useState<CreateUserData>({
        email: '',
        password: '',
        full_name: '',
        role_id: '',
        org_id: '',
        phone: '',
        regional_office: '',
    });

    // Load roles and get current user's org_id
    useEffect(() => {
        async function loadDataAndSetup() {
            if (!open) return;

            console.log('📋 Loading roles and user org...');
            try {
                const supabase = createClient();
                
                // Get current user's profile for org_id
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('org_id')
                        .eq('id', user.id)
                        .single();
                    
                    if (profile?.org_id) {
                        setFormData(prev => ({ ...prev, org_id: profile.org_id }));
                        console.log('✅ Using org_id:', profile.org_id);
                    }
                }

                // Load roles
                const { data, error } = await supabase
                    .from('roles')
                    .select('id, name, description')
                    .order('name');

                if (error) {
                    console.error('❌ Error loading roles:', error);
                    toast({
                        title: 'Error',
                        description: 'Failed to load roles',
                        variant: 'destructive',
                    });
                    return;
                }

                console.log(`✅ Loaded ${data?.length || 0} roles`);
                setRoles(data || []);
            } catch (err) {
                console.error('❌ Exception loading data:', err);
            } finally {
                setLoadingRoles(false);
            }
        }

        if (open) {
            loadDataAndSetup();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.email || !formData.password || !formData.full_name || !formData.role_id) {
            toast({
                title: 'Validation Error',
                description: 'Please fill in all required fields',
                variant: 'destructive',
            });
            return;
        }

        if (formData.password.length < 6) {
            toast({
                title: 'Validation Error',
                description: 'Password must be at least 6 characters',
                variant: 'destructive',
            });
            return;
        }

        console.log('👤 Submitting new user:', formData.email);
        setIsSubmitting(true);

        try {
            console.log('📤 Calling server action...');
            const result = await createUserAction(formData);
            console.log('📥 Server action result:', result);

            if (!result.success) {
                console.error('❌ Server returned error:', result.error);
                throw new Error(result.error || 'Failed to create user');
            }

            console.log('✅ User created successfully:', result.data);

            toast({
                title: 'Success',
                description: `User ${formData.email} created successfully`,
            });

            // Reset form
            setFormData({
                email: '',
                password: '',
                full_name: '',
                role_id: '',
                org_id: '',
                phone: '',
                regional_office: '',
            });

            // Close drawer
            onOpenChange(false);

            // Refresh the page to show new user
            router.refresh();
        } catch (error: any) {
            console.error('❌ Error creating user:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to create user',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const generatePassword = () => {
        // Generate a random 12-character password
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData({ ...formData, password });
        toast({
            title: 'Password Generated',
            description: 'A secure password has been generated',
        });
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-xl overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Add New User</SheetTitle>
                    <SheetDescription>
                        Create a new system user with role-based access
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                    {/* Email */}
                    <div className="space-y-2">
                        <Label htmlFor="email">
                            Email <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="user@parwest.com"
                            value={formData.email}
                            onChange={(e) =>
                                setFormData({ ...formData, email: e.target.value })
                            }
                            required
                        />
                    </div>

                    {/* Full Name */}
                    <div className="space-y-2">
                        <Label htmlFor="full_name">
                            Full Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="full_name"
                            type="text"
                            placeholder="John Doe"
                            value={formData.full_name}
                            onChange={(e) =>
                                setFormData({ ...formData, full_name: e.target.value })
                            }
                            required
                        />
                    </div>

                    {/* Role */}
                    <div className="space-y-2">
                        <Label htmlFor="role_id">
                            Role <span className="text-destructive">*</span>
                        </Label>
                        <Select
                            value={formData.role_id}
                            onValueChange={(value) =>
                                setFormData({ ...formData, role_id: value })
                            }
                            disabled={loadingRoles}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                {roles.map((role) => (
                                    <SelectItem key={role.id} value={role.id}>
                                        <div className="flex flex-col items-start">
                                            <span className="font-medium">{role.name}</span>
                                            {role.description && (
                                                <span className="text-xs text-muted-foreground">
                                                    {role.description}
                                                </span>
                                            )}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <Label htmlFor="password">
                            Password <span className="text-destructive">*</span>
                        </Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Min. 6 characters"
                                    value={formData.password}
                                    onChange={(e) =>
                                        setFormData({ ...formData, password: e.target.value })
                                    }
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={generatePassword}
                            >
                                Generate
                            </Button>
                        </div>
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                            id="phone"
                            type="tel"
                            placeholder="+92 300 1234567"
                            value={formData.phone}
                            onChange={(e) =>
                                setFormData({ ...formData, phone: e.target.value })
                            }
                        />
                    </div>

                    {/* Regional Office */}
                    <div className="space-y-2">
                        <Label htmlFor="regional_office">Regional Office</Label>
                        <Select
                            value={formData.regional_office}
                            onValueChange={(value) =>
                                setFormData({ ...formData, regional_office: value })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select office" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="karachi">Karachi</SelectItem>
                                <SelectItem value="lahore">Lahore</SelectItem>
                                <SelectItem value="islamabad">Islamabad</SelectItem>
                                <SelectItem value="peshawar">Peshawar</SelectItem>
                                <SelectItem value="quetta">Quetta</SelectItem>
                                <SelectItem value="multan">Multan</SelectItem>
                                <SelectItem value="faisalabad">Faisalabad</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-1" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create User'
                            )}
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}
