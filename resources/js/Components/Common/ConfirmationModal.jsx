import React from 'react';
import Modal from '@/Components/Modal';
import { AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-react';

/**
 * Universal confirmation modal adhering to LikhangKamay design tokens.
 * Replaces browser-native window.confirm() with accessible, responsive dialogs.
 */
export default function ConfirmationModal({
    isOpen = false,
    onClose = () => {},
    onConfirm = () => {},
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    intent = 'danger',
    processing = false,
    icon: CustomIcon = null,
}) {
    const intentConfig = {
        danger: {
            icon: AlertTriangle,
            iconWrapper: 'bg-rose-50 text-rose-600 border border-rose-200/70',
            confirmButton: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 text-white shadow-xs',
        },
        warning: {
            icon: AlertCircle,
            iconWrapper: 'bg-amber-50 text-amber-600 border border-amber-200/70',
            confirmButton: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 text-white shadow-xs',
        },
        primary: {
            icon: Info,
            iconWrapper: 'bg-clay-50 text-clay-700 border border-clay-200/70',
            confirmButton: 'bg-clay-700 hover:bg-clay-800 focus:ring-clay-600 text-white shadow-xs',
        },
    };

    const currentIntent = intentConfig[intent] || intentConfig.danger;
    const IconToRender = CustomIcon || currentIntent.icon;

    const handleConfirm = (e) => {
        e?.preventDefault();
        if (!processing) {
            onConfirm();
        }
    };

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="sm" closeable={!processing}>
            <div className="p-6 text-center">
                <div
                    className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${currentIntent.iconWrapper}`}
                >
                    <IconToRender size={24} strokeWidth={2.2} />
                </div>

                <h3 className="text-base font-bold text-stone-900 tracking-tight mb-2">
                    {title}
                </h3>

                <p className="text-xs leading-relaxed text-stone-600 font-medium mb-6 px-1">
                    {message}
                </p>

                <div className="flex flex-col-reverse sm:flex-row items-center justify-center gap-2.5 pt-4 border-t border-stone-100">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={processing}
                        className="w-full sm:w-auto min-h-[42px] px-4 py-2 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-700 hover:bg-stone-50 transition active:scale-[0.98] disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={processing}
                        className={`w-full sm:w-auto min-h-[42px] px-5 py-2 rounded-xl text-xs font-bold transition active:scale-[0.98] inline-flex items-center justify-center gap-2 disabled:opacity-60 ${currentIntent.confirmButton}`}
                    >
                        {processing && <Loader2 size={14} className="animate-spin shrink-0" />}
                        <span>{confirmText}</span>
                    </button>
                </div>
            </div>
        </Modal>
    );
}
