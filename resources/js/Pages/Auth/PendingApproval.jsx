import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { Clock, Mail, LogOut, Store, RefreshCw } from 'lucide-react';

export default function PendingApproval({ user }) {
    return (
        <>
            <Head title="Application Under Review" />
            
            <div className="min-h-screen bg-[#FDFBF9] flex items-center justify-center p-4 font-sans">
                <div className="w-full max-w-[460px] text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                    
                    {/* Icon */}
                    <div className="mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600 shadow-sm">
                        <Clock size={36} strokeWidth={2.5} />
                    </div>

                    {/* Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 text-center">
                        <h1 className="text-xl font-bold text-stone-900 tracking-tight">Application Under Review</h1>
                        <p className="mt-2 text-[13px] font-medium leading-relaxed text-stone-500">
                            Thank you for completing your seller setup! Our team is reviewing your application to ensure platform safety.
                        </p>

                        {/* Status Alert */}
                        <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-amber-100 bg-amber-50 py-3 px-4 text-amber-700">
                            <RefreshCw size={14} className="animate-spin" />
                            <span className="text-xs font-bold tracking-wide uppercase">Verification In Progress</span>
                        </div>

                        {/* Shop Info Summary */}
                        <div className="mt-6 rounded-xl border border-stone-100 bg-[#FCF7F2] p-4 text-left">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white shadow-sm">
                                    <Store size={18} className="text-stone-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-bold text-stone-900">{user?.shop_name || 'Your Shop'}</p>
                                    <p className="truncate text-xs text-stone-500">{user?.email}</p>
                                </div>
                            </div>
                        </div>

                        {/* Info List */}
                        <div className="mt-6 space-y-3 text-left">
                            <div className="flex items-start gap-3">
                                <Mail size={16} className="mt-0.5 shrink-0 text-stone-400" />
                                <p className="text-[13px] font-medium leading-relaxed text-stone-600">You'll receive an email once your application is approved or if we need more information.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <Clock size={16} className="mt-0.5 shrink-0 text-stone-400" />
                                <p className="text-[13px] font-medium leading-relaxed text-stone-600">Review typically takes 1-2 business days.</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-8 flex flex-col gap-2 pt-6 border-t border-stone-100">
                            <Link
                                href={route('shop.index')}
                                className="inline-flex w-full items-center justify-center rounded-xl bg-clay-600 px-4 py-2.5 text-[13px] font-bold text-white transition hover:bg-clay-700"
                            >
                                Browse Shop While Waiting
                            </Link>
                            <Link
                                href={route('logout')}
                                method="post"
                                as="button"
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white border border-stone-200 px-4 py-2.5 text-[13px] font-bold text-stone-700 transition hover:bg-stone-50"
                            >
                                <LogOut size={14} /> Sign Out
                            </Link>
                        </div>
                    </div>

                    {/* Footer */}
                    <p className="mt-6 text-xs font-medium text-stone-400">
                        Questions? Contact us at likhangkamaybusiness@gmail.com
                    </p>
                </div>
            </div>
        </>
    );
}
