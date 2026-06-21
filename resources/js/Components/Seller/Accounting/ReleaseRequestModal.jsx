import React from 'react';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import ReleaseRequestDetails from './ReleaseRequestDetails';

export default function ReleaseRequestModal({
    isOpen,
    onClose,
    item,
    source,
    canEditAccounting,
    rejectReason,
    setRejectReason,
    onApprove,
    onReject,
    reviewProcessing
}) {
    if (!item) return null;

    return (
        <SlideOverDrawer
            show={isOpen}
            onClose={onClose}
            widthClass={item.type === 'payroll' ? 'max-w-5xl' : item.type === 'sale' ? 'max-w-3xl' : 'max-w-2xl'}
            heightClass="max-h-[90vh]"
            position="bottom"
        >
            <div className="p-4 sm:p-6">
                <ReleaseRequestDetails
                    item={item}
                    source={source}
                    canEditAccounting={canEditAccounting}
                    rejectReason={rejectReason}
                    setRejectReason={setRejectReason}
                    onApprove={onApprove}
                    onReject={onReject}
                    reviewProcessing={reviewProcessing}
                    onClose={onClose}
                    inline={false}
                />
            </div>
        </SlideOverDrawer>
    );
}
