import React, { useState } from 'react';
import { usePage } from '@inertiajs/react';
import { AlertTriangle, Clock, X, Info } from 'lucide-react';

export default function DisciplinaryStatusBanner() {
    const { auth } = usePage().props;
    const user = auth?.user;

    const [isDismissed, setIsDismissed] = useState(false);

    if (!user || isDismissed) return null;

    const isSuspended = Boolean(
        user.suspended_until && new Date(user.suspended_until) > new Date()
    );
    const isWarned = Boolean((user.warning_count || 0) > 0 && user.warning_reason);

    if (!isSuspended && !isWarned) return null;

    const formattedDate = user.suspended_until
        ? new Date(user.suspended_until).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
          })
        : '';

    if (isSuspended) {
        return (
            <div className="w-full bg-rose-50 border-b border-rose-200/80 px-4 py-3 text-xs text-rose-900 shadow-2xs">
                <div className="max-w-7xl mx-auto flex items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-rose-100/80 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
                            <Clock size={15} />
                        </div>
                        <div>
                            <span className="font-bold text-rose-950">
                                {user.role === 'artisan'
                                    ? 'Studio Temporarily Paused'
                                    : user.role === 'staff'
                                    ? 'Staff Access Paused'
                                    : 'Account Temporarily Restricted'}
                                :
                            </span>{' '}
                            <span className="font-medium text-rose-800">
                                {user.role === 'artisan'
                                    ? `Your shop listings are hidden from buyers until ${formattedDate}. You can still ship and fulfill active orders.`
                                    : `Checkout and new review creation are paused until ${formattedDate}.`}
                            </span>
                            {user.suspension_reason && (
                                <span className="block sm:inline sm:ml-1 text-[11px] text-rose-700 font-normal">
                                    (Reason: {user.suspension_reason})
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isWarned) {
        return (
            <div className="w-full bg-amber-50 border-b border-amber-200/80 px-4 py-2.5 text-xs text-amber-900 shadow-2xs">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0">
                            <AlertTriangle size={13} />
                        </div>
                        <div className="truncate">
                            <span className="font-bold text-amber-950">Policy Notice:</span>{' '}
                            <span className="font-medium text-amber-800">{user.warning_reason}</span>
                            <span className="text-[11px] text-amber-700 font-normal ml-1 hidden md:inline">
                                &bull; Please review community guidelines to keep your standing clean.
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsDismissed(true)}
                        className="p-1 rounded-md text-amber-600 hover:text-amber-900 hover:bg-amber-100/60 transition shrink-0"
                        title="Dismiss notice"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
