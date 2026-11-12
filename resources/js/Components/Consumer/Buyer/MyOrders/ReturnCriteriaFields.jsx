import React from 'react';
import { AlertCircle, Check } from 'lucide-react';

export default function ReturnCriteriaFields({
    criteria,
    data,
    errors,
    generalError,
    onSelectReason,
    onReasonChange,
    onToggleChecklist,
    children,
}) {
    const reasonError = errors.reason || errors.return_reason;

    return (
        <div className="space-y-4">
            {generalError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                    <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-600" />
                    <span className="font-semibold leading-relaxed">{generalError}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left Column: Claim Reason & Details */}
                <div className="lg:col-span-5 space-y-4">
                    {criteria.eligible_reasons.length > 0 && (
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
                                Eligible Claim Reason <span className="text-red-500">*</span>
                            </label>
                            <div className="space-y-1.5">
                                {criteria.eligible_reasons.map((item) => {
                                    const isSelected = data.damage_reason_code === item.code;
                                    return (
                                        <label
                                            key={item.code}
                                            className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-xs font-semibold cursor-pointer transition min-h-[42px] ${
                                                isSelected
                                                    ? 'border-clay-500 bg-clay-50 text-stone-900 ring-1 ring-clay-500/20'
                                                    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="damage_reason_code"
                                                value={item.code}
                                                checked={isSelected}
                                                onChange={() => onSelectReason(item.code)}
                                                className="text-clay-600 focus:ring-clay-500 shrink-0"
                                            />
                                            <span className="leading-snug">{item.label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                            {errors.damage_reason_code && (
                                <p className="text-red-500 text-xs mt-1">{errors.damage_reason_code}</p>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                            Issue Details <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            className="w-full border-stone-300 rounded-xl focus:ring-clay-500 focus:border-clay-500 shadow-2xs text-base sm:text-sm"
                            rows="4"
                            placeholder="Describe the defect, damage, or discrepancy..."
                            value={data.reason}
                            onChange={(e) => onReasonChange(e.target.value)}
                            required
                        />
                        {reasonError && <p className="text-red-500 text-xs mt-1">{reasonError}</p>}
                    </div>
                </div>

                {/* Right Column: Required Photo Angles & Checklist */}
                <div className="lg:col-span-7 space-y-4">
                    <div className="rounded-2xl border border-stone-200 bg-white p-4">
                        {children}
                    </div>

                    {criteria.checklist_items.length > 0 && (
                        <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4 space-y-2.5">
                            <span className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                                Eligibility Confirmation <span className="text-red-500">*</span>
                            </span>
                            <div className="space-y-1.5">
                                {criteria.checklist_items.map((item) => {
                                    const checked = data.checklist_confirmations.includes(item.key);
                                    return (
                                        <button
                                            key={item.key}
                                            type="button"
                                            onClick={() => onToggleChecklist(item.key)}
                                            className={`w-full flex items-start gap-2.5 rounded-xl border px-3 py-2 text-left text-xs transition min-h-[40px] cursor-pointer ${
                                                checked
                                                    ? 'border-clay-200 bg-white text-stone-900'
                                                    : 'border-transparent bg-transparent text-stone-600 hover:bg-white/70'
                                            }`}
                                        >
                                            <span
                                                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                                                    checked
                                                        ? 'border-clay-600 bg-clay-600 text-white'
                                                        : 'border-stone-300 bg-white text-transparent'
                                                }`}
                                            >
                                                <Check size={11} strokeWidth={3} />
                                            </span>
                                            <span className={`leading-relaxed ${checked ? 'font-semibold text-stone-900' : 'text-stone-600'}`}>
                                                {item.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
