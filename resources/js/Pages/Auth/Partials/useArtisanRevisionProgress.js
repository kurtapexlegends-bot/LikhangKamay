import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { normalizeCaviteAddressText } from '@/lib/caviteAddresses';

const STEP_ONE_KEYS = new Set(['shop_details', 'shop_address']);
const STEP_THREE_KEYS = new Set(['payout_info']);

const STEP_KEY_MAP = {
    shop_details: 1,
    shop_address: 1,
    business_permit: 2,
    dti_registration: 2,
    valid_id: 2,
    tin_id: 2,
    face_verification: 2,
    payout_info: 3,
};

const normStr = (val) => String(val ?? '').trim();

const coordsDiffer = (a, b) => {
    const hasA = a !== null && a !== undefined && a !== '';
    const hasB = b !== null && b !== undefined && b !== '';
    if (!hasA && !hasB) return false;
    if (hasA !== hasB) return true;
    const numA = Number(a);
    const numB = Number(b);
    if (Number.isNaN(numA) || Number.isNaN(numB)) return String(a) !== String(b);
    return Math.abs(numA - numB) > 0.00001;
};

function readOrSeedBaseline(storageKey, snapshot) {
    if (!storageKey || typeof window === 'undefined') {
        return snapshot;
    }

    try {
        const raw = window.sessionStorage.getItem(storageKey);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                return parsed;
            }
        }
        window.sessionStorage.setItem(storageKey, JSON.stringify(snapshot));
    } catch {
        // Ignore sessionStorage restrictions (private browsing/quota)
    }

    return snapshot;
}

export default function useArtisanRevisionProgress({
    userId,
    activeRevision,
    revisionItems,
    isRejected,
    step,
    setStep,
    data,
    existingDocuments,
    kycSelfieUrl,
    initialUserSnapshot,
}) {
    const [docOverrides, setDocOverrides] = useState({});
    const [highlightedKey, setHighlightedKey] = useState(null);
    const [scrollRequest, setScrollRequest] = useState(null);

    const highlightTimerRef = useRef(null);

    const revisionScopeKey = activeRevision?.id
        ? `lk_rev_baseline_${userId || 'u'}_${activeRevision.id}_${activeRevision.created_at || ''}`
        : null;

    const currentDocUrls = useMemo(() => ({
        business_permit: docOverrides.business_permit !== undefined
            ? docOverrides.business_permit
            : (existingDocuments?.business_permit_url || null),
        dti_registration: docOverrides.dti_registration !== undefined
            ? docOverrides.dti_registration
            : (existingDocuments?.dti_registration_url || null),
        valid_id: docOverrides.valid_id !== undefined
            ? docOverrides.valid_id
            : (existingDocuments?.valid_id_url || null),
        tin_id: docOverrides.tin_id !== undefined
            ? docOverrides.tin_id
            : (existingDocuments?.tin_id_url || null),
    }), [docOverrides, existingDocuments]);

    const currentSnapshot = useMemo(() => ({
        shop_name: normStr(initialUserSnapshot.shop_name),
        phone_number: normStr(initialUserSnapshot.phone_number),
        street_address: normStr(initialUserSnapshot.street_address),
        city: normStr(initialUserSnapshot.city),
        barangay: normStr(normalizeCaviteAddressText(initialUserSnapshot.barangay || '')),
        zip_code: normStr(initialUserSnapshot.zip_code),
        latitude: initialUserSnapshot.latitude ?? null,
        longitude: initialUserSnapshot.longitude ?? null,
        business_permit: existingDocuments?.business_permit_url || null,
        dti_registration: existingDocuments?.dti_registration_url || null,
        valid_id: existingDocuments?.valid_id_url || null,
        tin_id: existingDocuments?.tin_id_url || null,
        kyc_selfie_url: kycSelfieUrl || null,
        payout_method: normStr(initialUserSnapshot.payout_method || 'GCash').toLowerCase(),
        payout_account_name: normStr(initialUserSnapshot.payout_account_name),
        payout_account_number: normStr(initialUserSnapshot.payout_account_number),
    }), [initialUserSnapshot, existingDocuments, kycSelfieUrl]);

    const [baseline] = useState(() => readOrSeedBaseline(revisionScopeKey, currentSnapshot));

    const addressedKeys = useMemo(() => {
        const next = new Set();
        if (!isRejected) return next;

        if (
            normStr(data.shop_name) !== baseline.shop_name
            || normStr(data.phone_number) !== baseline.phone_number
        ) {
            next.add('shop_details');
        }

        if (
            normStr(data.street_address) !== baseline.street_address
            || normStr(normalizeCaviteAddressText(data.city || '')) !== normStr(normalizeCaviteAddressText(baseline.city || ''))
            || normStr(normalizeCaviteAddressText(data.barangay || '')) !== baseline.barangay
            || normStr(data.zip_code) !== baseline.zip_code
            || coordsDiffer(data.latitude, baseline.latitude)
            || coordsDiffer(data.longitude, baseline.longitude)
        ) {
            next.add('shop_address');
        }

        ['business_permit', 'dti_registration', 'valid_id', 'tin_id'].forEach((docKey) => {
            const currentUrl = currentDocUrls[docKey];
            const wasExplicitlyUploaded = Boolean(docOverrides[docKey]);
            if (currentUrl && (wasExplicitlyUploaded || currentUrl !== baseline[docKey])) {
                next.add(docKey);
            }
        });

        if (
            Boolean(data.selfie_data_url)
            || (kycSelfieUrl && kycSelfieUrl !== baseline.kyc_selfie_url)
        ) {
            next.add('face_verification');
        }

        if (
            normStr(data.payout_method || 'GCash').toLowerCase() !== baseline.payout_method
            || normStr(data.payout_account_name) !== baseline.payout_account_name
            || normStr(data.payout_account_number) !== baseline.payout_account_number
        ) {
            next.add('payout_info');
        }

        return next;
    }, [isRejected, data, baseline, currentDocUrls, docOverrides, kycSelfieUrl]);

    const { stepTotalCounts, stepRemainingCounts } = useMemo(() => {
        const total = { 1: 0, 2: 0, 3: 0 };
        const remaining = { 1: 0, 2: 0, 3: 0 };

        revisionItems.forEach((item) => {
            if (!item.key || String(item.key).startsWith('custom_')) return;
            const targetStep = STEP_ONE_KEYS.has(item.key)
                ? 1
                : STEP_THREE_KEYS.has(item.key)
                    ? 3
                    : 2;
            total[targetStep] += 1;
            if (!addressedKeys.has(item.key)) {
                remaining[targetStep] += 1;
            }
        });

        return { stepTotalCounts: total, stepRemainingCounts: remaining };
    }, [revisionItems, addressedKeys]);

    const handleDocumentUploaded = useCallback((docKey, url) => {
        setDocOverrides((prev) => ({
            ...prev,
            [docKey]: url || '__uploaded__',
        }));
    }, []);

    const handleDocumentRemoved = useCallback((docKey) => {
        setDocOverrides((prev) => ({
            ...prev,
            [docKey]: null,
        }));
    }, []);

    const handleGoToField = useCallback((key) => {
        const targetStep = STEP_KEY_MAP[key] || 2;
        if (highlightTimerRef.current) {
            clearTimeout(highlightTimerRef.current);
            highlightTimerRef.current = null;
        }
        setHighlightedKey(null);
        setScrollRequest({ key, targetStep, nonce: Date.now() });
        if (step !== targetStep) {
            setStep(targetStep);
        }
    }, [step, setStep]);

    useEffect(() => {
        if (!scrollRequest || step !== scrollRequest.targetStep) {
            return undefined;
        }

        let cancelled = false;
        let pollTimer = null;
        let attempts = 0;

        const scrollAndHighlight = () => {
            if (cancelled) return;
            const selector = `[data-revision-target="${scrollRequest.key}"]`;
            const targetEl = document.querySelector(selector);

            if (targetEl) {
                const prefersReducedMotion = typeof window !== 'undefined'
                    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

                targetEl.scrollIntoView({
                    behavior: prefersReducedMotion ? 'auto' : 'smooth',
                    block: 'center',
                });

                setHighlightedKey(scrollRequest.key);
                setScrollRequest(null);

                highlightTimerRef.current = setTimeout(() => {
                    setHighlightedKey((current) => (current === scrollRequest.key ? null : current));
                }, 2200);
                return;
            }

            if (attempts < 18) {
                attempts += 1;
                pollTimer = setTimeout(scrollAndHighlight, 45);
            } else {
                setScrollRequest(null);
            }
        };

        // Allow AnimatePresence mode="wait" to finish swapping steps when switching steps
        const initialDelay = setTimeout(scrollAndHighlight, 50);

        return () => {
            cancelled = true;
            clearTimeout(initialDelay);
            if (pollTimer) clearTimeout(pollTimer);
        };
    }, [scrollRequest, step]);

    useEffect(() => () => {
        if (highlightTimerRef.current) {
            clearTimeout(highlightTimerRef.current);
        }
    }, []);

    return {
        addressedKeys,
        stepTotalCounts,
        stepRemainingCounts,
        highlightedKey,
        handleGoToField,
        handleDocumentUploaded,
        handleDocumentRemoved,
    };
}
