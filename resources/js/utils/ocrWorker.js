/* global Image */
import { analyzeDocumentText } from '@/lib/documentOcrParser';

let workerPromise = null;

/**
 * Rescale image using offscreen canvas to optimize Tesseract inference speed
 * and avoid tab freezes on massive 12-16MP camera snapshots.
 */
export async function prepareImageForOcr(file, maxDimension = 1400) {
    if (!file || !(file instanceof Blob) || !file.type.startsWith('image/')) {
        return file;
    }

    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return file;
    }

    return new Promise((resolve) => {
        let objectUrl = null;
        let settled = false;
        const img = new Image();

        const cleanup = () => {
            if (objectUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
                URL.revokeObjectURL(objectUrl);
                objectUrl = null;
            }
        };

        const safetyTimer = setTimeout(() => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(file);
        }, 3500);

        const finish = (result) => {
            if (settled) return;
            settled = true;
            clearTimeout(safetyTimer);
            cleanup();
            resolve(result);
        };

        img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width <= maxDimension && height <= maxDimension) {
                finish(file);
                return;
            }

            if (width > height) {
                if (width > maxDimension) {
                    height = Math.round((height * maxDimension) / width);
                    width = maxDimension;
                }
            } else {
                if (height > maxDimension) {
                    width = Math.round((width * maxDimension) / height);
                    height = maxDimension;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                finish(file);
                return;
            }

            // Draw with slight contrast preservation
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        finish(file);
                        return;
                    }
                    const prepared = new File([blob], file.name || 'document_ocr.jpg', {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });
                    finish(prepared);
                },
                'image/jpeg',
                0.90
            );
        };

        img.onerror = () => {
            finish(file);
        };

        if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
            objectUrl = URL.createObjectURL(file);
            img.src = objectUrl;
        } else {
            finish(file);
        }
    });
}

let activeProgressHandler = null;

/**
 * Get or initialize lazy Tesseract.js Web Worker.
 * Using dynamic import ensures tesseract is only loaded on the artisan onboarding route.
 */
export async function getTesseractWorker(onProgress = null) {
    activeProgressHandler = onProgress;
    if (!workerPromise) {
        workerPromise = (async () => {
            try {
                const { createWorker } = await import('tesseract.js');
                const worker = await createWorker('eng', 1, {
                    logger: (m) => {
                        if (typeof activeProgressHandler === 'function' && m?.status === 'recognizing text') {
                            const pct = Math.round((m?.progress ?? 0) * 100);
                            activeProgressHandler(`Reading document text (${pct}%)...`);
                        }
                    },
                });
                return worker;
            } catch (err) {
                workerPromise = null;
                throw err;
            }
        })();
    }
    return workerPromise;
}

/**
 * Terminate cached Tesseract worker if memory needs to be freed.
 */
export async function terminateTesseractWorker() {
    if (workerPromise) {
        try {
            const worker = await workerPromise;
            await worker.terminate();
        } catch (e) {
            console.warn('Tesseract worker termination notice:', e);
        } finally {
            workerPromise = null;
        }
    }
}

/**
 * Recognize text from an image file with strict timeout guard.
 */
export async function recognizeDocumentText(file, onProgress = null, timeoutMs = 9000) {
    if (!file) return { text: '', confidence: 0, error: 'No file provided' };

    const isPdf = file?.type === 'application/pdf' || String(file?.name || '').toLowerCase().endsWith('.pdf');
    if (isPdf) {
        return { text: '', confidence: 0, isPdf: true };
    }

    const preparedFile = await prepareImageForOcr(file, 1400);

    let progressFn = onProgress;
    if (typeof progressFn === 'function') {
        progressFn('Initializing document OCR...');
    }

    const ocrPromise = (async () => {
        const worker = await getTesseractWorker(progressFn);
        if (typeof progressFn === 'function') {
            progressFn('Scanning document text...');
        }
        const { data } = await worker.recognize(preparedFile);
        return {
            text: data?.text || '',
            confidence: Math.round(data?.confidence || 0),
        };
    })().catch((err) => {
        console.warn('Background OCR task caught:', err);
        return { text: '', confidence: 0, error: err?.message || 'OCR failed' };
    });

    const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                text: '',
                confidence: 0,
                timedOut: true,
                error: 'OCR recognition timed out (manual audit fallback)',
            });
        }, timeoutMs);
    });

    try {
        return await Promise.race([ocrPromise, timeoutPromise]);
    } catch (err) {
        console.warn('Document OCR scan fallback:', err);
        return {
            text: '',
            confidence: 0,
            error: err?.message || 'OCR processing skipped',
        };
    }
}

/**
 * Universal runner: performs OCR recognition and structured document parsing.
 */
export async function runDocumentOcr(file, documentType, context = {}, onProgress = null) {
    if (!file) return null;

    const isPdf = file?.type === 'application/pdf' || String(file?.name || '').toLowerCase().endsWith('.pdf');
    if (isPdf) {
        return {
            status: 'pdf_scan',
            matched: false,
            documentType,
            badgeText: 'PDF document attached (Manual audit)',
            badgeTone: 'stone',
            isPdf: true,
            extractedValue: null,
            signals: ['PDF format scan'],
            summaryText: 'Uploaded as PDF scan. Full content will be verified by admin.',
        };
    }

    try {
        const recognition = await recognizeDocumentText(file, onProgress);
        if (recognition.timedOut || recognition.error) {
            return {
                status: 'manual_review',
                matched: false,
                documentType,
                badgeText: 'Manual review scheduled',
                badgeTone: 'stone',
                extractedValue: null,
                confidence: 0,
                signals: [recognition.error || 'Timed out'],
                summaryText: 'Automatic text extraction deferred. Admin will verify manually.',
            };
        }

        const analysis = analyzeDocumentText(recognition.text, documentType, context);
        return {
            ...analysis,
            confidence: recognition.confidence,
            recognizedTextSnippet: (recognition.text || '').slice(0, 300),
        };
    } catch (err) {
        console.warn('runDocumentOcr error:', err);
        return {
            status: 'manual_review',
            matched: false,
            documentType,
            badgeText: 'Manual review scheduled',
            badgeTone: 'stone',
            extractedValue: null,
            confidence: 0,
            signals: ['Scan error fallback'],
            summaryText: 'Verification will be completed during admin review.',
        };
    }
}
