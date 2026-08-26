import React, { useState } from 'react';
import { Info, ShieldCheck, X } from 'lucide-react';

export default function SourcingNoticeBanner() {
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    return (
        <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-stone-100/70 border border-stone-200/80 text-xs text-stone-600 transition-all">
            <div className="flex items-center gap-2 min-w-0">
                <Info size={14} className="text-clay-600 shrink-0" />
                <p className="text-xs text-stone-600 truncate sm:whitespace-normal font-medium">
                    <span className="font-bold text-stone-800">Direct Workshop Delivery:</span> Materials delivered from peer studios automatically sync to your Studio Inventory.
                </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold text-stone-500">
                    <ShieldCheck size={12} className="text-clay-600" /> Verified Artisans Only
                </span>
                <button
                    type="button"
                    onClick={() => setDismissed(true)}
                    className="text-stone-400 hover:text-stone-700 p-0.5 rounded-md hover:bg-stone-200/50 transition cursor-pointer"
                    aria-label="Dismiss notice"
                >
                    <X size={13} />
                </button>
            </div>
        </div>
    );
}
