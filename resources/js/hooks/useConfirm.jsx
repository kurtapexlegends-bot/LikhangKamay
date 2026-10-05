import React, { useState, useCallback, useRef } from 'react';
import ConfirmationModal from '@/Components/Common/ConfirmationModal';

/**
 * Promise-based hook for triggering confirmation dialogs.
 * Replaces window.confirm() with zero callback nesting.
 *
 * Example:
 * const { confirm, ConfirmationDialog } = useConfirm();
 * const handleDelete = async () => {
 *     const ok = await confirm({
 *         title: 'Delete Template?',
 *         message: 'This will permanently delete this email template.',
 *         confirmText: 'Delete Template',
 *         intent: 'danger',
 *     });
 *     if (ok) router.delete(...);
 * };
 * return <>...{ConfirmationDialog}</>;
 */
export function useConfirm() {
    const [modalState, setModalState] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        intent: 'danger',
        processing: false,
    });

    const resolverRef = useRef(null);

    const confirm = useCallback(({
        title = 'Confirm Action',
        message = 'Are you sure you want to proceed?',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        intent = 'danger',
    } = {}) => {
        return new Promise((resolve) => {
            resolverRef.current = resolve;
            setModalState({
                isOpen: true,
                title,
                message,
                confirmText,
                cancelText,
                intent,
                processing: false,
            });
        });
    }, []);

    const handleClose = useCallback(() => {
        setModalState((prev) => ({ ...prev, isOpen: false }));
        if (resolverRef.current) {
            resolverRef.current(false);
            resolverRef.current = null;
        }
    }, []);

    const handleConfirm = useCallback(() => {
        setModalState((prev) => ({ ...prev, isOpen: false }));
        if (resolverRef.current) {
            resolverRef.current(true);
            resolverRef.current = null;
        }
    }, []);

    const ConfirmationDialog = (
        <ConfirmationModal
            isOpen={modalState.isOpen}
            onClose={handleClose}
            onConfirm={handleConfirm}
            title={modalState.title}
            message={modalState.message}
            confirmText={modalState.confirmText}
            cancelText={modalState.cancelText}
            intent={modalState.intent}
            processing={modalState.processing}
        />
    );

    return {
        confirm,
        ConfirmationDialog,
        isConfirmOpen: modalState.isOpen,
    };
}

export default useConfirm;
