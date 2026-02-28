import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { Clock, Mail, LogOut, Store, RefreshCw } from 'lucide-react';

export default function PendingApproval({ user }) {
    return (
        <>
            <Head title="Application Under Review" />
            
            <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
                <div className="w-full max-w-lg text-center">
                    {/* Icon */}
                    <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl animate-pulse">
                        <Clock size={48} className="text-white" />
                    </div>

                    {/* Card */}
                    <div className="bg-white rounded-2xl shadow-xl border border-amber-100 p-8">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Under Review</h1>
                        <p className="text-gray-500 mb-6">
                            Thank you for completing your seller setup! Our team is reviewing your application.
                        </p>

                        {/* Shop Info */}
                        <div className="bg-amber-50 rounded-xl p-4 mb-6">
                            <div className="flex items-center justify-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-clay-500 to-clay-700 rounded-xl flex items-center justify-center">
                                    <Store size={24} className="text-white" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-gray-900">{user?.shop_name || 'Your Shop'}</p>
                                    <p className="text-sm text-gray-500">{user?.email}</p>
                                </div>
                            </div>
                        </div>

                        {/* Status */}
                        <div className="flex items-center justify-center gap-2 text-amber-700 bg-amber-100 rounded-xl py-3 px-4 mb-6">
                            <RefreshCw size={16} className="animate-spin" />
                            <span className="font-medium">Verification in progress...</span>
                        </div>

                        {/* Info */}
                        <div className="text-left space-y-3 mb-6 text-sm text-gray-600">
                            <div className="flex items-start gap-3">
                                <Mail size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                <p>You'll receive an email once your application is approved or if we need more information.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <Clock size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                <p>Review typically takes 1-2 business days.</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
                            <Link
                                href={route('logout')}
                                method="post"
                                as="button"
                                className="w-full py-3 bg-clay-600 text-white font-bold rounded-xl hover:bg-clay-700 transition shadow-lg"
                            >
                                Browse Shop While Waiting
                            </Link>
                            <Link
                                href={route('logout')}
                                method="post"
                                as="button"
                                className="w-full py-3 bg-gray-100 text-gray-600 font-medium rounded-xl hover:bg-gray-200 transition flex items-center justify-center gap-2"
                            >
                                <LogOut size={16} /> Sign Out
                            </Link>
                        </div>
                    </div>

                    {/* Footer */}
                    <p className="text-xs text-gray-400 mt-6">
                        Questions? Contact us at support@likhangkamay.ph
                    </p>
                </div>
            </div>
        </>
    );
}
