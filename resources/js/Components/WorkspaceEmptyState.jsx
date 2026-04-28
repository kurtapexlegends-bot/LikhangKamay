import React from 'react';
import { Link } from '@inertiajs/react';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';

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
                    {actionLabel && (
                        actionHref ? (
                            <Link href={actionHref}>
                                <PrimaryButton className="px-6">{actionLabel}</PrimaryButton>
                            </Link>
                        ) : (
                            <PrimaryButton onClick={onAction} className="px-6">{actionLabel}</PrimaryButton>
                        )
                    )}
                    {secondaryActionLabel && (
                        secondaryActionHref ? (
                            <Link href={secondaryActionHref}>
                                <SecondaryButton className="px-6">{secondaryActionLabel}</SecondaryButton>
                            </Link>
                        ) : (
                            <SecondaryButton onClick={onSecondaryAction} className="px-6">{secondaryActionLabel}</SecondaryButton>
                        )
                    )}
                </div>
            )}
        </div>
    );
}
