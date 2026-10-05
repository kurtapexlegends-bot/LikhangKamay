/* global route, AbortController */
import React, { useRef, useState, useEffect } from 'react';
import { ShieldCheck, ArrowLeft, ArrowRight, UploadCloud, Eye, Trash2, Loader2, XCircle, FileText } from 'lucide-react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import DocumentViewerModal from '@/Components/Seller/Approvals/DocumentViewerModal';
import { compressImage } from '@/utils/imageCompressor';

export default function DocumentsStep({
    errors = {},
    submit,
    processing,
    setStep,
    auth,
}) {
    const [viewingDoc, setViewingDoc] = useState(null);

    return (
        <>
            <form onSubmit={submit} className="p-6 sm:p-10">
                <div className="mb-8">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-clay-50 border border-clay-200 text-clay-700 shadow-xs">
                            <ShieldCheck size={22} strokeWidth={2} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-stone-900 tracking-tight">Artisan Verification Documents</h2>
                            <p className="text-sm text-stone-500">Upload clear scans or photos of your government credentials and permits.</p>
                        </div>
                    </div>
                </div>

                <div className="mb-6 rounded-xl border border-stone-200 bg-stone-50/70 p-4 flex items-start gap-3">
                    <ShieldCheck size={18} className="mt-0.5 shrink-0 text-clay-600" />
                    <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                        <strong className="text-stone-900 font-semibold">Buyer Protection & Authenticity:</strong> Credentials are securely stored and reviewed solely by LikhangKamay verification officers to ensure handmade craftsmanship standards.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <FileUploadField
                        label="Business or Mayor's Permit"
                        description="Or Barangay Micro-Business Certificate"
                        id="business_permit"
                        existingFileUrl={auth.user.business_permit_url}
                        error={errors.business_permit}
                        onView={(doc) => setViewingDoc(doc)}
                    />
                    <FileUploadField
                        label="DTI Registration Certificate"
                        description="Department of Trade & Industry permit"
                        id="dti_registration"
                        existingFileUrl={auth.user.dti_registration_url}
                        error={errors.dti_registration}
                        onView={(doc) => setViewingDoc(doc)}
                    />
                    <FileUploadField
                        label="Valid Government ID (Front)"
                        description="PhilID, UMID, Driver's License, or Passport"
                        id="valid_id"
                        existingFileUrl={auth.user.valid_id_url}
                        error={errors.valid_id}
                        onView={(doc) => setViewingDoc(doc)}
                    />
                    <FileUploadField
                        label="TIN / BIR Registration"
                        description="TIN Card or BIR Certificate (Form 2303)"
                        id="tin_id"
                        existingFileUrl={auth.user.tin_id_url}
                        error={errors.tin_id}
                        onView={(doc) => setViewingDoc(doc)}
                    />
                </div>

                <div className="mt-10 flex items-center justify-between border-t border-stone-100 pt-6">
                    <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 active:bg-stone-100 cursor-pointer"
                    >
                        <ArrowLeft size={16} />
                        <span>Back to Shop Info</span>
                    </button>

                    <button
                        type="submit"
                        disabled={processing}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-clay-600 px-7 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-clay-700 active:bg-clay-800 disabled:opacity-50 cursor-pointer"
                    >
                        <span>{processing ? 'Saving...' : 'Continue to Payments'}</span>
                        <ArrowRight size={16} />
                    </button>
                </div>
            </form>

            {/* Document Viewer Modal */}
            <DocumentViewerModal
                isOpen={Boolean(viewingDoc)}
                onClose={() => setViewingDoc(null)}
                doc={viewingDoc}
            />
        </>
    );
}

const FileUploadField = React.memo(({ label, description, id, existingFileUrl, error, onView }) => {
    const inputRef = useRef(null);
    const activeRequestRef = useRef(null);
    const abortControllerRef = useRef(null);
    
    const [previewUrl, setPreviewUrl] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [canCancel, setCanCancel] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);

    useEffect(() => {
        if (existingFileUrl) {
            const isPdf = existingFileUrl.toLowerCase().endsWith('.pdf') || existingFileUrl.toLowerCase().includes('.pdf');
            if (!isPdf) {
                setPreviewUrl(existingFileUrl);
            } else {
                setPreviewUrl(null);
            }
        } else {
            setPreviewUrl(null);
        }
    }, [existingFileUrl]);

    const handleFileSelect = async (e) => {
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

            // Direct-to-storage presigned upload for PDFs or files > 1MB
            // Completely prevents multi-document payloads from exceeding Vercel 4.5MB serverless edge limit
            if (isPdf || fileToUpload.size > 1024 * 1024) {
                const abortController = new AbortController();
                abortControllerRef.current = abortController;

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
                    headers: {
                        'Content-Type': contentType,
                    },
                    body: fileToUpload,
                    signal: abortController.signal,
                });

                if (!uploadRes.ok) {
                    throw new Error('Direct file upload to storage failed.');
                }

                activeRequestRef.current = router.post(route('artisan.setup.upload-document', { type: id }), {
                    document_key: key,
                }, {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => {
                        setUploading(false);
                        setCanCancel(false);
                        activeRequestRef.current = null;
                        abortControllerRef.current = null;
                        if (inputRef.current) inputRef.current.value = '';
                    },
                    onError: (errs) => {
                        setUploading(false);
                        setCanCancel(false);
                        activeRequestRef.current = null;
                        abortControllerRef.current = null;
                        setUploadError(errs[id] || errs.document || 'Failed to link uploaded document.');
                        if (inputRef.current) inputRef.current.value = '';
                    },
                });
                return;
            }

            activeRequestRef.current = router.post(route('artisan.setup.upload-document', { type: id }), {
                document: fileToUpload,
            }, {
                forceFormData: true,
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setUploading(false);
                    setCanCancel(false);
                    activeRequestRef.current = null;
                    if (inputRef.current) {
                        inputRef.current.value = '';
                    }
                },
                onError: (errs) => {
                    setUploading(false);
                    setCanCancel(false);
                    activeRequestRef.current = null;
                    console.error('File Upload Error details:', errs);
                    setUploadError(errs[id] || errs.document || 'Failed to upload document.');
                    if (inputRef.current) {
                        inputRef.current.value = '';
                    }
                },
            });
        } catch (err) {
            setUploading(false);
            setCanCancel(false);
            activeRequestRef.current = null;
            abortControllerRef.current = null;
            if (err?.name === 'AbortError' || axios.isCancel(err)) {
                setUploadError('Upload cancelled.');
            } else {
                setUploadError(err?.response?.data?.error || err.message || 'Failed to process file before upload.');
            }
            if (inputRef.current) {
                inputRef.current.value = '';
            }
        }
    };

    const handleCancel = (e) => {
        e.stopPropagation();
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        if (activeRequestRef.current) {
            activeRequestRef.current.cancel();
            activeRequestRef.current = null;
        }
        setCanCancel(false);
        setUploading(false);
        setUploadError('Upload cancelled.');
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    const handleRemove = (e) => {
        e.stopPropagation();
        if (existingFileUrl) {
            setShowConfirmDelete(true);
        }
    };

    const executeRemove = (e) => {
        e.stopPropagation();
        setShowConfirmDelete(false);
        if (existingFileUrl) {
            setUploading(true);
            router.delete(route('artisan.setup.delete-document', { type: id }), {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => setUploading(false),
                onError: () => setUploading(false),
            });
        }
    };

    const handleView = (e) => {
        e.stopPropagation();
        const targetUrl = previewUrl || existingFileUrl;
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

    const hasFile = Boolean(existingFileUrl);

    return (
        <div className="flex flex-col">
            <div className="flex items-center justify-between mb-1.5">
                <div>
                    <InputLabel htmlFor={id} value={label} />
                    {description && <p className="text-[11px] text-stone-500">{description}</p>}
                </div>
                {hasFile ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                        Attached
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600 border border-stone-200">
                        Required
                    </span>
                )}
            </div>

            <div
                onClick={() => !uploading && !showConfirmDelete && inputRef.current?.click()}
                className={`mt-1 relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-2xl border p-5 transition-all ${
                    uploading
                        ? 'border-clay-300 bg-clay-50/20 cursor-not-allowed'
                        : showConfirmDelete
                            ? 'border-rose-300 bg-rose-50/20 cursor-default'
                            : hasFile
                                ? 'border-stone-200 bg-stone-50/40 hover:bg-white hover:border-stone-300'
                                : 'border-dashed border-stone-300 bg-white hover:border-clay-400 hover:bg-stone-50/50'
                }`}
            >
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
                            <img src={previewUrl} alt="Document Preview" className="h-full w-full object-cover" />
                        </div>
                        <p className="max-w-full truncate text-xs font-semibold text-stone-800">
                            Document on File (Photo)
                        </p>
                        <div className="mt-2.5 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleView}
                                className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-xs transition hover:bg-stone-50 cursor-pointer"
                            >
                                <Eye size={13} /> View
                            </button>
                            <button
                                type="button"
                                onClick={handleRemove}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-xs transition hover:bg-rose-100 cursor-pointer"
                            >
                                <Trash2 size={13} /> Remove
                            </button>
                        </div>
                    </div>
                ) : hasFile ? (
                    <div className="flex w-full flex-col items-center text-center">
                        <div className="relative mb-2.5 flex h-16 w-16 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 shadow-xs">
                            <FileText size={28} className="text-clay-600" />
                        </div>
                        <p className="max-w-full truncate text-xs font-semibold text-stone-800">
                            Document on File (PDF)
                        </p>
                        <div className="mt-2.5 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleView}
                                className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-xs transition hover:bg-stone-50 cursor-pointer"
                            >
                                <Eye size={13} /> View
                            </button>
                            <button
                                type="button"
                                onClick={handleRemove}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-xs transition hover:bg-rose-100 cursor-pointer"
                            >
                                <Trash2 size={13} /> Remove
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-center">
                        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-500">
                            <UploadCloud size={20} />
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-stone-800">Click or drag file to upload</p>
                        <p className="mt-0.5 text-[11px] text-stone-500">PNG, JPG, WEBP, or PDF up to 4MB</p>
                    </div>
                )}
                <input
                    ref={inputRef}
                    id={id}
                    name={id}
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                    accept="image/*,.pdf"
                    disabled={uploading}
                />
            </div>
            <InputError message={uploadError || error} className="mt-2" />
        </div>
    );
});

FileUploadField.displayName = 'FileUploadField';
