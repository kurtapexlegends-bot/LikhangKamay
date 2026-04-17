import React from 'react';
import { Eye } from 'lucide-react';

export default function ReadOnlyCapabilityNotice({ label = 'This capability is read only for your account.' }) {
    return (
        <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-stone-600">
            <Eye size={13} className="text-stone-400" />
            {label}
        </div>
    );
}
