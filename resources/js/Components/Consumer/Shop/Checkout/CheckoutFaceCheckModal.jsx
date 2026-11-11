/* global route */
import React, { useState } from 'react';
import FaceCaptureModal from '@/Components/Common/FaceCaptureModal';
import { router } from '@inertiajs/react';

export default function CheckoutFaceCheckModal({
    show,
    onClose,
    onCompleted,
}) {
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleVerified = ({ photoData, descriptor }) => {
        setErrorMsg('');
        setSubmitting(true);

        router.post(
            route('profile.verify-face'),
            {
                selfie_data_url: photoData,
                face_descriptor: descriptor,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    onCompleted?.();
                },
                onError: (errors) => {
                    setErrorMsg(
                        errors?.face_verification ||
                            errors?.selfie_data_url ||
                            'We could not complete your face check. Please try again.'
                    );
                },
                onFinish: () => {
                    setSubmitting(false);
                },
            }
        );
    };

    return (
        <FaceCaptureModal
            show={show}
            onClose={onClose}
            title="One-Time Quick Face Check"
            subtitle="Complete this quick safety check before your first order. You will not be asked again on future checkouts."
            computeDescriptor={true}
            onVerified={handleVerified}
            fallbackLabel="Cancel"
            onFallbackAction={onClose}
            submitting={submitting}
            errorMessage={errorMsg}
            footerNote="Protects your account across Cash on Delivery, Store Pick-Up, GCash, and Maya orders."
        />
    );
}
