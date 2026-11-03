import React, { useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Sticky / Top Form Error Summary Banner
 * Standardized across complex multi-step forms and modal dialogs to eliminate silent form blocking.
 * Complies with LikhangKamay design tokens (rose/stone palette, no AI slop, no decorative emojis).
 *
 * @param {Object} props
 * @param {Record<string, string>} props.errors - Inertia useForm errors object
 * @param {string} [props.title] - Custom banner heading
 * @param {string} [props.className] - Additional Tailwind classes
 * @param {boolean} [props.autoScroll=true] - Smoothly scroll banner into view when errors appear
 */
export default function FormErrorSummary({
    errors,
    title = 'Please review and resolve the following before continuing:',
    className = '',
    autoScroll = true,
}) {
    const summaryRef = useRef(null);

    // Normalize error dictionary into an array of actionable items
    const errorEntries = React.useMemo(() => {
        if (!errors || typeof errors !== 'object') return [];
        return Object.entries(errors)
            .filter(([, message]) => Boolean(message))
            .map(([key, message]) => {
                const label = formatFieldLabel(key);
                return {
                    key,
                    label,
                    message: typeof message === 'string' ? message : String(message),
                };
            });
    }, [errors]);

    // Smoothly reveal summary into user viewport when validation blocks submission
    useEffect(() => {
        if (autoScroll && errorEntries.length > 0 && summaryRef.current) {
            summaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [errorEntries.length, autoScroll]);

    if (errorEntries.length === 0) {
        return null;
    }

    const handleJumpToField = (fieldKey) => {
        if (!fieldKey || typeof document === 'undefined') return;

        const sanitizedKey = fieldKey.replace(/["\\]/g, '\\$&');
        // Search by name, id, or data-field
        let target = document.querySelector(`[name="${sanitizedKey}"], #${sanitizedKey}, [data-field="${sanitizedKey}"]`);

        // Handle nested dot-notation paths (e.g. items.0.quantity or pickup_schedules.1)
        if (!target && fieldKey.includes('.')) {
            const parts = fieldKey.split('.');
            const bracketName = parts.reduce((acc, part, idx) => (idx === 0 ? part : `${acc}[${part}]`), '');
            target =
                document.querySelector(`[name="${bracketName}"]`) ||
                document.querySelector(`[data-field-group="${parts[0]}"]`) ||
                document.querySelector(`[id*="${parts[0]}"]`);
        }

        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (typeof target.focus === 'function') {
                try {
                    target.focus({ preventScroll: true });
                } catch {
                    // Ignore focus exceptions on non-focusable wrappers
                }
            }
        }
    };

    return (
        <div
            ref={summaryRef}
            role="alert"
            aria-live="assertive"
            className={`rounded-2xl border border-rose-200 bg-rose-50/95 p-4 text-xs text-rose-900 shadow-2xs space-y-2 animate-in fade-in duration-200 ${className}`}
        >
            <div className="flex items-start gap-2.5">
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1.5 min-w-0">
                    <p className="font-bold text-rose-950 text-xs tracking-tight">
                        {title}
                    </p>
                    <ul className="space-y-1 list-none pl-0.5">
                        {errorEntries.map(({ key, label, message }) => {
                            const messageHasLabel = message.toLowerCase().includes(label.toLowerCase());
                            return (
                                <li key={key} className="text-rose-800">
                                    <button
                                        type="button"
                                        onClick={() => handleJumpToField(key)}
                                        className="text-left font-medium hover:underline hover:text-rose-950 focus:outline-hidden focus:ring-1 focus:ring-rose-400 rounded-sm inline-flex items-center gap-1.5 group transition-colors"
                                        title={`Jump to ${label}`}
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 group-hover:scale-125 transition-transform" />
                                        {!messageHasLabel && (
                                            <span className="font-bold text-rose-900">{label}:</span>
                                        )}
                                        <span className="text-rose-700 group-hover:text-rose-950">
                                            {message}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </div>
    );
}

/**
 * Humanizes raw machine keys into accessible field labels.
 * E.g. 'shipping_street_address' -> 'Shipping Street Address'
 *      'pickup_schedules.4' -> 'Pickup Schedule'
 */
function formatFieldLabel(key) {
    if (!key) return 'Field';
    const cleanKey = key
        .replace(/\.\d+\./g, ' ')
        .replace(/\.\d+$/g, '')
        .replace(/_/g, ' ')
        .replace(/\./g, ' ');

    return cleanKey
        .split(' ')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}
