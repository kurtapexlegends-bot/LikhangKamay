import React, { useRef, useState, useEffect } from 'react';
import { FileText, ArrowLeft, ArrowRight, UploadCloud, FileCheck, Eye, Trash2, Loader2 } from 'lucide-react';
import { router } from '@inertiajs/react';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';

// Helper function to compress images client-side using Canvas
const compressImage = (file, maxWidth = 1600, maxHeight = 1600, quality = 0.8) => {
    return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) {
            resolve(file);
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Resize if too large
                if (width > maxWidth || height > maxHeight) {
                    if (width > height) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const compressedFile = new File([blob], file.name, {
                                type: file.type || 'image/jpeg',
                                lastModified: Date.now(),
                            });
                            resolve(compressedFile);
                        } else {
                            resolve(file);
                        }
                    },
                    file.type || 'image/jpeg',
                    quality
                );
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
};

export default function DocumentsStep({
    submit,
    processing,
    setStep,
    auth,
}) {
    return (
        <form onSubmit={submit} className="p-6 sm:p-10">
            <div className="mb-8">
                <div className="mb-1 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                        <FileText size={20} className="text-amber-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Legal Verification</h2>
                        <p className="text-sm text-gray-500">Upload clear photos or scans of your documents (uploaded one-by-one to avoid platform size limits)</p>
                    </div>
                </div>
            </div>

            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-800">
                    <strong>Why do we need these?</strong> To protect buyers and ensure authenticity of all artisan sellers on our platform.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <FileUploadField
                    label="Business Permit (Mayor's Permit)"
                    id="business_permit"
                    existingFileUrl={auth.user.business_permit ? '/storage/' + auth.user.business_permit : null}
                />
                <FileUploadField
                    label="DTI Registration"
                    id="dti_registration"
                    existingFileUrl={auth.user.dti_registration ? '/storage/' + auth.user.dti_registration : null}
                />
                <FileUploadField
                    label="Valid Government ID (Front)"
                    id="valid_id"
                    existingFileUrl={auth.user.valid_id ? '/storage/' + auth.user.valid_id : null}
                />
                <FileUploadField
                    label="TIN ID / Registration"
                    id="tin_id"
                    existingFileUrl={auth.user.tin_id ? '/storage/' + auth.user.tin_id : null}
                />
            </div>

            <div className="mt-8 flex items-center justify-between">
                <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 font-medium text-gray-500 transition hover:text-gray-700 active:scale-95"
                >
                    <ArrowLeft size={16} /> Back
                </button>

                <button
                    type="submit"
                    disabled={processing}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-clay-600 to-clay-700 px-8 py-3.5 font-bold text-white shadow-lg shadow-clay-200 transition hover:from-clay-700 hover:to-clay-800 disabled:opacity-50 active:scale-95"
                >
                    {processing ? 'Saving...' : 'Continue to Payments'} <ArrowRight size={18} />
                </button>
            </div>
        </form>
    );
}

const FileUploadField = React.memo(({ label, id, existingFileUrl }) => {
    const inputRef = useRef(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);

    useEffect(() => {
        if (existingFileUrl) {
            const isPdf = existingFileUrl.toLowerCase().endsWith('.pdf');
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
        setUploadError(null);

        try {
            // Compress the image client-side to ensure it passes Vercel's 4.5MB gateway limit.
            const fileToUpload = await compressImage(selectedFile);

            router.post(route('artisan.setup.upload-document', { type: id }), {
                document: fileToUpload,
            }, {
                forceFormData: true,
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setUploading(false);
                    if (inputRef.current) {
                        inputRef.current.value = '';
                    }
                },
                onError: (errs) => {
                    setUploading(false);
                    console.error('File Upload Error details:', errs);
                    setUploadError(errs.document || 'Failed to upload document.');
                    if (inputRef.current) {
                        inputRef.current.value = '';
                    }
                },
            });
        } catch (err) {
            setUploading(false);
            setUploadError('Failed to process file before upload.');
            console.error('File compression error:', err);
        }
    };

    const handleRemove = (e) => {
        e.stopPropagation();
        if (existingFileUrl) {
            if (confirm('Are you sure you want to remove this document?')) {
                setUploading(true);
                router.delete(route('artisan.setup.delete-document', { type: id }), {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => setUploading(false),
                    onError: () => setUploading(false),
                });
            }
        }
    };

    const handleView = (e) => {
        e.stopPropagation();
        if (existingFileUrl) {
            window.open(existingFileUrl, '_blank');
        }
    };

    return (
        <div>
            <InputLabel htmlFor={id} value={label} />
            <div
                onClick={() => !uploading && inputRef.current?.click()}
                className={`mt-1 relative flex min-h-[170px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] hover:shadow-md ${
                    uploading
                        ? 'border-clay-300 bg-clay-50/10 cursor-not-allowed'
                        : existingFileUrl
                            ? 'border-clay-400 bg-clay-50/30'
                            : 'border-gray-200 bg-white/50 backdrop-blur-sm hover:border-clay-300 hover:bg-white'
                }`}
            >
                {uploading ? (
                    <div className="flex flex-col items-center justify-center">
                        <Loader2 size={32} className="mb-2 text-clay-600 animate-spin" />
                        <p className="text-sm font-semibold text-clay-800">Processing document...</p>
                        <p className="text-xs text-clay-500">Uploading to secure storage</p>
                    </div>
                ) : previewUrl ? (
                    <div className="flex w-full flex-col items-center">
                        <div className="relative mb-3 h-24 w-full overflow-hidden rounded-xl border border-clay-200 bg-white shadow-inner flex items-center justify-center">
                            <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                        </div>
                        <p className="max-w-full truncate text-xs font-semibold text-clay-800">
                            Document on File (Image)
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleView}
                                className="flex items-center gap-1 rounded-lg bg-white border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95"
                            >
                                <Eye size={14} /> View
                            </button>
                            <button
                                type="button"
                                onClick={handleRemove}
                                className="flex items-center gap-1 rounded-lg bg-red-50 border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm transition hover:bg-red-100 active:scale-95"
                            >
                                <Trash2 size={14} /> Remove
                            </button>
                        </div>
                    </div>
                ) : existingFileUrl ? (
                    <div className="flex w-full flex-col items-center">
                        <div className="relative mb-3 h-24 w-full overflow-hidden rounded-xl border border-clay-200 bg-white shadow-inner flex items-center justify-center">
                            <FileCheck size={40} className="text-clay-600 animate-pulse" />
                        </div>
                        <p className="max-w-full truncate text-xs font-semibold text-clay-800">
                            Document on File (PDF)
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleView}
                                className="flex items-center gap-1 rounded-lg bg-white border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95"
                            >
                                <Eye size={14} /> View
                            </button>
                            <button
                                type="button"
                                onClick={handleRemove}
                                className="flex items-center gap-1 rounded-lg bg-red-50 border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm transition hover:bg-red-100 active:scale-95"
                            >
                                <Trash2 size={14} /> Remove
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <UploadCloud size={32} className="mb-2 text-gray-400" />
                        <p className="text-sm font-medium text-gray-600">Click to upload</p>
                        <p className="text-xs text-gray-400">PNG, JPG, PDF up to 10MB</p>
                    </>
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
            <InputError message={uploadError} className="mt-2" />
        </div>
    );
});
