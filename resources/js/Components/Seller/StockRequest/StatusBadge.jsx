import React from 'react';
import { STATUS_STYLES, STATUS_LABELS, getStatusBadgeDotColor } from '@/utils/stockRequestHelpers';

export default function StatusBadge({ status }) {
    const style = STATUS_STYLES[status] || STATUS_STYLES['pending'];
    const label = STATUS_LABELS[status] || status;
    const dotColor = getStatusBadgeDotColor(status);

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${style}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
            <span className="truncate">{label}</span>
        </span>
    );
}
