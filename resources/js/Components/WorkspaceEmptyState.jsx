import React from 'react';
import { Link } from '@inertiajs/react';

function ActionControl({ label, href, onClick, tone = 'primary' }) {
    if (!label) {
        return null;
    }

    const baseClassName = tone === 'secondary'
        ? 'inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[12px] font-bold text-stone-700 transition hover:bg-stone-50'
        : 'inline-flex items-center justify-center rounded-xl bg-clay-600 px-4 py-2.5 text-[12px] font-bold text-white transition hover:bg-clay-700';

    if (href) {
        return (
            <Link href={href} className={baseClassName}>
                {label}
            </Link>
        );
    }

    return (
        <button type="button" onClick={onClick} className={baseClassName}>
            {label}
        </button>
    );
}

export default function WorkspaceEmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    actionHref,
    onAction,
    secondaryActionLabel,
    secondaryActionHref,
    onSecondaryAction,
    compact = false,
}) {
    return (
        <div className={`flex flex-col items-center justify-center text-center ${compact ? 'px-6 py-10' : 'px-8 py-14'}`}>
            <div className={`inline-flex items-center justify-center rounded-2xl border ${compact ? 'h-12 w-12' : 'h-16 w-16'} border-stone-200 bg-[#FCF7F2] text-clay-500`}>
                {Icon && <Icon size={compact ? 22 : 28} strokeWidth={2.2} />}
            </div>
            <h3 className={`mt-4 font-bold tracking-tight text-stone-900 ${compact ? 'text-base' : 'text-lg'}`}>{title}</h3>
            <p className={`mt-2 max-w-md font-medium leading-relaxed text-stone-500 ${compact ? 'text-[12px]' : 'text-[13px]'}`}>
                {description}
            </p>
            {(actionLabel || secondaryActionLabel) && (
                <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
                    <ActionControl label={actionLabel} href={actionHref} onClick={onAction} />
                    <ActionControl label={secondaryActionLabel} href={secondaryActionHref} onClick={onSecondaryAction} tone="secondary" />
                </div>
            )}
        </div>
    );
}
