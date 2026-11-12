import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { compressImage } from '@/utils/imageCompressor';

export default function useReturnPhotoSlots({
    isOpen,
    mandatoryAngles,
    maxTotalPhotos,
    onInteraction,
}) {
    const [slotPhotos, setSlotPhotos] = useState({});
    const [extraPhotos, setExtraPhotos] = useState([]);
    const [annotationTarget, setAnnotationTarget] = useState(null);
    const [payloadError, setPayloadError] = useState(null);

    const urlsToTrackRef = useRef([]);
    const slotPhotosRef = useRef(slotPhotos);
    const extraPhotosRef = useRef(extraPhotos);
    const isOpenRef = useRef(isOpen);
    const sessionIdRef = useRef(0);

    const revokeTrackedUrl = useCallback((url) => {
        if (!url || typeof url !== 'string') return;
        if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
        urlsToTrackRef.current = urlsToTrackRef.current.filter((tracked) => tracked !== url);
    }, []);

    const revokeAllUrls = useCallback(() => {
        urlsToTrackRef.current.forEach((u) => {
            if (u?.startsWith('blob:')) {
                URL.revokeObjectURL(u);
            }
        });
        urlsToTrackRef.current = [];
    }, []);

    const resetPhotoSlots = useCallback(() => {
        sessionIdRef.current += 1;
        revokeAllUrls();
        slotPhotosRef.current = {};
        extraPhotosRef.current = [];
        setSlotPhotos({});
        setExtraPhotos([]);
        setPayloadError(null);
        setAnnotationTarget(null);
    }, [revokeAllUrls]);

    useEffect(() => {
        slotPhotosRef.current = slotPhotos;
    }, [slotPhotos]);

    useEffect(() => {
        extraPhotosRef.current = extraPhotos;
    }, [extraPhotos]);

    useEffect(() => {
        isOpenRef.current = isOpen;
    }, [isOpen]);

    useEffect(() => {
        return () => {
            sessionIdRef.current += 1;
            revokeAllUrls();
        };
    }, [revokeAllUrls]);

    const orderedProofPhotos = useMemo(() => {
        const files = [];
        mandatoryAngles.forEach((angle) => {
            if (slotPhotos[angle.key]?.file) {
                files.push(slotPhotos[angle.key].file);
            }
        });
        extraPhotos.forEach((entry) => {
            if (entry?.file) {
                files.push(entry.file);
            }
        });
        return files;
    }, [mandatoryAngles, slotPhotos, extraPhotos]);

    const totalAttachedCount = useMemo(
        () => Object.keys(slotPhotos).length + extraPhotos.length,
        [slotPhotos, extraPhotos]
    );

    const handleSlotFileChange = async (angleKey, e) => {
        setPayloadError(null);
        onInteraction?.();
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setPayloadError('Only image files can be attached as proof photos.');
            return;
        }

        const currentSlots = slotPhotosRef.current;
        const currentCount = Object.keys(currentSlots).length + extraPhotosRef.current.length;
        const isReplacing = Boolean(currentSlots[angleKey]?.file);
        if (!isReplacing && currentCount >= maxTotalPhotos) {
            setPayloadError(`You can upload up to ${maxTotalPhotos} photos in total.`);
            return;
        }

        const sessionId = sessionIdRef.current;
        const compressed = await compressImage(file, 1600, 1600, 0.85);
        if (!isOpenRef.current || sessionId !== sessionIdRef.current) return;

        const latestSlots = slotPhotosRef.current;
        const latestCount = Object.keys(latestSlots).length + extraPhotosRef.current.length;
        const isReplacingLatest = Boolean(latestSlots[angleKey]?.file);
        if (!isReplacingLatest && latestCount >= maxTotalPhotos) {
            setPayloadError(`You can upload up to ${maxTotalPhotos} photos in total.`);
            return;
        }

        const url = URL.createObjectURL(compressed);
        urlsToTrackRef.current.push(url);

        const oldUrl = latestSlots[angleKey]?.url;
        revokeTrackedUrl(oldUrl);

        const nextSlots = {
            ...latestSlots,
            [angleKey]: { file: compressed, url },
        };
        slotPhotosRef.current = nextSlots;
        setSlotPhotos(nextSlots);
    };

    const handleRemoveSlotFile = (angleKey) => {
        setPayloadError(null);
        const latestSlots = slotPhotosRef.current;
        const oldUrl = latestSlots[angleKey]?.url;
        revokeTrackedUrl(oldUrl);

        const nextSlots = { ...latestSlots };
        delete nextSlots[angleKey];
        slotPhotosRef.current = nextSlots;
        setSlotPhotos(nextSlots);
    };

    const handleExtraFilesChange = async (e) => {
        setPayloadError(null);
        onInteraction?.();
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (files.length === 0) return;

        if (files.some((f) => !f.type.startsWith('image/'))) {
            setPayloadError('Only image files can be attached as proof photos.');
            return;
        }

        const currentCount = Object.keys(slotPhotosRef.current).length + extraPhotosRef.current.length;
        if (currentCount + files.length > maxTotalPhotos) {
            setPayloadError(`You can upload up to ${maxTotalPhotos} photos in total across all angles.`);
            return;
        }

        const sessionId = sessionIdRef.current;
        const compressedFiles = await Promise.all(
            files.map((file) => compressImage(file, 1600, 1600, 0.85))
        );
        if (!isOpenRef.current || sessionId !== sessionIdRef.current) return;

        const latestCount = Object.keys(slotPhotosRef.current).length + extraPhotosRef.current.length;
        if (latestCount + compressedFiles.length > maxTotalPhotos) {
            setPayloadError(`You can upload up to ${maxTotalPhotos} photos in total across all angles.`);
            return;
        }

        const addedEntries = compressedFiles.map((file) => {
            const url = URL.createObjectURL(file);
            urlsToTrackRef.current.push(url);
            return { file, url };
        });

        const nextExtra = [...extraPhotosRef.current, ...addedEntries];
        extraPhotosRef.current = nextExtra;
        setExtraPhotos(nextExtra);
    };

    const handleRemoveExtraFile = (index) => {
        setPayloadError(null);
        const latestExtra = extraPhotosRef.current;
        if (index < 0 || index >= latestExtra.length) return;

        const oldUrl = latestExtra[index]?.url;
        revokeTrackedUrl(oldUrl);

        const nextExtra = [...latestExtra];
        nextExtra.splice(index, 1);
        extraPhotosRef.current = nextExtra;
        setExtraPhotos(nextExtra);
    };

    const handleSaveAnnotation = (annotatedFile, annotatedUrl) => {
        if (!isOpenRef.current || !annotationTarget) {
            revokeTrackedUrl(annotatedUrl);
            return;
        }

        urlsToTrackRef.current.push(annotatedUrl);

        if (annotationTarget.kind === 'slot') {
            const { angleKey } = annotationTarget;
            const latestSlots = slotPhotosRef.current;
            const oldUrl = latestSlots[angleKey]?.url;
            revokeTrackedUrl(oldUrl);

            const nextSlots = {
                ...latestSlots,
                [angleKey]: { file: annotatedFile, url: annotatedUrl },
            };
            slotPhotosRef.current = nextSlots;
            setSlotPhotos(nextSlots);
        } else {
            const { index } = annotationTarget;
            const latestExtra = extraPhotosRef.current;
            if (index < 0 || index >= latestExtra.length) {
                revokeTrackedUrl(annotatedUrl);
                setAnnotationTarget(null);
                return;
            }
            const oldUrl = latestExtra[index]?.url;
            revokeTrackedUrl(oldUrl);

            const nextExtra = [...latestExtra];
            nextExtra[index] = { file: annotatedFile, url: annotatedUrl };
            extraPhotosRef.current = nextExtra;
            setExtraPhotos(nextExtra);
        }
        setAnnotationTarget(null);
    };

    const buildSubmissionPhotos = () => {
        const orderedFiles = [];
        const orderedAngleKeys = [];

        mandatoryAngles.forEach((angle) => {
            if (slotPhotos[angle.key]?.file) {
                orderedFiles.push(slotPhotos[angle.key].file);
                orderedAngleKeys.push(angle.key);
            }
        });
        extraPhotos.forEach((entry, idx) => {
            if (entry?.file) {
                orderedFiles.push(entry.file);
                orderedAngleKeys.push(`extra_${idx + 1}`);
            }
        });

        const totalPayloadBytes = orderedFiles.reduce(
            (sum, file) => sum + (file instanceof File ? file.size || 0 : 0),
            0
        );

        return { orderedFiles, orderedAngleKeys, totalPayloadBytes };
    };

    return {
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
    };
}
