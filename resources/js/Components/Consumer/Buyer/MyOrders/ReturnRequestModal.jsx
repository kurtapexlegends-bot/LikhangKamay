/* global route */
import React, { useEffect, useMemo, useRef, useCallback } from 'react';
import { useForm } from '@inertiajs/react';
import { RotateCcw, ShieldCheck, Clock, X, CheckCircle2, Store } from 'lucide-react';
import Modal from '@/Components/Modal';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import ProofAnnotationModal from './ProofAnnotationModal';
import ReturnPhotoAngleSlots from './ReturnPhotoAngleSlots';
import ReturnCriteriaFields from './ReturnCriteriaFields';
import useReturnPhotoSlots from './useReturnPhotoSlots';
import { useToast } from '@/Components/ToastContext';

const DEFAULT_RETURN_CRITERIA = {
    return_window_hours: 24,
    max_photos: 5,
    eligible_reasons: [
        { code: 'damaged_in_transit', label: 'Item arrived damaged or broken', requires_description: true, enabled: true },
        { code: 'defective_craftsmanship', label: 'Structural or glaze defect', requires_description: true, enabled: true },
        { code: 'wrong_item', label: 'Wrong item or variant received', requires_description: true, enabled: true },
        { code: 'missing_parts', label: 'Missing components or incomplete order', requires_description: true, enabled: true },
        { code: 'significantly_not_as_described', label: 'Significantly different from listing', requires_description: true, enabled: true },
    ],
    mandatory_photo_angles: [
        { key: 'item_defect', label: 'Item Defect / Damage Close-up', required: true },
        { key: 'shipping_packaging', label: 'Shipping Packaging & Waybill', required: true },
    ],
    checklist_items: [
        { key: 'within_window', label: 'I am submitting this claim within the active return inspection window after delivery.', required: true },
        { key: 'unmodified_item', label: 'The item has not been altered, used, or intentionally damaged after receipt.', required: true },
        { key: 'accurate_evidence', label: 'My uploaded photos clearly show the defect and shipping packaging.', required: true },
    ],
};

export default function ReturnRequestModal({
    isOpen,
    onClose,
    order,
    returnPolicy = null,
    routeEndpoint = 'my-orders.dispute',
}) {
    const criteria = useMemo(() => {
        const raw = returnPolicy?.structured_criteria;
        if (!raw || typeof raw !== 'object') {
            return DEFAULT_RETURN_CRITERIA;
        }
        return {
            return_window_hours: Number(raw.return_window_hours) || 24,
            max_photos: Math.min(5, Math.max(1, Number(raw.max_photos) || 5)),
            eligible_reasons: Array.isArray(raw.eligible_reasons)
                ? raw.eligible_reasons.filter((r) => r && r.enabled !== false)
                : DEFAULT_RETURN_CRITERIA.eligible_reasons,
            mandatory_photo_angles: Array.isArray(raw.mandatory_photo_angles)
                ? raw.mandatory_photo_angles
                : DEFAULT_RETURN_CRITERIA.mandatory_photo_angles,
            checklist_items: Array.isArray(raw.checklist_items)
                ? raw.checklist_items
                : DEFAULT_RETURN_CRITERIA.checklist_items,
        };
    }, [returnPolicy]);

    const { data, setData, post, processing, errors, setError, reset, clearErrors, transform } = useForm({
        policy_id: returnPolicy?.id || null,
        damage_reason_code: '',
        reason: '',
        checklist_confirmations: [],
        proof_photos: [],
    });

    const { addToast } = useToast() || {};
    const isMobileOrTablet = useMediaQuery('(max-width: 1023px)');
    const prevOpenRef = useRef(isOpen);
    const prevOrderIdRef = useRef(order?.id ?? null);
    const maxTotalPhotos = criteria.max_photos || 5;

    const clearCriteriaError = useCallback(() => {
        clearErrors('criteria');
    }, [clearErrors]);

    const {
        slotPhotos,
        extraPhotos,
        annotationTarget,
        setAnnotationTarget,
        payloadError,
        setPayloadError,
        orderedProofPhotos,
        totalAttachedCount,
        resetPhotoSlots,
        handleSlotFileChange,
        handleRemoveSlotFile,
        handleExtraFilesChange,
        handleRemoveExtraFile,
        handleSaveAnnotation,
        buildSubmissionPhotos,
    } = useReturnPhotoSlots({
        isOpen,
        mandatoryAngles: criteria.mandatory_photo_angles,
        maxTotalPhotos,
        onInteraction: clearCriteriaError,
    });

    const resetModalState = useCallback(() => {
        reset();
        clearErrors();
        resetPhotoSlots();
    }, [reset, clearErrors, resetPhotoSlots]);

    const handleModalClose = useCallback(() => {
        if (annotationTarget) return;
        resetModalState();
        onClose();
    }, [annotationTarget, resetModalState, onClose]);

    useEffect(() => {
        if (!isOpen && orderedProofPhotos.length === 0) {
            return;
        }
        setData('proof_photos', orderedProofPhotos);
    }, [isOpen, orderedProofPhotos, setData]);

    useEffect(() => {
        const wasOpen = prevOpenRef.current;
        const prevOrderId = prevOrderIdRef.current;
        const currentOrderId = order?.id ?? null;

        prevOpenRef.current = isOpen;
        prevOrderIdRef.current = currentOrderId;

        if (!isOpen && wasOpen) {
            resetModalState();
        } else if (isOpen && wasOpen && prevOrderId !== null && currentOrderId !== prevOrderId) {
            resetModalState();
            setData('policy_id', returnPolicy?.id || null);
        } else if (isOpen && !wasOpen) {
            setData('policy_id', returnPolicy?.id || null);
        }
    }, [isOpen, order?.id, returnPolicy?.id, resetModalState, setData]);

    const requiredAngles = useMemo(
        () => criteria.mandatory_photo_angles.filter((a) => a.required !== false),
        [criteria]
    );
    const requiredChecklistKeys = useMemo(
        () => criteria.checklist_items.filter((c) => c.required !== false).map((c) => c.key),
        [criteria]
    );

    const missingChecklistCount = requiredChecklistKeys.filter(
        (key) => !data.checklist_confirmations.includes(key)
    ).length;
    const missingAnglesCount = requiredAngles.filter((angle) => !slotPhotos[angle.key]?.file).length;

    const allRequiredChecklistChecked = missingChecklistCount === 0;
    const allMandatoryAnglesAttached = missingAnglesCount === 0;
    const hasValidReasonCode = criteria.eligible_reasons.length === 0 || Boolean(data.damage_reason_code);
    const hasReasonDetails = data.reason.trim().length > 0;
    const hasAtLeastOnePhoto = totalAttachedCount > 0;
    const canSubmitForm = hasValidReasonCode
        && allRequiredChecklistChecked
        && allMandatoryAnglesAttached
        && hasAtLeastOnePhoto
        && hasReasonDetails;

    const missingSummary = useMemo(() => {
        const remaining = [];
        if (!hasValidReasonCode) remaining.push('Claim reason');
        if (!hasReasonDetails) remaining.push('Issue details');
        if (missingAnglesCount > 0) {
            remaining.push(`${missingAnglesCount} required ${missingAnglesCount === 1 ? 'photo' : 'photos'}`);
        } else if (!hasAtLeastOnePhoto) {
            remaining.push('1 proof photo');
        }
        if (missingChecklistCount > 0) {
            remaining.push(`${missingChecklistCount} ${missingChecklistCount === 1 ? 'check' : 'checks'}`);
        }
        return remaining;
    }, [hasValidReasonCode, hasReasonDetails, missingAnglesCount, hasAtLeastOnePhoto, missingChecklistCount]);

    const toggleChecklistItem = (key) => {
        clearCriteriaError();
        const current = Array.isArray(data.checklist_confirmations) ? data.checklist_confirmations : [];
        if (current.includes(key)) {
            setData('checklist_confirmations', current.filter((item) => item !== key));
        } else {
            setData('checklist_confirmations', [...current, key]);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        clearCriteriaError();

        if (!hasValidReasonCode) {
            setError('criteria', 'Please select an eligible return reason.');
            return;
        }
        if (!allRequiredChecklistChecked) {
            setError('criteria', 'Please confirm all required eligibility criteria before submitting.');
            return;
        }
        if (!allMandatoryAnglesAttached) {
            setError('criteria', 'Please upload photos for every mandatory angle.');
            return;
        }

        const { orderedFiles, orderedAngleKeys, totalPayloadBytes } = buildSubmissionPhotos();
        const MAX_MULTIPART_BYTES = 4 * 1024 * 1024;
        if (totalPayloadBytes > MAX_MULTIPART_BYTES) {
            const errorMsg = 'Total proof photos payload exceeds 4MB limit. Please remove or compress photos.';
            setPayloadError(errorMsg);
            if (typeof addToast === 'function') {
                addToast(errorMsg, 'error');
            }
            return;
        }
        setPayloadError(null);

        transform((curr) => ({
            ...curr,
            policy_id: returnPolicy?.id || null,
            damage_reason_code: curr.damage_reason_code,
            checklist_confirmations: curr.checklist_confirmations || [],
            photo_angle_keys: orderedAngleKeys,
            return_reason: curr.reason,
            proof_photos: orderedFiles,
        }));

        post(route(routeEndpoint, order.id), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => handleModalClose(),
            onError: (errs) => {
                const firstErr = errs?.message || Object.values(errs || {})[0];
                if (firstErr && typeof addToast === 'function') {
                    addToast(String(firstErr), 'error');
                }
            },
        });
    };

    if (!order) return null;

    const nestedPhotoError = Object.entries(errors || {}).find(([k]) => k.startsWith('proof_photos.'))?.[1];
    const proofError = errors.proof_photos
        || nestedPhotoError
        || errors.return_proof_image
        || errors.proof_photo
        || errors.photo_angle_keys
        || payloadError;
    const generalError = errors.message || errors.error || errors.criteria || errors.checklist_confirmations;

    const windowHours = criteria.return_window_hours || 24;
    const windowLabel = windowHours % 24 === 0
        ? (windowHours / 24 === 1 ? '24 hours (1 day)' : `${windowHours / 24} days`)
        : `${windowHours} hours`;

    const primaryItem = Array.isArray(order.items) && order.items.length > 0 ? order.items[0] : null;
    const extraItemsCount = Array.isArray(order.items) && order.items.length > 1 ? order.items.length - 1 : 0;

    const renderOrderContextStrip = () => (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50/80 px-3.5 py-2.5">
            <div className="flex items-center gap-3 min-w-0">
                <img
                    src={primaryItem?.img || '/images/placeholder.svg'}
                    alt={primaryItem?.name || 'Order item'}
                    className="h-10 w-10 rounded-lg border border-stone-200 bg-white object-cover shrink-0"
                    onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/images/placeholder.svg';
                    }}
                />
                <div className="min-w-0">
                    <p className="text-xs font-bold text-stone-900 truncate">
                        {primaryItem?.name || `Order #${order.order_number}`}
                        {extraItemsCount > 0 ? ` + ${extraItemsCount} more` : ''}
                    </p>
                    <p className="flex items-center gap-1.5 text-[11px] font-medium text-stone-500 truncate">
                        <span className="font-mono text-stone-600">#{order.order_number}</span>
                        <span>·</span>
                        <Store size={11} className="text-stone-400 shrink-0" />
                        <span className="truncate">{order.seller_name || 'Artisan Shop'}</span>
                    </p>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs w-full sm:w-auto sm:justify-end">
                {order.total && (
                    <span className="font-bold text-stone-900">₱{order.total}</span>
                )}
                <span className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-700">
                    <ShieldCheck size={13} className="text-clay-600 shrink-0" />
                    <span>Policy v{returnPolicy?.version || '1.0'}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500">
                    <Clock size={12} className="text-stone-400 shrink-0" />
                    <span>
                        {order.warranty_expires_at
                            ? `Eligible until ${order.warranty_expires_at}`
                            : `${windowLabel} window`}
                    </span>
                </span>
            </div>
        </div>
    );

    const renderFormBody = () => (
        <ReturnCriteriaFields
            criteria={criteria}
            data={data}
            errors={errors}
            generalError={generalError}
            onSelectReason={(code) => {
                clearCriteriaError();
                setData('damage_reason_code', code);
            }}
            onReasonChange={(val) => setData('reason', val)}
            onToggleChecklist={toggleChecklistItem}
        >
            <ReturnPhotoAngleSlots
                mandatoryAngles={criteria.mandatory_photo_angles}
                slotPhotos={slotPhotos}
                extraPhotos={extraPhotos}
                totalAttachedCount={totalAttachedCount}
                maxTotalPhotos={maxTotalPhotos}
                onSlotFileChange={handleSlotFileChange}
                onRemoveSlotFile={handleRemoveSlotFile}
                onExtraFilesChange={handleExtraFilesChange}
                onRemoveExtraFile={handleRemoveExtraFile}
                onAnnotate={setAnnotationTarget}
                proofError={proofError}
            />
        </ReturnCriteriaFields>
    );

    const renderFooterBar = (compact = false) => (
        <div
            className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${
                compact ? 'border-t border-stone-200 pt-4 mt-4' : 'border-t border-stone-200 bg-stone-50/70 px-6 py-3.5 shrink-0'
            }`}
        >
            <div className="flex items-center gap-2 text-xs">
                {canSubmitForm ? (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                        <CheckCircle2 size={15} className="shrink-0" />
                        <span>All return requirements met</span>
                    </span>
                ) : (
                    <span className="text-stone-600">
                        <span className="font-bold text-stone-800">{missingSummary.length} left:</span>{' '}
                        {missingSummary.join(' · ')}
                    </span>
                )}
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center shrink-0">
                <button
                    type="button"
                    onClick={handleModalClose}
                    className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-700 transition hover:bg-stone-50 min-h-[44px] sm:min-h-[38px] flex items-center justify-center cursor-pointer"
                    disabled={processing}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={processing || !canSubmitForm}
                    className="flex items-center justify-center gap-2 rounded-xl bg-clay-600 px-5 py-2 text-xs font-bold text-white shadow-sm shadow-clay-200 transition hover:bg-clay-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] sm:min-h-[38px] cursor-pointer"
                >
                    {processing ? 'Submitting...' : 'Submit Return Request'}
                </button>
            </div>
        </div>
    );

    return (
        <>
            {isMobileOrTablet ? (
                <SlideOverDrawer
                    show={isOpen}
                    onClose={handleModalClose}
                    title="Request Item Return"
                    widthClass="max-w-lg"
                >
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {renderOrderContextStrip()}
                        {renderFormBody()}
                        {renderFooterBar(true)}
                    </form>
                </SlideOverDrawer>
            ) : (
                <Modal
                    show={isOpen}
                    onClose={handleModalClose}
                    closeable={!annotationTarget}
                    maxWidth="4xl"
                >
                    <form onSubmit={handleSubmit} className="flex flex-col max-h-[88vh] overflow-hidden">
                        {/* Sticky Header */}
                        <div className="px-6 py-4 border-b border-stone-200 bg-white shrink-0 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-clay-100 text-clay-700 rounded-xl shrink-0">
                                        <RotateCcw size={20} />
                                    </div>
                                    <h2 className="text-lg font-bold text-stone-900 tracking-tight">
                                        Request Item Return
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleModalClose}
                                    disabled={processing || !!annotationTarget}
                                    className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition cursor-pointer"
                                    aria-label="Close modal"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            {renderOrderContextStrip()}
                        </div>

                        {/* Scrollable Body */}
                        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
                            {renderFormBody()}
                        </div>

                        {/* Sticky Footer */}
                        {renderFooterBar(false)}
                    </form>
                </Modal>
            )}

            {annotationTarget && (
                <ProofAnnotationModal
                    isOpen={!!annotationTarget}
                    onClose={() => setAnnotationTarget(null)}
                    imageUrl={annotationTarget.url}
                    onSave={handleSaveAnnotation}
                />
            )}
        </>
    );
}
