import React from 'react';
import { Link } from '@inertiajs/react';

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
    className = '',
}) {
    return (
        <div className={`relative overflow-hidden rounded-3xl border border-dashed border-stone-200 bg-stone-50/50 flex flex-col items-center justify-center text-center ${compact ? 'px-6 py-12' : 'px-8 py-20'} ${className}`}>
            {/* Soft background glow */}
            <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-stone-100/50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
            
            <div className="relative z-10">
                <div className={`inline-flex items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-stone-900/5 text-clay-600 mb-6 ${compact ? 'h-14 w-14' : 'h-20 w-20'}`}>
                    {Icon && <Icon size={compact ? 24 : 32} strokeWidth={1.5} />}
                </div>
                
                <h3 className={`font-black tracking-tight text-stone-900 ${compact ? 'text-lg' : 'text-2xl'}`}>{title}</h3>
                
                <p className={`mt-3 max-w-md mx-auto font-medium leading-relaxed text-stone-500 ${compact ? 'text-xs' : 'text-sm'}`}>
                    {description}
                </p>

                {(actionLabel || secondaryActionLabel) && (
                    <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        {secondaryActionLabel && (
                            secondaryActionHref ? (
                                <Link 
                                    href={secondaryActionHref}
                                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-stone-600 bg-white border border-stone-200 shadow-sm hover:bg-stone-50 hover:border-stone-300 active:scale-95 transition-all"
                                >
                                    {secondaryActionLabel}
                                </Link>
                            ) : (
                                <button 
                                    onClick={onSecondaryAction} 
                                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-stone-600 bg-white border border-stone-200 shadow-sm hover:bg-stone-50 hover:border-stone-300 active:scale-95 transition-all"
                                >
                                    {secondaryActionLabel}
                                </button>
                            )
                        )}
                        {actionLabel && (
                            actionHref ? (
                                <Link 
                                    href={actionHref}
                                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-clay-600 shadow-sm hover:bg-clay-700 hover:shadow-md active:scale-95 transition-all"
                                >
                                    {actionLabel}
                                </Link>
                            ) : (
                                <button 
                                    onClick={onAction} 
                                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-clay-600 shadow-sm hover:bg-clay-700 hover:shadow-md active:scale-95 transition-all"
                                >
                                    {actionLabel}
                                </button>
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}