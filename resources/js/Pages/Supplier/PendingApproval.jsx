/* global route */
import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { Clock, Mail, LogOut, Building2, RefreshCw, AlertCircle } from 'lucide-react';

export default function PendingApproval({ supplierName, status, rejectionReason, submittedAt }) {
    const isRejected = status === 'rejected';

    return (
        <>
            <Head title="Supplier Verification Status" />

            <div className="min-h-screen bg-[#FDFBF9] flex items-center justify-center p-4 font-sans">
                <div className="w-full max-w-[480px] text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Status Icon */}
                    <div className={`mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl border shadow-sm ${
                        isRejected ? 'border-red-200 bg-red-50 text-red-600' : 'border-amber-200 bg-amber-50 text-amber-600'
                    }`}>
                        {isRejected ? <AlertCircle size={36} strokeWidth={2.5} /> : <Clock size={36} strokeWidth={2.5} />}
                    </div>

                    {/* Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 text-center">
                        <h1 className="text-xl font-bold text-stone-900 tracking-tight font-serif">
                            {isRejected ? 'Application Needs Revision' : 'Supplier Verification Under Review'}
                        </h1>
                        <p className="mt-2 text-sm text-stone-600 leading-relaxed">
                            {isRejected
                                ? 'Your wholesale supplier application could not be approved at this time.'
                                : 'Thank you for submitting your business credentials. Our administrative team is reviewing your business permit.'}
                        </p>

                        {/* Status Alert */}
                        <div className={`mt-6 flex items-center justify-center gap-2 rounded-xl border py-3 px-4 ${
                            isRejected
                                ? 'border-red-100 bg-red-50 text-red-700'
                                : 'border-amber-100 bg-amber-50 text-amber-700'
                        }`}>
                            {!isRejected && <RefreshCw size={14} className="animate-spin" />}
                            <span className="text-xs font-bold tracking-wide uppercase">
                                {isRejected ? 'Application Rejected' : 'Audit In Progress'}
                            </span>
                        </div>

                        {isRejected && rejectionReason && (
                            <div className="mt-4 rounded-xl border border-red-200 bg-red-50/50 p-4 text-left">
                                <p className="text-xs font-bold text-red-800 uppercase tracking-wider mb-1">Reason provided:</p>
                                <p className="text-xs text-red-700 font-medium leading-relaxed">{rejectionReason}</p>
                            </div>
                        )}

                        {/* Company Summary */}
                        <div className="mt-6 rounded-xl border border-stone-100 bg-[#FCF7F2] p-4 text-left">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white shadow-sm text-clay-600">
                                    <Building2 size={20} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-bold text-stone-900">{supplierName || 'Wholesale Supplier'}</p>
                                    <p className="truncate text-xs text-stone-500">Submitted: {submittedAt || 'Recently'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Info details */}
                        {!isRejected && (
                            <div className="mt-6 space-y-3 text-left">
                                <div className="flex items-start gap-3">
                                    <Mail size={16} className="mt-0.5 shrink-0 text-stone-400" />
                                    <p className="text-xs text-stone-600 leading-relaxed">
                                        You will receive an email confirmation once your business credentials and warehouse coordinates are approved.
                                    </p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Clock size={16} className="mt-0.5 shrink-0 text-stone-400" />
                                    <p className="text-xs text-stone-600 leading-relaxed">
                                        Supplier onboarding audits typically take 1–2 business days.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="mt-8 pt-6 border-t border-stone-100 flex flex-col gap-2">
                            {isRejected && (
                                <Link
                                    href={route('supplier.setup')}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-clay-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-clay-700 transition-colors shadow-xs"
                                >
                                    <RefreshCw size={14} /> Revise Application & Warehouse Info
                                </Link>
                            )}
                            <Link
                                href={route('logout')}
                                method="post"
                                as="button"
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition-colors"
                            >
                                <LogOut size={14} /> Log Out
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
