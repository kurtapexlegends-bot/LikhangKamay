import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import UserAvatar from '@/Components/UserAvatar';
import { ArrowLeft, ExternalLink, FileText, MapPin, Phone, Store } from 'lucide-react';

const DetailRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3">
        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-600">
            <Icon size={16} />
        </div>
        <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{label}</p>
            <p className="mt-1 text-sm font-medium text-stone-800">{value || '-'}</p>
        </div>
    </div>
);

const documents = (artisan) => ([
    { key: 'business_permit', label: 'Business Permit', href: artisan?.business_permit },
    { key: 'dti_registration', label: 'DTI Registration', href: artisan?.dti_registration },
    { key: 'valid_id', label: 'Valid ID', href: artisan?.valid_id },
    { key: 'tin_id', label: 'TIN ID', href: artisan?.tin_id },
]).filter((document) => document.href);

export default function ViewArtisan({ artisan }) {
    return (
        <AdminLayout title="Artisan Review">
            <Head title={artisan?.shop_name || artisan?.name || 'Artisan Review'} />

            <div className="mx-auto max-w-5xl space-y-6">
                <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <UserAvatar user={artisan} className="h-14 w-14 border border-stone-200" />
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-stone-900">{artisan?.shop_name || artisan?.name}</h1>
                            <p className="mt-1 text-sm text-stone-500">Detailed artisan application review.</p>
                        </div>
                    </div>

                    <Link
                        href={route('admin.pending')}
                        className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm font-bold text-stone-600 transition hover:border-stone-300 hover:bg-white"
                    >
                        <ArrowLeft size={16} />
                        Back to Pending Queue
                    </Link>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <DetailRow icon={Store} label="Shop Name" value={artisan?.shop_name} />
                    <DetailRow icon={Phone} label="Phone Number" value={artisan?.phone_number} />
                    <DetailRow icon={MapPin} label="Address" value={artisan?.address} />
                    <DetailRow icon={FileText} label="Application Status" value={artisan?.artisan_status} />
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
                    <div className="border-b border-stone-100 px-5 py-4">
                        <h2 className="text-lg font-bold text-stone-900">Submitted Documents</h2>
                        <p className="mt-1 text-sm text-stone-500">Open the submitted files in a new tab for manual review.</p>
                    </div>

                    <div className="grid gap-4 p-5 md:grid-cols-2">
                        {documents(artisan).length > 0 ? documents(artisan).map((document) => (
                            <a
                                key={document.key}
                                href={document.href}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-300 hover:bg-white"
                            >
                                <span>{document.label}</span>
                                <ExternalLink size={16} />
                            </a>
                        )) : (
                            <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500 md:col-span-2">
                                No uploaded documents are available for this artisan.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
