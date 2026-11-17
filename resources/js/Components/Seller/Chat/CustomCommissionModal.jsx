import React, { useState, useMemo } from 'react';
import axios from 'axios';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import { X, Receipt, CheckCircle2, ShieldCheck, ArrowRight, Percent, Coins } from 'lucide-react';

const PERCENT_PRESETS = [20, 30, 50];

export default function CustomCommissionModal({
    show,
    onClose,
    currentChatUser,
    onSuccess,
}) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [totalAmount, setTotalAmount] = useState('');
    const [depositType, setDepositType] = useState('percentage'); // 'percentage' | 'fixed'
    const [depositValue, setDepositValue] = useState('50');
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sanitization: strictly numbers and single decimal point (bans negative signs, letters, and symbols)
    const handleTotalChange = (e) => {
        const raw = e.target.value;
        const clean = raw.replace(/[^0-9.]/g, '');
        const parts = clean.split('.');
        const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : clean;
        setTotalAmount(sanitized);
        if (errors.total_amount) {
            setErrors((prev) => ({ ...prev, total_amount: null }));
        }
    };

    const handleDepositValueChange = (e) => {
        const raw = e.target.value;
        if (depositType === 'percentage') {
            const clean = raw.replace(/[^0-9]/g, '');
            if (clean === '' || (Number(clean) >= 1 && Number(clean) <= 90)) {
                setDepositValue(clean);
            }
        } else {
            const clean = raw.replace(/[^0-9.]/g, '');
            const parts = clean.split('.');
            const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : clean;
            setDepositValue(sanitized);
        }
        if (errors.deposit_value) {
            setErrors((prev) => ({ ...prev, deposit_value: null }));
        }
    };

    // Calculate live breakdown
    const parsedTotal = parseFloat(totalAmount) || 0;

    const { depositAmount, balanceAmount, effectivePercentage } = useMemo(() => {
        if (parsedTotal <= 0) {
            return { depositAmount: 0, balanceAmount: 0, effectivePercentage: 0 };
        }

        if (depositType === 'percentage') {
            const pct = Math.min(90, Math.max(1, parseFloat(depositValue) || 50));
            const dep = Math.round((parsedTotal * (pct / 100)) * 100) / 100;
            const bal = Math.round((parsedTotal - dep) * 100) / 100;
            return { depositAmount: dep, balanceAmount: bal, effectivePercentage: pct };
        } else {
            const fixedDep = parseFloat(depositValue) || 0;
            const bal = Math.max(0, Math.round((parsedTotal - fixedDep) * 100) / 100);
            const pct = parsedTotal > 0 ? Math.round(((fixedDep / parsedTotal) * 100) * 10) / 10 : 0;
            return { depositAmount: fixedDep, balanceAmount: bal, effectivePercentage: pct };
        }
    }, [parsedTotal, depositType, depositValue]);

    const isFixedInvalid = depositType === 'fixed' && (depositAmount <= 0 || depositAmount >= parsedTotal);
    const isBelowMin = parsedTotal >= 50 && (depositAmount < 20 || balanceAmount < 20);
    const isFormValid = title.trim().length > 0 && parsedTotal >= 50 && depositAmount >= 20 && balanceAmount >= 20 && !isFixedInvalid;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isFormValid || isSubmitting) return;

        setIsSubmitting(true);
        setErrors({});

        try {
            const response = await axios.post(route('chat.commissions.store'), {
                receiver_id: currentChatUser.id,
                title: title.trim(),
                description: description.trim() || null,
                total_amount: parsedTotal,
                deposit_type: depositType,
                deposit_value: depositType === 'percentage' ? effectivePercentage : depositAmount,
            });

            if (response.data?.success) {
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('app-toast', {
                        detail: {
                            type: 'success',
                            message: 'Custom commission downpayment request sent.',
                        }
                    }));
                }
                if (onSuccess) {
                    onSuccess(response.data.commission, response.data.message_item);
                }
                handleClose();
            }
        } catch (err) {
            if (err.response?.status === 422 && err.response.data?.errors) {
                setErrors(err.response.data.errors);
            } else {
                setErrors({ general: 'Failed to create commission. Please check your inputs.' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setTitle('');
        setDescription('');
        setTotalAmount('');
        setDepositType('percentage');
        setDepositValue('50');
        setErrors({});
        setIsSubmitting(false);
        onClose();
    };

    return (
        <Modal show={show} onClose={handleClose} maxWidth="lg">
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-[#FDFBF9]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-clay-50 border border-clay-200/70 flex items-center justify-center text-clay-700">
                            <Receipt size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-stone-900 tracking-tight">Request Custom Downpayment</h3>
                            <p className="text-xs text-stone-500 font-medium">
                                Two-phase milestone deposit with {currentChatUser?.name}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {errors.general && (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                            {errors.general}
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        <InputLabel htmlFor="commission_title" value="Custom Piece / Project Title *" />
                        <TextInput
                            id="commission_title"
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                if (errors.title) setErrors((prev) => ({ ...prev, title: null }));
                            }}
                            placeholder="e.g. Bespoke 8-Piece Stoneware Dining Set"
                            className="mt-1 block w-full text-sm"
                            maxLength={100}
                            required
                        />
                        <InputError message={errors.title} className="mt-1.5" />
                    </div>

                    {/* Description */}
                    <div>
                        <InputLabel htmlFor="commission_description" value="Scope & Specifications (Optional)" />
                        <textarea
                            id="commission_description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Mention special glazes, clay body, dimensions, or custom inscriptions..."
                            rows={2}
                            maxLength={500}
                            className="mt-1 block w-full rounded-xl border-stone-200 text-sm focus:border-clay-500 focus:ring-clay-500 placeholder-stone-400 resize-none"
                        />
                    </div>

                    {/* Total Amount */}
                    <div>
                        <InputLabel htmlFor="commission_total" value="Total Agreed Price (₱) *" />
                        <div className="relative mt-1">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-bold text-stone-400 pointer-events-none">
                                ₱
                            </span>
                            <TextInput
                                id="commission_total"
                                type="text"
                                inputMode="decimal"
                                value={totalAmount}
                                onChange={handleTotalChange}
                                placeholder="3500.00"
                                className="pl-8 block w-full text-sm font-semibold"
                                required
                            />
                        </div>
                        <InputError message={errors.total_amount} className="mt-1.5" />
                    </div>

                    {/* Downpayment Mode */}
                    <div className="pt-1">
                        <div className="flex items-center justify-between mb-2">
                            <InputLabel value="Downpayment Calculation *" />
                            <div className="flex rounded-lg border border-stone-200 p-0.5 bg-stone-50">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDepositType('percentage');
                                        setDepositValue('50');
                                    }}
                                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
                                        depositType === 'percentage'
                                            ? 'bg-white text-clay-700 shadow-xs'
                                            : 'text-stone-500 hover:text-stone-800'
                                    }`}
                                >
                                    Percentage (%)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDepositType('fixed');
                                        setDepositValue(parsedTotal > 0 ? String(Math.round(parsedTotal * 0.5)) : '1000');
                                    }}
                                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
                                        depositType === 'fixed'
                                            ? 'bg-white text-clay-700 shadow-xs'
                                            : 'text-stone-500 hover:text-stone-800'
                                    }`}
                                >
                                    Fixed Amount (₱)
                                </button>
                            </div>
                        </div>

                        {depositType === 'percentage' ? (
                            <div className="space-y-2.5">
                                <div className="flex gap-2">
                                    {PERCENT_PRESETS.map((preset) => (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => setDepositValue(String(preset))}
                                            className={`flex-1 py-2 text-xs font-bold rounded-xl border transition ${
                                                Number(depositValue) === preset
                                                    ? 'bg-clay-50 border-clay-600 text-clay-800'
                                                    : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                                            }`}
                                        >
                                            {preset}% Deposit
                                        </button>
                                    ))}
                                </div>
                                <div className="relative">
                                    <TextInput
                                        type="text"
                                        inputMode="numeric"
                                        value={depositValue}
                                        onChange={handleDepositValueChange}
                                        placeholder="50"
                                        className="block w-full text-sm font-semibold pr-8"
                                    />
                                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-sm font-bold text-stone-400 pointer-events-none">
                                        %
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-bold text-stone-400 pointer-events-none">
                                        ₱
                                    </span>
                                    <TextInput
                                        type="text"
                                        inputMode="decimal"
                                        value={depositValue}
                                        onChange={handleDepositValueChange}
                                        placeholder="1500.00"
                                        className="pl-8 block w-full text-sm font-semibold"
                                    />
                                </div>
                                {isFixedInvalid && (
                                    <p className="mt-1.5 text-xs text-rose-600 font-medium">
                                        Fixed deposit must be greater than ₱0 and less than total (₱{parsedTotal.toFixed(2)}).
                                    </p>
                                )}
                            </div>
                        )}
                        <InputError message={errors.deposit_value} className="mt-1.5" />
                        {isBelowMin && (
                            <p className="mt-1.5 text-xs text-amber-700 font-medium">
                                PayMongo requires both downpayment and balance to be at least ₱20.00.
                            </p>
                        )}
                    </div>

                    {/* Live Milestone Calculation Breakdown */}
                    {parsedTotal > 0 && (
                        <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 space-y-3">
                            <div className="flex items-center justify-between text-xs text-stone-500 font-semibold uppercase tracking-wider">
                                <span>Milestone Payment Schedule</span>
                                <span className="text-clay-700 font-bold">2 Phases</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="bg-white p-3 rounded-lg border border-stone-200 shadow-2xs">
                                    <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wide">
                                        Phase 1 • Initial Deposit
                                    </p>
                                    <p className="mt-1 text-base font-bold text-emerald-700">
                                        ₱{depositAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-[10px] text-stone-500 mt-0.5">
                                        {effectivePercentage}% of total (Due upfront)
                                    </p>
                                </div>

                                <div className="bg-white p-3 rounded-lg border border-stone-200 shadow-2xs">
                                    <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wide">
                                        Phase 2 • Final Balance
                                    </p>
                                    <p className="mt-1 text-base font-bold text-stone-900">
                                        ₱{balanceAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-[10px] text-stone-500 mt-0.5">
                                        Due upon piece completion
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition min-h-[44px]"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!isFormValid || isSubmitting}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-clay-600 hover:bg-clay-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                        >
                            {isSubmitting ? (
                                <span>Sending...</span>
                            ) : (
                                <>
                                    <span>Send Downpayment Request</span>
                                    <ArrowRight size={14} />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
