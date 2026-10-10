import React from 'react';
import Modal from '@/Components/Modal';
import DatePicker from '@/Components/DatePicker';
import { X, Banknote, ShoppingBag, Calendar, AlertCircle } from 'lucide-react';
import { formatMoney } from '@/utils/accountingFormatters';

export default function RequestRestockModal({
    show,
    onClose,
    canEditStockRequests,
    supply,
    requestQuantity,
    setRequestQuantity,
    neededByDate,
    setNeededByDate,
    urgencyLevel = 'routine',
    setUrgencyLevel,
    notes = '',
    setNotes,
    onSubmit,
    isSubmitting = false
}) {
    const todayStr = new Date().toISOString().split('T')[0];
    const estimatedCost = Number(requestQuantity || 0) * Number(supply?.unit_cost || 0);

    return (
        <Modal show={show} onClose={onClose} maxWidth="lg">
            <div className="bg-white rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="shrink-0 flex justify-between items-start px-6 py-5 border-b border-stone-100 bg-[#FDFBF9]">
                    <div className="flex items-start gap-3.5">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-clay-200 bg-[#FCF7F2] text-clay-700">
                            <ShoppingBag size={18} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-stone-900 tracking-tight">Request Supply Purchase</h2>
                            <p className="text-xs text-stone-500 mt-0.5 font-medium">
                                Submit a restock request for <strong className="text-stone-800 font-semibold">{supply?.name}</strong> to Finance.
                            </p>
                        </div>
                    </div>

                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px]"
                        title="Close Modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {/* Quantity & Estimated Cost Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">
                                Quantity to Request ({supply?.unit || 'units'})
                            </label>
                            <input 
                                type="number" 
                                disabled={!canEditStockRequests || isSubmitting}
                                className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs font-bold text-stone-800 shadow-none transition focus:border-clay-500 focus:ring-clay-500 min-h-[44px]" 
                                value={requestQuantity} 
                                onKeyDown={(e) => { if (e.key === '-' || e.key === '.') e.preventDefault(); }}
                                onChange={e => setRequestQuantity(e.target.value.replace(/[-.]/g, ""))} 
                                required 
                                min="1"
                                autoFocus
                            />
                            <p className="text-[11px] text-stone-400 font-medium mt-1.5">
                                Recommended: <strong className="text-stone-700">{supply ? supply.min_stock * 2 : 0} {supply?.unit}</strong>
                            </p>
                        </div>

                        <div className="rounded-xl border border-stone-200/80 bg-stone-50/60 p-3 flex flex-col justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Estimated Total Cost</span>
                            <div>
                                <span className="text-base font-bold text-stone-900">{formatMoney(estimatedCost)}</span>
                                <p className="text-[10px] text-stone-400 font-medium">
                                    At {formatMoney(supply?.unit_cost || 0)} per {supply?.unit || 'unit'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Needed By Date & Urgency Level */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div>
                            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500 flex items-center gap-1">
                                <Calendar size={12} className="text-stone-400" /> Needed By Date
                            </label>
                            <DatePicker
                                id="needed_by_date"
                                minDate={todayStr}
                                disabled={!canEditStockRequests || isSubmitting}
                                value={neededByDate || ''}
                                onChange={setNeededByDate}
                                placeholder="Select target date"
                                className="min-h-[44px]"
                            />
                            <p className="text-[10px] text-stone-400 font-medium mt-1">
                                Helps Finance prioritize payout timeline.
                            </p>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">
                                Priority / Urgency Level
                            </label>
                            <div className="grid grid-cols-3 gap-1.5">
                                {[
                                    { value: 'routine', label: 'Routine', tone: 'text-stone-700 border-stone-200 bg-white' },
                                    { value: 'soon', label: 'Soon', tone: 'text-amber-700 border-amber-200 bg-amber-50/60' },
                                    { value: 'immediate', label: 'Urgent', tone: 'text-rose-700 border-rose-200 bg-rose-50/60' }
                                ].map((tier) => (
                                    <button
                                        key={tier.value}
                                        type="button"
                                        disabled={!canEditStockRequests || isSubmitting}
                                        onClick={() => setUrgencyLevel(tier.value)}
                                        className={`py-2 px-1 text-center rounded-xl border text-[11px] font-bold transition min-h-[44px] flex items-center justify-center ${
                                            urgencyLevel === tier.value
                                                ? `ring-2 ring-clay-600 font-extrabold ${tier.tone}`
                                                : 'text-stone-500 border-stone-200 bg-stone-50/40 hover:bg-white'
                                        }`}
                                    >
                                        {tier.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Notes / Reason */}
                    <div>
                        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">
                            Request Notes & Context (Optional)
                        </label>
                        <textarea
                            rows={2}
                            disabled={!canEditStockRequests || isSubmitting}
                            className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-medium text-stone-800 placeholder-stone-400 shadow-none transition focus:border-clay-500 focus:ring-clay-500"
                            placeholder="e.g., Raw materials needed for upcoming custom batch or high-demand product..."
                            value={notes || ''}
                            onChange={e => setNotes(e.target.value)}
                            maxLength={500}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="shrink-0 flex items-center justify-end gap-2.5 border-t border-stone-100 bg-[#FDFBF9] px-6 py-4">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        disabled={isSubmitting}
                        className="px-5 py-2.5 text-xs text-stone-600 font-bold hover:bg-stone-100 rounded-xl transition min-h-[44px] sm:min-h-[38px]"
                    >
                        Cancel
                    </button>
                    <button 
                        type="button"
                        disabled={!canEditStockRequests || isSubmitting || !requestQuantity || Number(requestQuantity) <= 0}
                        onClick={onSubmit} 
                        className="px-6 py-2.5 text-xs bg-clay-600 hover:bg-clay-700 active:scale-95 text-white rounded-xl font-bold transition shadow-xs disabled:opacity-50 min-h-[44px] sm:min-h-[38px] flex items-center gap-2"
                    >
                        <Banknote size={14} /> {isSubmitting ? 'Submitting...' : 'Submit to Finance'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
