import React, { useState, useEffect } from 'react';
import Modal from '@/Components/Modal';
import axios from 'axios';

export default function ConfirmationModal({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    icon: Icon, 
    iconBg, 
    confirmText, 
    confirmColor, 
    processing,
    isHighRisk = false,
    isVeryHighRisk = false
}) {
    const [countdown, setCountdown] = useState(5);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [verifying, setVerifying] = useState(false);

    // Reset state on open/close
    useEffect(() => {
        if (isOpen) {
            setCountdown(5);
            setPassword('');
            setPasswordError('');
            setVerifying(false);
        }
    }, [isOpen]);

    // Countdown timer effect
    useEffect(() => {
        if (!isOpen || !isHighRisk) return;
        if (countdown <= 0) return;

        const timer = setTimeout(() => {
            setCountdown(prev => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [countdown, isOpen, isHighRisk]);

    const handleConfirm = async (e) => {
        if (e) e.preventDefault();

        if (isVeryHighRisk) {
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
        } else {
            if (isHighRisk && countdown > 0) return;
            onConfirm();
        }
    };

    const isConfirmDisabled = 
        processing || 
        verifying || 
        (isHighRisk && countdown > 0) || 
        (isVeryHighRisk && !password);

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="sm">
            <form onSubmit={handleConfirm} className="p-6 text-center">
                {Icon && (
                    <div className={`w-14 h-14 ${iconBg || ''} rounded-2xl flex items-center justify-center mx-auto mb-4 border border-stone-100 shadow-sm`}>
                        <Icon size={24} />
                    </div>
                )}
                <h2 className="text-lg font-bold text-stone-900 mb-2">{title}</h2>
                <p className="text-xs sm:text-sm text-stone-500 mb-6 leading-relaxed font-medium">{message}</p>

                {/* Security Verification Sections */}
                {isHighRisk && countdown > 0 && (
                    <div className="mb-6 p-4 bg-amber-50/40 border border-amber-100/70 rounded-2xl text-center shadow-sm">
                        <p className="text-xs font-bold text-amber-700 animate-pulse">
                            Security Hold: Unlocking action in {countdown}s...
                        </p>
                    </div>
                )}

                {isVeryHighRisk && (
                    <div className="mb-6 p-4 bg-[#FAF9F6] border border-stone-200 rounded-2xl text-left shadow-sm">
                        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">
                            Security Authentication Required
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setPasswordError('');
                            }}
                            placeholder="Enter your account password"
                            className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#7A5037] focus:ring-1 focus:ring-[#7A5037]/20 bg-white text-stone-850 shadow-sm"
                            disabled={verifying || processing}
                            autoFocus
                        />
                        {passwordError && (
                            <p className="text-xs font-bold text-red-655 mt-2">{passwordError}</p>
                        )}
                    </div>
                )}

                <div className="flex justify-center gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose} 
                        disabled={processing || verifying}
                        className="px-5 py-2.5 border border-stone-200 rounded-xl text-xs sm:text-sm font-bold text-stone-700 hover:bg-stone-50 active:scale-95 transition-all duration-300 disabled:opacity-50 min-h-[44px]"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isConfirmDisabled}
                        className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md active:scale-95 ${confirmColor} disabled:opacity-50 min-h-[44px] flex items-center justify-center`}
                    >
                        {processing || verifying 
                            ? 'Processing...' 
                            : (isHighRisk && countdown > 0 
                                ? `${confirmText} (${countdown}s)` 
                                : confirmText
                              )
                        }
                    </button>
                </div>
            </form>
        </Modal>
    );
}
