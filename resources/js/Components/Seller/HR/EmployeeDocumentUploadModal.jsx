/* global route */
import React, { useId, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import { useToast } from '@/Components/ToastContext';
import { AlertCircle, Loader2, Upload, X } from 'lucide-react';
import { modalFieldClass, modalSelectClass } from '@/utils/hrHelpers';
import {
    prepareEmployeeDocumentFile,
    uploadEmployeeDocumentToPresign,
} from '@/utils/employeeDocumentUpload';

const DEFAULT_DOCUMENT_TYPES = {
    valid_id: 'Valid Government ID',
    resume: 'Resume / CV',
    nbi_clearance: 'NBI / Police Clearance',
    barangay_clearance: 'Barangay Clearance',
    medical_certificate: 'Medical Certificate',
    employment_contract: 'Employment Contract',
    government_ids: 'SSS / PhilHealth / Pag-IBIG / TIN',
    other: 'Other Document',
};

export default function EmployeeDocumentUploadModal({
    isOpen,
    onClose,
    employeeId,
    documentTypes = DEFAULT_DOCUMENT_TYPES,
}) {
    const { addToast } = useToast();
    const uid = useId();
    const fileInputRef = useRef(null);
    const uploadedPresignRef = useRef(null);

    const resolvedTypes = documentTypes && Object.keys(documentTypes).length > 0
        ? documentTypes
        : DEFAULT_DOCUMENT_TYPES;

    const [docType, setDocType] = useState('valid_id');
    const [title, setTitle] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadError, setUploadError] = useState('');
    const [isPreparingFile, setIsPreparingFile] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const resetForm = () => {
        setDocType('valid_id');
        setTitle('');
        setExpiresAt('');
        setNotes('');
        setSelectedFile(null);
        setUploadError('');
        setIsPreparingFile(false);
        uploadedPresignRef.current = null;
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleClose = () => {
        if (isUploading || isPreparingFile) return;
        resetForm();
        onClose?.();
    };

    const handleFileSelect = async (e) => {
        const inputEl = e.target;
        const rawFile = inputEl.files?.[0];
        setUploadError('');
        uploadedPresignRef.current = null;
        if (!rawFile) {
            setSelectedFile(null);
            return;
        }

        setIsPreparingFile(true);
        try {
            const { file, error } = await prepareEmployeeDocumentFile(rawFile);
            if (error || !file) {
                setUploadError(error || 'Unable to process selected file.');
                setSelectedFile(null);
                inputEl.value = '';
                return;
            }

            setSelectedFile(file);
            if (!title.trim()) {
                setTitle(resolvedTypes[docType] || file.name.replace(/\.[^/.]+$/, ''));
            }
        } finally {
            setIsPreparingFile(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!employeeId || !selectedFile || isUploading || isPreparingFile) {
            if (!selectedFile) {
                setUploadError('Choose a file to upload.');
            }
            return;
        }

        setUploadError('');
        setIsUploading(true);

        try {
            let uploaded = uploadedPresignRef.current;
            if (!uploaded || uploaded.file !== selectedFile) {
                const { key, originalFilename } = await uploadEmployeeDocumentToPresign(selectedFile);
                uploaded = { file: selectedFile, key, originalFilename };
                uploadedPresignRef.current = uploaded;
            }

            router.post(
                route('hr.employees.documents.store', employeeId),
                {
                    document_type: docType,
                    title: title.trim() || undefined,
                    expires_at: expiresAt || undefined,
                    notes: notes.trim() || undefined,
                    document_key: uploaded.key,
                    original_filename: uploaded.originalFilename,
                },
                {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: (page) => {
                        if (page?.props?.flash?.error) {
                            setUploadError(String(page.props.flash.error));
                            return;
                        }
                        addToast('Employee document uploaded.', 'success');
                        resetForm();
                        onClose?.();
                    },
                    onError: (errors) => {
                        const msg = errors.document || errors.document_key || errors.document_type || errors.title || Object.values(errors)[0] || 'Failed to upload document.';
                        setUploadError(String(msg));
                    },
                    onFinish: () => setIsUploading(false),
                }
            );
        } catch (err) {
            const serverError = err?.response?.data?.error || err?.message || 'Failed to upload document.';
            setUploadError(String(serverError));
            setIsUploading(false);
        }
    };

    return (
        <Modal
            show={isOpen}
            onClose={handleClose}
            maxWidth="lg"
            bottomSheet={true}
        >
            <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white rounded-3xl">
                <div className="flex justify-between items-center pb-3 border-b border-stone-100">
                    <div>
                        <h3 className="text-sm font-extrabold text-stone-900">Upload Employee Document</h3>
                        <p className="text-[11px] text-stone-500 font-medium">
                            Attach IDs, clearances, contracts, or certificates (Max 4MB • JPG, PNG, WEBP, PDF)
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        aria-label="Close upload dialog"
                        className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                    <div className="sm:col-span-6">
                        <label htmlFor={`${uid}-modal-type`} className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                            Document Category
                        </label>
                        <select
                            id={`${uid}-modal-type`}
                            value={docType}
                            onChange={(e) => setDocType(e.target.value)}
                            className={`${modalSelectClass} h-10 text-xs font-medium bg-white`}
                        >
                            {Object.entries(resolvedTypes).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="sm:col-span-6">
                        <label htmlFor={`${uid}-modal-title`} className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                            Document Title
                        </label>
                        <input
                            id={`${uid}-modal-title`}
                            type="text"
                            maxLength={150}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={resolvedTypes[docType] || 'Document title'}
                            className={`${modalFieldClass} h-10 text-xs bg-white`}
                        />
                    </div>

                    <div className="sm:col-span-5">
                        <label htmlFor={`${uid}-modal-expiry`} className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                            Expiry Date (Optional)
                        </label>
                        <input
                            id={`${uid}-modal-expiry`}
                            type="date"
                            value={expiresAt}
                            onChange={(e) => setExpiresAt(e.target.value)}
                            className={`${modalFieldClass} h-10 text-xs bg-white`}
                        />
                    </div>

                    <div className="sm:col-span-7">
                        <label htmlFor={`${uid}-modal-notes`} className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                            Notes (Optional)
                        </label>
                        <input
                            id={`${uid}-modal-notes`}
                            type="text"
                            maxLength={500}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Reference number or remarks"
                            className={`${modalFieldClass} h-10 text-xs bg-white`}
                        />
                    </div>

                    <div className="sm:col-span-12">
                        <label htmlFor={`${uid}-modal-file`} className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                            File Attachment
                        </label>
                        <input
                            ref={fileInputRef}
                            id={`${uid}-modal-file`}
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,.pdf"
                            aria-invalid={Boolean(uploadError)}
                            onChange={handleFileSelect}
                            className="block w-full rounded-xl border border-stone-200 bg-stone-50/50 p-2 text-xs text-stone-700 file:mr-3 file:rounded-lg file:border file:border-stone-200 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-stone-700 hover:file:bg-stone-50 cursor-pointer"
                        />
                    </div>
                </div>

                {uploadError && (
                    <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
                        <AlertCircle size={15} className="shrink-0 mt-0.5" />
                        <span>{uploadError}</span>
                    </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isUploading}
                        className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl transition min-h-[40px]"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isUploading || isPreparingFile || !selectedFile}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-clay-600 hover:bg-clay-700 rounded-xl transition shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px]"
                    >
                        {(isUploading || isPreparingFile) ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        <span>{isPreparingFile ? 'Optimizing...' : (isUploading ? 'Uploading...' : 'Upload Document')}</span>
                    </button>
                </div>
            </form>
        </Modal>
    );
}
