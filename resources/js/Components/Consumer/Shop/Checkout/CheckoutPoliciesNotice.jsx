import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function CheckoutPoliciesNotice({
    activeReturnWindow = '24 hours',
    onOpenPolicy,
    className = '',
}) {
    const returnWindowTag = React.useMemo(() => {
        if (!activeReturnWindow) return '24-hour';
        if (typeof activeReturnWindow === 'number') {
            return `${activeReturnWindow}-hour`;
        }
        const str = String(activeReturnWindow).trim();
        return str.replace(/\s*hours?$/i, '-hour');
    }, [activeReturnWindow]);

    return (
        <div className={`rounded-lg border border-stone-200/70 bg-stone-50/70 px-2.5 py-1.5 text-stone-500 ${className}`}>
            <div className="flex items-start gap-1.5">
                <ShieldCheck size={13} className="text-clay-600 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-[11px] leading-snug text-stone-500">
                    By placing this order, you agree to LikhangKamay's{' '}
                    <button
                        type="button"
                        onClick={() => onOpenPolicy?.('terms')}
                        className="font-medium text-clay-700 underline decoration-clay-300 underline-offset-2 hover:text-clay-800 transition touch-manipulation focus:outline-none focus:ring-1 focus:ring-clay-500 rounded-xs"
                        aria-label="Read Terms of Service"
                    >
                        Terms of Service
                    </button>
                    ,{' '}
                    <button
                        type="button"
                        onClick={() => onOpenPolicy?.('privacy')}
                        className="font-medium text-clay-700 underline decoration-clay-300 underline-offset-2 hover:text-clay-800 transition touch-manipulation focus:outline-none focus:ring-1 focus:ring-clay-500 rounded-xs"
                        aria-label="Read Privacy Policy"
                    >
                        Privacy Policy
                    </button>
                    , and{' '}
                    <button
                        type="button"
                        onClick={() => onOpenPolicy?.('returns')}
                        className="font-medium text-clay-700 underline decoration-clay-300 underline-offset-2 hover:text-clay-800 transition touch-manipulation focus:outline-none focus:ring-1 focus:ring-clay-500 rounded-xs"
                        aria-label="Read Return and Refund Policy"
                    >
                        Return & Refund Policy
                    </button>{' '}
                    <span className="text-stone-400">
                        ({returnWindowTag} return window).
                    </span>
                </p>
            </div>
        </div>
    );
}
