import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Standardized inline form error component.
 * Adheres strictly to LikhangKamay design tokens (rose-600, xs font, bold).
 */
export default function FormInputError({ message, className = '' }) {
    if (!message) return null;

    return (
        <p
            className={`text-rose-600 text-xs font-semibold flex items-center gap-1.5 mt-1 animate-in fade-in ${className}`}
            role="alert"
        >
            <AlertCircle size={12} className="shrink-0 text-rose-500" />
            <span>{message}</span>
        </p>
    );
}
