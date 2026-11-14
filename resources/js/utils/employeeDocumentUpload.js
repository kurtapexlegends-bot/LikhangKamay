/* global route */
import { compressImage } from './imageCompressor.js';

export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
export const TARGET_IMAGE_BYTES = 400 * 1024;
export const ACCEPTED_DOCUMENT_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

export const getFileExtension = (filename = '') => {
    const parts = String(filename).toLowerCase().split('.');
    return parts.length > 1 ? parts.pop() : '';
};

export const isSupportedEmployeeDocument = (file) => {
    if (!file) return false;
    const ext = getFileExtension(file.name);
    if (ACCEPTED_DOCUMENT_EXTENSIONS.includes(ext)) return true;

    return [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
    ].includes(file.type);
};

export const resolveEmployeeDocumentContentType = (file) => {
    if (file?.type && file.type.trim() !== '') {
        const normalized = file.type.trim().toLowerCase();
        return normalized === 'image/jpg' ? 'image/jpeg' : normalized;
    }

    const ext = getFileExtension(file?.name);
    if (ext === 'pdf') return 'application/pdf';
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    return 'image/jpeg';
};

/**
 * Validate and compress an employee document image to stay under 400KB when possible
 * and strictly enforce the 4MB per-file ceiling for all formats.
 */
export async function prepareEmployeeDocumentFile(file) {
    if (!file) {
        return { file: null, error: 'Please select a document to upload.' };
    }

    if (!isSupportedEmployeeDocument(file)) {
        return { file: null, error: 'Please upload a JPG, PNG, WEBP, or PDF file.' };
    }

    let prepared = file;
    const isImage = prepared.type.startsWith('image/')
        && prepared.type !== 'image/svg+xml'
        && prepared.type !== 'image/gif';

    if (isImage && prepared.size > TARGET_IMAGE_BYTES) {
        const passes = [
            [1600, 1600, 0.8],
            [1280, 1280, 0.68],
            [1024, 1024, 0.56],
        ];

        for (const [maxW, maxH, quality] of passes) {
            if (prepared.size <= TARGET_IMAGE_BYTES) break;
            const next = await compressImage(prepared, maxW, maxH, quality);
            if (next && next.size < prepared.size) {
                prepared = next;
            }
        }
    }

    if (prepared.size > MAX_DOCUMENT_BYTES) {
        return {
            file: null,
            error: 'Document size must not exceed 4MB.',
        };
    }

    return { file: prepared, error: null };
}

/**
 * Upload an employee document directly via presigned S3/Supabase URL or local fallback.
 * Returns { key, originalFilename }.
 */
export async function uploadEmployeeDocumentToPresign(file, signal) {
    const contentType = resolveEmployeeDocumentContentType(file);
    const presignResponse = await window.axios.post(
        route('api.uploads.presign'),
        {
            folder: 'employee_documents',
            filename: file.name,
            contentType,
        },
        { signal }
    );

    const { url, key, is_direct_cloud: isDirectCloud, contentType: signedContentType } = presignResponse.data || {};
    if (!url || !key) {
        throw new Error('Failed to obtain upload destination for employee document.');
    }

    const putContentType = signedContentType || contentType;

    if (isDirectCloud) {
        const putResponse = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': putContentType,
            },
            body: file,
            signal,
        });

        if (!putResponse.ok) {
            throw new Error(`Direct upload failed with status ${putResponse.status}.`);
        }
    } else {
        await window.axios.put(url, file, {
            headers: {
                'Content-Type': putContentType,
            },
            signal,
        });
    }

    return {
        key,
        originalFilename: file.name,
    };
}
