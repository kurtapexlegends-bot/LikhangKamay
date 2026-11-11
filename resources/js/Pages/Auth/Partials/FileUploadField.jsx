/* global route, AbortController */
import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, Eye, Trash2, Loader2, XCircle, FileText, Camera, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import InputError from '@/Components/InputError';
import { compressImage } from '@/utils/imageCompressor';
import { compareSelfieToId, extractImageFaceDescriptor } from '@/lib/faceVerification';

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const FileUploadField = React.memo(({
    label,
    description,
    id,
    existingFileUrl,
    error,
    onView,
    enableCameraCapture = false,
    selfieDescriptor = null,
    onBiometricAnalyzed = null,
    isFlagged = false,
    isAddressed = false,
    isHighlighted = false,
    revisionNote = null,
    isVerifiedClean = false,
    onUploaded = null,
    onRemoved = null,
}) => {
    const inputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const abortControllerRef = useRef(null);

    const [uploadedUrl, setUploadedUrl] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [canCancel, setCanCancel] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);

    const effectiveFileUrl = uploadedUrl || existingFileUrl;

    useEffect(() => {
        setUploadedUrl(null);
        if (existingFileUrl) {
            const isPdf = existingFileUrl.toLowerCase().endsWith('.pdf') || existingFileUrl.toLowerCase().includes('.pdf');
            setPreviewUrl(isPdf ? null : existingFileUrl);
        } else {
            setPreviewUrl(null);
        }
    }, [existingFileUrl]);

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const resetFileInputs = () => {
        if (inputRef.current) inputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
    };

    const handleFileSelect = async (e, fromCamera = false) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setUploading(true);
        setCanCancel(true);
        setUploadError(null);
        setShowConfirmDelete(false);

        try {
            const isPdf = selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf');
            let fileToUpload = selectedFile;
            if (!isPdf) {
                fileToUpload = await compressImage(selectedFile, 1600, 1600, 0.85);
            }

            if (fileToUpload.size > MAX_UPLOAD_BYTES) {
                setUploading(false);
                setCanCancel(false);
                setUploadError('Max 4MB per file. Please choose a smaller document.');
                resetFileInputs();
                return;
            }

            let biometricExtras = {
                camera_captured: fromCamera ? 1 : 0,
            };
            if (id === 'valid_id' && !isPdf) {
                try {
                    const bioPromise = Array.isArray(selfieDescriptor) && selfieDescriptor.length === 128
                        ? compareSelfieToId(fileToUpload, selfieDescriptor)
                        : extractImageFaceDescriptor(fileToUpload);
                    const bio = await Promise.race([
                        bioPromise,
                        new Promise((resolve) => setTimeout(() => resolve(null), 3500)),
                    ]);

                    if (bio) {
                        onBiometricAnalyzed?.({
                            ...bio,
                            cameraCaptured: fromCamera,
                        });
                        biometricExtras = {
                            camera_captured: fromCamera ? 1 : 0,
                            id_face_detected: bio.idFaceDetected ? 1 : 0,
                            ...(bio.descriptor ? { id_face_descriptor: JSON.stringify(bio.descriptor) } : {}),
                            ...(bio.score !== null && bio.score !== undefined ? { face_match_score: bio.score } : {}),
                        };
                    }
                } catch (bioErr) {
                    console.warn('Valid ID face inspection skipped, continuing upload:', bioErr);
                }
            }

            const abortController = new AbortController();
            abortControllerRef.current = abortController;

            let responseData = null;

            if (isPdf || fileToUpload.size > 1024 * 1024) {
                const presignRes = await axios.post(route('api.uploads.presign'), {
                    folder: 'legal_docs',
                    filename: fileToUpload.name,
                    contentType: isPdf ? 'application/pdf' : (fileToUpload.type || 'application/octet-stream'),
                }, {
                    signal: abortController.signal,
                });

                const { url, key, contentType } = presignRes.data;

                const uploadRes = await fetch(url, {
                    method: 'PUT',
                    headers: { 'Content-Type': contentType },
                    body: fileToUpload,
                    signal: abortController.signal,
                });

                if (!uploadRes.ok) {
                    throw new Error('Direct file upload to storage failed.');
                }

                const res = await axios.post(route('artisan.setup.upload-document', { type: id }), {
                    document_key: key,
                    ...biometricExtras,
                }, {
                    signal: abortController.signal,
                    headers: { Accept: 'application/json' },
                });
                responseData = res.data;
            } else {
                const formData = new FormData();
                formData.append('document', fileToUpload);
                Object.entries(biometricExtras).forEach(([k, v]) => {
                    if (v !== undefined && v !== null) {
                        formData.append(k, String(v));
                    }
                });

                const res = await axios.post(route('artisan.setup.upload-document', { type: id }), formData, {
                    signal: abortController.signal,
                    headers: { Accept: 'application/json' },
                });
                responseData = res.data;
            }

            if (responseData?.url) {
                setUploadedUrl(responseData.url);
                const returnedIsPdf = isPdf || String(responseData.url).toLowerCase().includes('.pdf');
                setPreviewUrl(returnedIsPdf ? null : responseData.url);
                onUploaded?.(id, responseData.url);
            } else {
                onUploaded?.(id, null);
            }

            router.reload({
                only: ['existingDocuments', 'auth', 'kycVerificationMeta'],
                preserveScroll: true,
                preserveState: true,
            });
        } catch (err) {
            if (err?.name === 'AbortError' || axios.isCancel(err)) {
                setUploadError('Upload cancelled.');
            } else {
                const errs = err?.response?.data?.errors;
                const firstFieldErr = errs?.[id]?.[0] || errs?.document?.[0];
                setUploadError(firstFieldErr || err?.response?.data?.message || err?.response?.data?.error || err.message || 'Failed to upload document.');
            }
        } finally {
            setUploading(false);
            setCanCancel(false);
            abortControllerRef.current = null;
            resetFileInputs();
        }
    };

    const handleCancel = (e) => {
        e.stopPropagation();
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setCanCancel(false);
        setUploading(false);
        setUploadError('Upload cancelled.');
        resetFileInputs();
    };

    const handleRemove = (e) => {
        e.stopPropagation();
        if (effectiveFileUrl) {
            setShowConfirmDelete(true);
        }
    };

    const executeRemove = (e) => {
        e.stopPropagation();
        setShowConfirmDelete(false);
        if (effectiveFileUrl) {
            setUploading(true);
            router.delete(route('artisan.setup.delete-document', { type: id }), {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setUploadedUrl(null);
                    setPreviewUrl(null);
                    onRemoved?.(id);
                },
                onFinish: () => setUploading(false),
            });
        }
    };

    const handleView = (e) => {
        e.stopPropagation();
        const targetUrl = previewUrl || effectiveFileUrl;
        if (!targetUrl) return;

        const isPdf = targetUrl.toLowerCase().endsWith('.pdf') || targetUrl.toLowerCase().includes('.pdf');

        if (onView) {
            onView({
                url: targetUrl,
                title: label,
                type: isPdf ? 'pdf' : 'image',
            });
        } else {
            window.open(targetUrl, '_blank');
        }
    };

    const hasFile = Boolean(effectiveFileUrl);

    const renderFileActions = () => (
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
            <button
                type="button"
                onClick={handleView}
                className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-xs transition hover:bg-stone-50 cursor-pointer"
            >
                <Eye size={13} /> View
            </button>
            {enableCameraCapture && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        cameraInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-xs transition hover:bg-stone-50 cursor-pointer"
                >
                    <Camera size={13} /> Retake
                </button>
            )}
            <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-xs transition hover:bg-rose-100 cursor-pointer"
            >
                <Trash2 size={13} /> Remove
            </button>
        </div>
    );

    return (
        <div
            data-revision-target={id}
            className={`scroll-mt-20 h-full flex flex-col rounded-2xl transition-all duration-300 ${
                isHighlighted ? 'ring-2 ring-clay-500 ring-offset-4 bg-clay-50/35' : ''
            }`}
        >
            <div className="flex items-start justify-between mb-2 gap-2 sm:min-h-[38px]">
                <div className="min-w-0">
                    <label htmlFor={id} className="block text-xs sm:text-sm font-semibold text-stone-900 cursor-pointer leading-snug">
                        {label}
                    </label>
                    {description && (
                        <span className="block text-[11px] text-stone-400 font-normal leading-tight mt-0.5">
                            {description}
                        </span>
                    )}
                </div>
                <div className="shrink-0 mt-0.5">
                    {isFlagged && isAddressed && hasFile ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                            <CheckCircle2 size={10} /> Updated
                        </span>
                    ) : isFlagged ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-300">
                            <AlertTriangle size={10} /> Needs Revision
                        </span>
                    ) : isVerifiedClean && hasFile ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={10} /> Verified — No Changes
                        </span>
                    ) : hasFile ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                            Attached
                        </span>
                    ) : null}
                </div>
            </div>

            <div
                onClick={() => !uploading && !showConfirmDelete && inputRef.current?.click()}
                className={`relative flex-1 min-h-[196px] cursor-pointer flex flex-col items-center justify-center rounded-xl border p-4 transition-all ${
                    isFlagged && isAddressed && hasFile
                        ? 'border-emerald-300 bg-emerald-50/25 hover:border-emerald-400'
                        : isFlagged
                        ? 'border-amber-300 bg-amber-50/30 hover:border-amber-400'
                        : uploading
                        ? 'border-clay-300 bg-clay-50/20 cursor-not-allowed'
                        : showConfirmDelete
                            ? 'border-rose-300 bg-rose-50/20 cursor-default'
                            : hasFile
                                ? 'border-stone-200 bg-stone-50/40 hover:bg-white hover:border-stone-300'
                                : 'border-dashed border-stone-300 bg-white hover:border-clay-400 hover:bg-stone-50/50'
                }`}
            >
                {isFlagged && revisionNote && !uploading && !showConfirmDelete && (
                    <p
                        onClick={(e) => e.stopPropagation()}
                        className={`w-full mb-3 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium text-left transition-colors ${
                            isAddressed && hasFile
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}
                    >
                        {revisionNote}
                    </p>
                )}
                {uploading ? (
                    <div className="flex flex-col items-center justify-center text-center" onClick={(e) => e.stopPropagation()}>
                        <Loader2 size={28} className="mb-2 text-clay-600 animate-spin" />
                        <p className="text-sm font-semibold text-stone-900">Processing document...</p>
                        <p className="text-xs text-stone-500 mb-3">Uploading to secure storage</p>
                        {canCancel && (
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition cursor-pointer"
                            >
                                <XCircle size={14} /> Cancel Upload
                            </button>
                        )}
                    </div>
                ) : showConfirmDelete ? (
                    <div className="flex w-full flex-col items-center justify-center text-center p-2" onClick={(e) => e.stopPropagation()}>
                        <Trash2 size={24} className="mb-2 text-rose-600" />
                        <p className="text-sm font-bold text-stone-900">Remove this document?</p>
                        <p className="text-xs text-stone-500 mb-3">You will need to upload a replacement before submitting.</p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={executeRemove}
                                className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-rose-700 cursor-pointer"
                            >
                                Yes, Remove
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowConfirmDelete(false)}
                                className="rounded-lg border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : previewUrl ? (
                    <div className="flex w-full flex-col items-center text-center">
                        <div className="relative mb-2.5 h-20 w-32 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-xs flex items-center justify-center">
                            <img
                                src={previewUrl}
                                alt="Document Preview"
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = '/images/placeholder.svg';
                                }}
                            />
                        </div>
                        <p className="max-w-full truncate text-xs font-semibold text-stone-800">
                            Document on File (Photo)
                        </p>
                        {renderFileActions()}
                    </div>
                ) : hasFile ? (
                    <div className="flex w-full flex-col items-center text-center">
                        <div className="relative mb-2.5 flex h-16 w-16 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 shadow-xs">
                            <FileText size={28} className="text-clay-600" />
                        </div>
                        <p className="max-w-full truncate text-xs font-semibold text-stone-800">
                            Document on File (PDF)
                        </p>
                        {renderFileActions()}
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-center w-full">
                        <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
                            <UploadCloud size={17} />
                        </div>
                        <p className="text-xs font-semibold text-stone-800">Upload document</p>
                        <p className="text-[10px] text-stone-400 mt-0.5">PDF, PNG, or JPG (max 4MB)</p>
                        {enableCameraCapture && (
                            <div className="mt-3 pt-2.5 border-t border-stone-200/70 w-full flex justify-center">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        cameraInputRef.current?.click();
                                    }}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-2xs transition cursor-pointer min-h-[34px]"
                                >
                                    <Camera size={13} />
                                    <span>Take Live Photo of Valid ID</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
                <input
                    ref={inputRef}
                    id={id}
                    name={id}
                    type="file"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e, false)}
                    accept="image/*,.pdf"
                    disabled={uploading}
                />
                {enableCameraCapture && (
                    <input
                        ref={cameraInputRef}
                        type="file"
                        className="hidden"
                        onChange={(e) => handleFileSelect(e, true)}
                        accept="image/*"
                        capture="environment"
                        disabled={uploading}
                    />
                )}
            </div>
            <InputError message={uploadError || error} className="mt-2" />
        </div>
    );
});

FileUploadField.displayName = 'FileUploadField';

export default FileUploadField;
