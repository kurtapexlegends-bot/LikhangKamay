import React, { useState } from 'react';
import { AlertCircle, Clock, Check, LogOut, X } from 'lucide-react';
import Modal from '@/Components/Modal';

const DEPARTURE_REASONS = [
    { id: 'sick', label: 'Medical / Feeling Unwell', desc: 'Sudden illness, clinic visit, or physical fatigue.' },
    { id: 'emergency', label: 'Personal / Family Emergency', desc: 'Urgent family or personal matters requiring immediate exit.' },
    { id: 'errand', label: 'Official Business / Outside Workshop', desc: 'Fulfilling store deliveries, materials procurement, or client visits.' },
    { id: 'permission', label: 'Approved Early Departure', desc: 'Pre-arranged early exit permission granted by shop manager.' },
    { id: 'other', label: 'Other Reason', desc: 'Provide brief explanation below.' },
];

export default function EarlyClockOutModal({
    isOpen,
    onClose,
    onConfirm,
    shiftEndTime = '17:00',
    undertimeMinutes = 0,
    processing = false,
}) {
    const [selectedReason, setSelectedReason] = useState('sick');
    const [otherText, setOtherText] = useState('');

    const formatUndertime = (minutes) => {
        if (!minutes || minutes <= 0) return 'Undertime';
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        if (h > 0 && m > 0) return `${h}h ${m}m Undertime`;
        if (h > 0) return `${h} hour${h === 1 ? '' : 's'} Undertime`;
        return `${m} minute${m === 1 ? '' : 's'} Undertime`;
    };

    const handleConfirm = () => {
        const chosen = DEPARTURE_REASONS.find(r => r.id === selectedReason);
        const finalReason = selectedReason === 'other' && otherText.trim()
            ? `Other: ${otherText.trim()}`
            : (chosen?.label || 'Early Departure');
        onConfirm(finalReason);
    };

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="md">
            <div className="flex flex-col bg-white rounded-3xl overflow-hidden p-6 sm:p-7">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center shrink-0">
                            <Clock size={20} />
                        </div>
                        <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold uppercase tracking-wider">
                                Early Departure
                            </span>
                            <h2 className="text-base font-bold text-stone-900 tracking-tight mt-0.5">
                                Early Shift Clock-Out
                            </h2>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Shift Warning Card */}
                <div className="mt-4 rounded-2xl border border-amber-200/70 bg-amber-50/50 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                    <AlertCircle size={16} className="text-amber-700 shrink-0 mt-0.5" />
                    <div>
                        <div className="font-bold">
                            Scheduled shift ends at {shiftEndTime} ({formatUndertime(undertimeMinutes)}).
                        </div>
                        <p className="mt-0.5 text-[11px] text-amber-800/80">
                            Please record your departure reason for HR timecard audit and payroll tracking.
                        </p>
                    </div>
                </div>

                {/* Reason Selection Radio Cards */}
                <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {DEPARTURE_REASONS.map(reason => {
                        const isSelected = selectedReason === reason.id;
                        return (
                            <button
                                key={reason.id}
                                type="button"
                                onClick={() => setSelectedReason(reason.id)}
                                className={`w-full text-left p-3 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                                    isSelected
                                        ? 'border-clay-600 bg-[#FCF7F2]/70 shadow-xs'
                                        : 'border-stone-200 hover:border-stone-300 bg-white'
                                }`}
                            >
                                <div>
                                    <div className="text-xs font-bold text-stone-900">{reason.label}</div>
                                    <p className="text-[10px] text-stone-500 mt-0.5">{reason.desc}</p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                                    isSelected ? 'border-clay-600 bg-clay-600 text-white' : 'border-stone-300'
                                }`}>
                                    {isSelected && <Check size={11} strokeWidth={3} />}
                                </div>
                            </button>
                        );
                    })}

                    {selectedReason === 'other' && (
                        <div className="mt-2 animate-fade-in">
                            <textarea
                                value={otherText}
                                onChange={e => setOtherText(e.target.value)}
                                placeholder="Explain reason for early departure..."
                                rows={2}
                                className="w-full text-xs rounded-xl border border-stone-300 focus:border-clay-500 focus:ring-clay-500 p-2.5 resize-none"
                            />
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-4 border-t border-stone-150">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={processing}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition text-center"
                    >
                        Continue Working
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={processing}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold shadow-xs hover:bg-amber-700 transition"
                    >
                        <LogOut size={14} />
                        Confirm Clock-Out
                    </button>
                </div>
            </div>
        </Modal>
    );
}
