'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Mail, Phone, MapPin, Building, FileText, CreditCard } from 'lucide-react';
import type { ClientDetail } from '@/types/client';

interface ClientOverviewProps {
    client: ClientDetail;
}

export function ClientOverview({ client }: ClientOverviewProps) {
    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Business Information */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Business Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">Company Name</label>
                            <span className="font-medium">{client.client_name}</span>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">Status</label>
                            <span className="font-medium capitalize">{client.status}</span>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">Client Code</label>
                            <span className="font-medium">{client.client_code}</span>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">Client Type</label>
                            <span className="font-medium capitalize">{client.client_type}</span>
                        </div>
                        {client.tax_id && (
                            <div>
                                <label className="text-xs text-muted-foreground block mb-1">Tax ID</label>
                                <span className="font-medium">{client.tax_id}</span>
                            </div>
                        )}
                        {client.registration_number && (
                            <div>
                                <label className="text-xs text-muted-foreground block mb-1">Reg No</label>
                                <span className="font-medium">{client.registration_number}</span>
                            </div>
                        )}
                    </div>
                    {client.address && (
                        <>
                            <Separator />
                            <div>
                                <label className="text-xs text-muted-foreground block mb-1">Head Office Address</label>
                                <span className="font-medium text-sm block mb-2">{client.address}</span>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <MapPin className="h-3 w-3" />
                                    {client.city || 'N/A'}, {client.province || 'N/A'}
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Contact Person */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Key Contact
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                            {client.primary_contact_name?.charAt(0) || 'C'}
                        </div>
                        <div>
                            <h3 className="font-medium">{client.primary_contact_name || 'N/A'}</h3>
                            <p className="text-sm text-muted-foreground">Primary Contact</p>
                        </div>
                    </div>
                    <Separator />
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                <span>Mobile</span>
                            </div>
                            <span className="font-medium">{client.primary_contact_phone || '—'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                <span>Landline</span>
                            </div>
                            <span className="font-medium">—</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="h-4 w-4" />
                                <span>Email</span>
                            </div>
                            <span className="font-medium hover:underline cursor-pointer">{client.primary_contact_email || '—'}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Contract Summary */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Service Agreement
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">Contract Start</label>
                            <span className="font-medium">{client.contracts?.[0]?.start_date || '—'}</span>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">Contract Expiry</label>
                            <span className="font-medium text-warning">{client.contracts?.[0]?.end_date || '—'}</span>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">Billing Cycle</label>
                            <span className="font-medium">{client.contracts?.[0]?.payment_frequency || '—'}</span>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">Payment Terms</label>
                            <span className="font-medium">{client.payment_terms || 'Net 15 Days'}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Service Stats */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base">Current Service Scale</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-muted/50 p-4 rounded-lg text-center">
                            <span className="text-3xl font-bold block mb-1">{client.total_branches}</span>
                            <span className="text-xs text-muted-foreground uppercase tracking-wide">Active Sites</span>
                        </div>
                        <div className="bg-muted/50 p-4 rounded-lg text-center">
                            <span className="text-3xl font-bold block mb-1 text-primary">{client.active_guards}</span>
                            <span className="text-xs text-muted-foreground uppercase tracking-wide">Deployed Guards</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
