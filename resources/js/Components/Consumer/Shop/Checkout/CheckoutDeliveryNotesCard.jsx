import React from 'react';
import { Truck, Info } from 'lucide-react';

export default function CheckoutDeliveryNotesCard({
    shippingNotes,
    setShippingNotes,
    showNotes,
    setShowNotes,
}) {
    return (
        <div className="rounded-2xl border border-stone-200 bg-white p-3.5 sm:p-4 shadow-sm transition-all duration-300">
            <button
                type="button"
                onClick={() => setShowNotes(!showNotes)}
                className="w-full flex items-center justify-between text-stone-700 focus:outline-none group"
            >
                <div className="flex items-center gap-2.5">
                    <div className="rounded-lg bg-stone-50 p-1.5 text-stone-500 transition group-hover:bg-clay-50 group-hover:text-clay-600">
                        <Truck size={16} />
                    </div>
                    <div className="text-left">
                        <h2 className="text-sm font-bold text-stone-900">Delivery Notes</h2>
                    </div>
                </div>
                <span className="text-xs font-bold text-clay-600 hover:text-clay-700 transition">
                    {showNotes || shippingNotes ? 'Collapse' : 'Add Instructions'}
                </span>
            </button>
            <div className={`transition-all duration-300 overflow-hidden ${
                showNotes || shippingNotes ? 'mt-3 max-h-48 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
            }`}>
                <textarea 
                    rows="2" 
                    className="w-full rounded-xl border-stone-200 text-sm shadow-sm focus:border-clay-500 focus:ring-4 focus:ring-clay-500/10 placeholder-stone-400 transition" 
                    placeholder="e.g. Gate code, landmark, available time, or handoff instructions" 
                    value={shippingNotes} 
                    onChange={(event) => setShippingNotes(event.target.value)} 
                />
                <div className="mt-2 flex items-start gap-2 rounded-lg bg-stone-50 p-2 text-[10.5px] leading-relaxed text-stone-500">
                    <Info size={13} className="shrink-0 text-stone-400 mt-0.5" />
                    <span>Notes will be shared with the artisan and your delivery rider.</span>
                </div>
            </div>
        </div>
    );
}
