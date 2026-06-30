import React, { useState, useEffect } from 'react';
import { XCircle, CheckCircle2 } from 'lucide-react';
import ConfirmationModal from '@/Components/ConfirmationModal';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import Modal from '@/Components/Modal';
import axios from 'axios';

export default function SponsorshipDecisionModal({
    isOpen,
    type,
    request,
    processing,
    rejectionReason,
    setRejectionReason,
    onClose,
    onConfirm
}) {
    const [isMobile, setIsMobile] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Reset password states when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setPassword('');
            setPasswordError('');
            setVerifying(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    if (type === 'approve') {
        return (
            <ConfirmationModal
                isOpen={isOpen && type === 'approve'}
                onClose={onClose}
                onConfirm={onConfirm}
                title="Approve Sponsorship?"
                message={
                    request
                        ? `Are you sure you want to approve "${request.product?.name}" for a 7-day sponsorship? It will be placed across the homepage and catalog sponsored surfaces.`
                        : `Are you sure you want to approve the selected sponsorship requests?`
                }
                icon={CheckCircle2}
                iconBg="bg-emerald-50 text-emerald-600"
                confirmText="Yes, Approve"
                confirmColor="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-250/20"
                processing={processing}
            />
        );
    }

    if (type === 'reject') {
        const handleConfirmClick = async (e) => {
            if (e) e.preventDefault();
            if (!password) {
                setPasswordError('Password is required.');
                return;
            }
            setVerifying(true);
            setPasswordError('');
            try {
                const response = await axios.post(route('password.confirm.ajax'), { password });
                if (response.data?.valid) {
                    onConfirm();
                } else {
                    setPasswordError('Invalid password. Please try again.');
                }
            } catch (err) {
                setPasswordError(err.response?.data?.message || 'Verification failed. Invalid password.');
            } finally {
                setVerifying(false);
            }
        };

        const renderRejectForm = () => (
            <div className="space-y-6">
                <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-650 flex items-center justify-center border border-red-100/50 shrink-0">
                        <XCircle size={22} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-stone-900">Provide Rejection Reason</h2>
                        <p className="text-xs text-stone-500 mt-1">
                            {request
                                ? `Explain why the request for "${request.product?.name}" was rejected. The seller will see this note.`
                                : `Explain why the selected sponsorship requests are rejected. The sellers will see this note.`}
                        </p>
                    </div>
                </div>

                <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-2">
                        Rejection Reason
                    </label>
                    <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={5}
                        className="w-full rounded-xl border border-stone-200 focus:border-red-350 focus:ring-red-200 text-sm"
                        placeholder="Explain why the request was rejected so the seller knows what to improve."
                        autoFocus
                    />
                </div>

                <div className="mt-4">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-2">
                        Security Verification Required
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            setPasswordError('');
                        }}
                        placeholder="Enter your account password to confirm"
                        className="w-full px-3.5 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none bg-white"
                        disabled={verifying || processing}
                    />
                    {passwordError && (
                        <p className="text-xs font-bold text-red-655 mt-2">{passwordError}</p>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 border border-stone-200 rounded-xl text-sm font-bold text-stone-700 hover:bg-stone-50 transition min-h-[44px]"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirmClick}
                        disabled={processing || verifying || !rejectionReason.trim() || !password}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50 min-h-[44px]"
                    >
                        {processing || verifying ? 'Verifying...' : 'Reject Request'}
                    </button>
                </div>
            </div>
        );

        if (isMobile) {
            return (
                <SlideOverDrawer
                    show={isOpen && type === 'reject'}
                    onClose={onClose}
                    title="Reject Sponsorship Request"
                    widthClass="max-w-md"
                >
                    {renderRejectForm()}
                </SlideOverDrawer>
            );
        }

        return (
            <Modal show={isOpen && type === 'reject'} onClose={onClose} maxWidth="md">
                <div className="p-6">
                    <h2 className="text-lg font-bold text-stone-900 mb-1">Reject Sponsorship Request</h2>
                    {renderRejectForm()}
                </div>
            </Modal>
        );
    }

    return null;
}
