import React from 'react';
import { LoaderCircle } from 'lucide-react';

export default function WorkspaceLoadingState({
    label = 'Saving changes',
    detail = null,
    className = '',
}) {
    return (
        <div className={`inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-500 ${className}`}>
            <LoaderCircle size={12} className="animate-spin" />
            <span>{label}</span>
            {detail ? <span className="font-medium normal-case tracking-normal text-stone-400">{detail}</span> : null}
        </div>
    );
}
