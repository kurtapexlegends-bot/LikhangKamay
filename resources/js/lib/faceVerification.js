import * as faceapi from '@vladmandic/face-api';
import { loadCachedFaceModels } from '@/lib/faceModelCache';

/**
 * Compute Euclidean distance between two 128-D face descriptors.
 */
export function computeDistance(descA, descB) {
    if (!Array.isArray(descA) || !Array.isArray(descB) || descA.length !== 128 || descB.length !== 128) {
        return null;
    }

    let sum = 0;
    for (let i = 0; i < 128; i++) {
        const diff = Number(descA[i]) - Number(descB[i]);
        sum += diff * diff;
    }

    return Math.sqrt(sum);
}

/**
 * Convert Euclidean distance into a 0-100 calibrated similarity score.
 * Matches backend FaceDescriptorService::distanceToMatchPercentage().
 */
export function distanceToMatchPercentage(distance) {
    if (distance === null || distance === undefined || Number.isNaN(Number(distance))) {
        return null;
    }

    const score = ((1.05 - Number(distance)) / 0.75) * 100;
    return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Map numeric similarity score to a plain-language tier.
 */
export function classifyMatchScore(score) {
    if (score === null || score === undefined) {
        return {
            tier: 'unknown',
            label: 'Portrait Not Detected',
            badgeClass: 'bg-stone-100 text-stone-700 border-stone-200',
        };
    }

    if (score >= 65) {
        return {
            tier: 'high',
            label: 'Strong Match',
            badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
    }

    if (score >= 45) {
        return {
            tier: 'medium',
            label: 'Moderate Match — Admin Check',
            badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        };
    }

    return {
        tier: 'low',
        label: 'Low Match — Manual Review Needed',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    };
}

function loadImageElement(src) {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = src;
    });
}

function renderToScaledCanvas(img, maxDim = 1100) {
    const naturalW = img.naturalWidth || img.width || 640;
    const naturalH = img.naturalHeight || img.height || 480;
    const scale = Math.min(1, maxDim / Math.max(naturalW, naturalH));

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(naturalW * scale));
    canvas.height = Math.max(1, Math.round(naturalH * scale));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return canvas;
}

/**
 * Extract a 128-D face descriptor from an uploaded File/Blob or image URL.
 * Always cleans up ObjectURLs to prevent mobile browser tab leaks.
 */
export async function extractImageFaceDescriptor(fileOrUrl) {
    if (!fileOrUrl) {
        return { idFaceDetected: false, descriptor: null, unsupportedType: false };
    }

    const isFileOrBlob = typeof Blob !== 'undefined' && fileOrUrl instanceof Blob;
    if (isFileOrBlob && fileOrUrl.type === 'application/pdf') {
        return { idFaceDetected: false, descriptor: null, unsupportedType: true };
    }

    await loadCachedFaceModels('/models/face', { loadRecognitionNet: true });

    let objectUrl = null;
    try {
        const src = isFileOrBlob ? (objectUrl = URL.createObjectURL(fileOrUrl)) : String(fileOrUrl);
        const img = await loadImageElement(src);
        const canvas = renderToScaledCanvas(img, 1100);

        let detection = await faceapi
            .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 }))
            .withFaceLandmarks(true)
            .withFaceDescriptor();

        if (!detection) {
            detection = await faceapi
                .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.25 }))
                .withFaceLandmarks(true)
                .withFaceDescriptor();
        }

        if (!detection?.descriptor) {
            return { idFaceDetected: false, descriptor: null, unsupportedType: false };
        }

        return {
            idFaceDetected: true,
            descriptor: Array.from(detection.descriptor),
            unsupportedType: false,
        };
    } catch (err) {
        console.warn('ID face extraction failed:', err);
        return { idFaceDetected: false, descriptor: null, unsupportedType: false };
    } finally {
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
        }
    }
}

/**
 * Compare a Valid ID image file/URL against a previously captured live selfie descriptor.
 */
export async function compareSelfieToId(validIdFileOrUrl, selfieDescriptor) {
    const extraction = await extractImageFaceDescriptor(validIdFileOrUrl);

    if (!extraction.idFaceDetected || !extraction.descriptor || !Array.isArray(selfieDescriptor) || selfieDescriptor.length !== 128) {
        return {
            ...extraction,
            distance: null,
            score: null,
        };
    }

    const distance = computeDistance(selfieDescriptor, extraction.descriptor);
    const score = distanceToMatchPercentage(distance);

    return {
        ...extraction,
        distance: distance !== null ? Number(distance.toFixed(4)) : null,
        score,
    };
}
