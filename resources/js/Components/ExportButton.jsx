import React from 'react';
import { Download } from 'lucide-react';

export default function ExportButton({ href, onClick, children, icon: Icon = Download, className = '', disabled = false, variant = 'secondary', ...props }) {
    const isPrimary = variant === 'primary';
    
    const baseClasses = `
        group relative inline-flex items-center justify-center gap-2 overflow-hidden
        rounded-xl border px-4 py-2 text-[11px] font-bold uppercase tracking-widest
        shadow-sm transition-all duration-300 ease-out active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
        ${isPrimary 
            ? 'border-transparent bg-clay-600 text-white hover:bg-clay-700 shadow-md shadow-clay-200/50' 
            : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900'
        }
        ${className}
    `.trim().replace(/\s+/g, ' ');

    const innerContent = (
        <>
            <Icon size={14} strokeWidth={2.5} className={`transition-transform duration-300 group-hover:-translate-y-0.5 ${isPrimary ? 'text-white' : 'group-hover:text-stone-900'}`} />
            <span className="relative z-10">{children || 'Export'}</span>
            <div className={`absolute inset-0 -z-10 transition-opacity duration-300 opacity-0 group-hover:opacity-100 ${isPrimary ? 'bg-gradient-to-br from-white/10 to-transparent' : 'bg-gradient-to-br from-stone-100/50 to-transparent'}`} />
        </>
    );

    if (href && !disabled) {
        return (
            <a href={href} className={baseClasses} {...props}>
                {innerContent}
            </a>
        );
    }

    return (
        <button type="button" onClick={onClick} disabled={disabled} className={baseClasses} {...props}>
            {innerContent}
        </button>
    );
}
