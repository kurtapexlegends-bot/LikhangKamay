import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import ConfirmationModal from '@/Components/ConfirmationModal';
import SlideOverDrawer from '@/Components/SlideOverDrawer';

export default function ClearConfirmation({ clearAction, onClose, onConfirm }) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1024); // lg breakpoint is 1024px
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!clearAction) return null;

    if (isMobile) {
        const footer = (
            <div className="flex flex-col gap-3 w-full">
                <button
                    type="button"
                    onClick={onConfirm}
                    className="w-full flex items-center justify-center rounded-xl bg-rose-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700 active:scale-95 min-h-[44px]"
                >
                    Confirm Action
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full flex items-center justify-center rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-sm font-bold text-stone-600 shadow-sm transition hover:bg-stone-50 active:scale-95 min-h-[44px]"
                >
                    Cancel
                </button>
            </div>
        );

        return (
            <SlideOverDrawer
                show={!!clearAction}
                onClose={onClose}
                title={clearAction.title}
                position="bottom"
                heightClass="max-h-[45vh]"
                widthClass="max-w-md"
                footer={footer}
                bodyClassName="relative flex-1 overflow-y-auto px-6 py-4 flex flex-col items-center text-center select-none"
            >
                <div className="inline-flex items-center justify-center rounded-full bg-rose-50 p-4 text-rose-605 mb-4 animate-bounce">
                    <AlertTriangle size={30} />
                </div>
                <p className="text-sm font-medium leading-relaxed text-stone-500 max-w-xs">
                    {clearAction.message}
                </p>
            </SlideOverDrawer>
        );
    }

    return (
        <ConfirmationModal
            isOpen={!!clearAction}
            onClose={onClose}
            onConfirm={onConfirm}
            title={clearAction.title || ''}
            message={clearAction.message || ''}
            icon={Trash2}
            iconBg="bg-rose-50 text-rose-600"
            confirmText={clearAction.title || 'Confirm'}
            confirmColor="bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-600/30"
        />
    );
}
