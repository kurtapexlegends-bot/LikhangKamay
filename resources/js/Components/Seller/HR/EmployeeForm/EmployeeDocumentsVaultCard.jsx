/* global route */
import React, { useId, useMemo, useRef, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import {
    FolderOpen,
    Upload,
    FileText,
    Image as ImageIcon,
    Eye,
    Trash2,
    Download,
    Plus,
    X,
    AlertCircle,
    CheckCircle2,
    Calendar,
    Loader2,
    Search,
    ArrowRight,
} from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import EmployeeDocumentPreviewModal from './EmployeeDocumentPreviewModal';
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

const CORE_REQUIREMENT_KEYS = [
    'valid_id',
    'resume',
    'nbi_clearance',
    'barangay_clearance',
    'medical_certificate',
    'employment_contract',
    'government_ids',
];

const formatBytes = (bytes) => {
    const num = Number(bytes || 0);
    if (!num) return '0 B';
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(2)} MB`;
};

const splitFilenameForTruncation = (filename) => {
    if (!filename) return { base: 'document', ext: '' };
    const dotIndex = filename.lastIndexOf('.');
    if (dotIndex <= 0 || dotIndex === filename.length - 1) {
        return { base: filename, ext: '' };
    }
    return {
        base: filename.slice(0, dotIndex),
        ext: filename.slice(dotIndex),
    };
};

const getExpiryMeta = (expiresAt) => {
    if (!expiresAt) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(`${expiresAt}T00:00:00`);
    if (Number.isNaN(exp.getTime())) return null;
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
        return { label: `Expired (${expiresAt})`, className: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    if (diffDays <= 30) {
        return { label: `Expiring (${expiresAt})`, className: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    return { label: `Valid until ${expiresAt}`, className: 'bg-stone-100 text-stone-600 border-stone-200' };
};

export default function EmployeeDocumentsVaultCard({
    employeeId = null,
    documents = [],
    isLoading = false,
    onDocumentsMutated = null,
    stagedDocuments = [],
    onAddStagedDocument = null,
    onRemoveStagedDocument = null,
    documentTypes = DEFAULT_DOCUMENT_TYPES,
    canEdit = true,
    compact = false,
}) {
    const { addToast } = useToast();
    const uid = useId();
    const fileInputRef = useRef(null);
    const uploadedPresignRef = useRef(null);

    const isStagedMode = !employeeId;
    const resolvedTypes = useMemo(() => (
        documentTypes && Object.keys(documentTypes).length > 0 ? documentTypes : DEFAULT_DOCUMENT_TYPES
    ), [documentTypes]);

    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [docType, setDocType] = useState('valid_id');
    const [title, setTitle] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadError, setUploadError] = useState('');
    const [isPreparingFile, setIsPreparingFile] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [previewDoc, setPreviewDoc] = useState(null);
    const [docSearch, setDocSearch] = useState('');

    const activeList = useMemo(() => (
        isStagedMode ? stagedDocuments : (Array.isArray(documents) ? documents : [])
    ), [isStagedMode, stagedDocuments, documents]);

    const filteredList = useMemo(() => {
        const q = docSearch.trim().toLowerCase();
        if (!q) return activeList;
        return activeList.filter((doc) => (
            (doc.title && doc.title.toLowerCase().includes(q)) ||
            (doc.original_filename && doc.original_filename.toLowerCase().includes(q)) ||
            (doc.document_type_label && doc.document_type_label.toLowerCase().includes(q))
        ));
    }, [activeList, docSearch]);

    const presentTypes = useMemo(() => new Set(activeList.map(doc => doc.document_type)), [activeList]);
    const stagedBytes = useMemo(() => stagedDocuments.reduce((sum, item) => sum + Number(item.file_size || item.file?.size || 0), 0), [stagedDocuments]);

    const resetUploadFields = () => {
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

    const handleFileSelect = async (e) => {
        const inputEl = e.target;
        const rawFile = inputEl.files?.[0];
        setUploadError('');
        uploadedPresignRef.current = null;
        if (!rawFile) {
            setSelectedFile(null);
            return;
        }

        if (isStagedMode && stagedDocuments.length >= 10) {
            setUploadError('You can attach up to 10 initial documents. Save the employee first to add more.');
            inputEl.value = '';
            setSelectedFile(null);
            return;
        }

        setIsPreparingFile(true);
        try {
            const { file, error } = await prepareEmployeeDocumentFile(rawFile);
            if (error || !file) {
                setUploadError(error || 'Unable to process selected file.');
                inputEl.value = '';
                setSelectedFile(null);
                return;
            }

            setSelectedFile(file);
        } finally {
            setIsPreparingFile(false);
        }
    };

    const handleUploadSubmit = async () => {
        if (!canEdit || isUploading || isPreparingFile) return;
        setUploadError('');

        if (!selectedFile) {
            setUploadError('Please select a file to upload.');
            return;
        }

        const resolvedTitle = title.trim() || resolvedTypes[docType] || 'Document';

        if (isStagedMode) {
            onAddStagedDocument?.({
                document_type: docType,
                document_type_label: resolvedTypes[docType] || 'Document',
                title: resolvedTitle,
                expires_at: expiresAt || '',
                notes: notes.trim(),
                file: selectedFile,
                file_size: selectedFile.size,
                original_filename: selectedFile.name,
                mime_type: selectedFile.type,
                is_pdf: selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf'),
                is_image: selectedFile.type.startsWith('image/'),
            });
            resetUploadFields();
            setIsUploadOpen(false);
            return;
        }

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
                    title: resolvedTitle,
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
                        resetUploadFields();
                        setIsUploadOpen(false);
                        onDocumentsMutated?.();
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

    const handleDeleteDocument = (doc) => {
        if (!canEdit) return;
        if (isStagedMode) {
            onRemoveStagedDocument?.(doc.local_id);
            setConfirmDeleteId(null);
            return;
        }

        setDeletingId(doc.id);
        router.delete(route('hr.employees.documents.destroy', [employeeId, doc.id]), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                addToast('Employee document removed.', 'success');
                setConfirmDeleteId(null);
                onDocumentsMutated?.();
            },
            onError: (errors) => {
                const msg = Object.values(errors)[0] || 'Failed to remove document.';
                addToast(String(msg), 'error');
            },
            onFinish: () => setDeletingId(null),
        });
    };

    return (
        <>
            <div className={`rounded-2xl border border-stone-200/80 bg-white ${compact ? 'p-3.5' : 'p-4 sm:p-5'} shadow-xs space-y-3.5`}>
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-stone-800 font-bold text-xs uppercase tracking-wider">
                        <FolderOpen size={14} className="text-clay-600 shrink-0" />
                        <span>Employee Documents</span>
                        <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-700 normal-case tracking-normal">
                            {activeList.length} {activeList.length === 1 ? 'file' : 'files'}
                        </span>
                    </div>

                    {canEdit && (
                        <button
                            type="button"
                            onClick={() => {
                                setIsUploadOpen(prev => !prev);
                                setUploadError('');
                            }}
                            aria-expanded={isUploadOpen}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-clay-200 bg-[#FCF7F2] px-3 py-1.5 text-[11px] font-bold text-clay-700 hover:bg-clay-100/70 transition min-h-[36px]"
                        >
                            {isUploadOpen ? <X size={13} /> : <Plus size={13} />}
                            <span>{isUploadOpen ? 'Close Uploader' : 'Add Document'}</span>
                        </button>
                    )}
                </div>

                {/* Compliance Coverage Chips */}
                <div className="flex flex-wrap gap-1.5">
                    {CORE_REQUIREMENT_KEYS.map((key) => {
                        const hasDoc = presentTypes.has(key);
                        const label = resolvedTypes[key] || key;
                        return (
                            <span
                                key={key}
                                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-semibold ${
                                    hasDoc
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : 'border-stone-200/80 bg-stone-50 text-stone-500'
                                }`}
                            >
                                {hasDoc && <CheckCircle2 size={10} className="shrink-0" />}
                                <span>{label}</span>
                            </span>
                        );
                    })}
                </div>

                {/* Upload Form */}
                {canEdit && isUploadOpen && (
                    <div className="rounded-xl border border-clay-200/80 bg-[#FCF7F2]/60 p-3.5 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                            <div className="sm:col-span-6">
                                <label htmlFor={`${uid}-doc-type`} className="mb-1 block text-[11px] font-bold text-stone-700">
                                    Document Type
                                </label>
                                <select
                                    id={`${uid}-doc-type`}
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
                                <label htmlFor={`${uid}-doc-title`} className="mb-1 block text-[11px] font-bold text-stone-700">
                                    Document Label
                                </label>
                                <input
                                    id={`${uid}-doc-title`}
                                    type="text"
                                    maxLength={150}
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder={resolvedTypes[docType] || 'Document title'}
                                    className={`${modalFieldClass} h-10 text-xs bg-white`}
                                />
                            </div>

                            <div className="sm:col-span-5">
                                <label htmlFor={`${uid}-doc-expiry`} className="mb-1 block text-[11px] font-bold text-stone-700">
                                    Expiry Date (Optional)
                                </label>
                                <input
                                    id={`${uid}-doc-expiry`}
                                    type="date"
                                    value={expiresAt}
                                    onChange={(e) => setExpiresAt(e.target.value)}
                                    className={`${modalFieldClass} h-10 text-xs bg-white`}
                                />
                            </div>

                            <div className="sm:col-span-7">
                                <label htmlFor={`${uid}-doc-notes`} className="mb-1 block text-[11px] font-bold text-stone-700">
                                    Notes (Optional)
                                </label>
                                <input
                                    id={`${uid}-doc-notes`}
                                    type="text"
                                    maxLength={500}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Reference number or remarks"
                                    className={`${modalFieldClass} h-10 text-xs bg-white`}
                                />
                            </div>

                            <div className="sm:col-span-12">
                                <label htmlFor={`${uid}-doc-file`} className="mb-1 block text-[11px] font-bold text-stone-700">
                                    File Attachment <span className="font-medium text-stone-500">(Max 4MB • JPG, PNG, WEBP, PDF)</span>
                                </label>
                                <input
                                    ref={fileInputRef}
                                    id={`${uid}-doc-file`}
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                                    aria-invalid={Boolean(uploadError)}
                                    onChange={handleFileSelect}
                                    className="block w-full text-xs text-stone-700 file:mr-3 file:rounded-lg file:border file:border-stone-200 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-stone-700 hover:file:bg-stone-50 cursor-pointer"
                                />
                            </div>
                        </div>

                        {uploadError && (
                            <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                <span>{uploadError}</span>
                            </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            {isStagedMode ? (
                                <span className="text-[11px] text-stone-500">
                                    Staged files: <strong className="text-stone-700">{stagedDocuments.length} / 10</strong> ({formatBytes(stagedBytes)})
                                </span>
                            ) : (
                                <span className="text-[11px] text-stone-500">
                                    Stored in private employee document vault.
                                </span>
                            )}

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={isUploading}
                                    onClick={() => {
                                        resetUploadFields();
                                        setIsUploadOpen(false);
                                    }}
                                    className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-600 hover:bg-stone-50 disabled:opacity-50 transition min-h-[38px]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={isUploading || isPreparingFile || !selectedFile}
                                    onClick={handleUploadSubmit}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-clay-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-clay-700 disabled:opacity-50 disabled:cursor-not-allowed transition min-h-[38px]"
                                >
                                    {(isUploading || isPreparingFile) ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                                    <span>{isPreparingFile ? 'Optimizing...' : (isUploading ? 'Uploading...' : (isStagedMode ? 'Attach to Employee' : 'Upload Document'))}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stored Document Rows */}
                {isLoading && activeList.length === 0 ? (
                    <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 px-4 py-5 flex items-center justify-center gap-2 text-xs font-medium text-stone-500">
                        <Loader2 size={14} className="animate-spin text-clay-600" />
                        <span>Loading employee documents...</span>
                    </div>
                ) : activeList.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/70 px-4 py-5 text-center">
                        <p className="text-xs font-semibold text-stone-600">No employee documents stored yet.</p>
                        <p className="mt-0.5 text-[11px] text-stone-400">
                            {canEdit
                                ? 'Use Add Document to upload IDs, clearances, contracts, or resumes.'
                                : 'Documents uploaded by HR appear here.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {activeList.length > 4 && (
                            <div className="relative">
                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                                <input
                                    type="search"
                                    value={docSearch}
                                    onChange={(e) => setDocSearch(e.target.value)}
                                    placeholder={`Search ${activeList.length} stored files...`}
                                    aria-label="Search stored employee documents"
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50/70 pl-8 pr-3 py-1.5 text-xs text-stone-800 outline-none focus:border-clay-500 focus:bg-white transition"
                                />
                            </div>
                        )}

                        {filteredList.length === 0 ? (
                            <div className="rounded-xl border border-stone-200/80 bg-stone-50/60 px-4 py-4 text-center text-xs text-stone-500">
                                No matching documents found.
                            </div>
                        ) : (
                            <div className="max-h-64 overflow-y-auto pr-1 space-y-2">
                                {filteredList.map((doc) => {
                            const key = isStagedMode ? doc.local_id : doc.id;
                            const { base, ext } = splitFilenameForTruncation(doc.original_filename);
                            const expiry = getExpiryMeta(doc.expires_at);
                            const isConfirming = confirmDeleteId === key;
                            const isDeleting = deletingId === doc.id;

                            return (
                                <div
                                    key={key}
                                    className="rounded-xl border border-stone-200/80 bg-stone-50/60 p-2.5 sm:p-3 transition hover:border-stone-300"
                                >
                                    <div className="flex items-start justify-between gap-2.5">
                                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white text-clay-600">
                                                {doc.is_image ? <ImageIcon size={15} /> : <FileText size={15} />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <span className="text-xs font-bold text-stone-900 truncate">
                                                        {doc.title || doc.document_type_label}
                                                    </span>
                                                    <span className="rounded-md border border-stone-200 bg-white px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-stone-600">
                                                        {doc.is_pdf ? 'PDF' : 'IMG'}
                                                    </span>
                                                </div>

                                                <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                                                    <span className="flex min-w-0 max-w-[200px] sm:max-w-[260px] whitespace-nowrap text-[11px] text-stone-500" title={doc.original_filename}>
                                                        <span className="truncate">{base}</span>
                                                        {ext && <span className="shrink-0">{ext}</span>}
                                                    </span>
                                                    <span className="text-[10px] text-stone-400 font-medium">
                                                        {formatBytes(doc.file_size)}
                                                    </span>
                                                    {expiry && (
                                                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${expiry.className}`}>
                                                            <Calendar size={10} />
                                                            {expiry.label}
                                                        </span>
                                                    )}
                                                </div>

                                                {doc.notes && (
                                                    <p className="mt-1 text-[11px] text-stone-500 truncate" title={doc.notes}>
                                                        {doc.notes}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            {doc.file_url && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => setPreviewDoc(doc)}
                                                        aria-label={`Preview ${doc.title || doc.original_filename}`}
                                                        title="Preview document"
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 hover:text-clay-700 hover:border-clay-300 transition"
                                                    >
                                                        <Eye size={13} />
                                                    </button>
                                                    {!isStagedMode && (
                                                        <a
                                                            href={doc.download_url || doc.file_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            download={doc.original_filename || 'document'}
                                                            aria-label={`Download ${doc.title || doc.original_filename}`}
                                                            title="Download file"
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 hover:text-stone-900 hover:border-stone-300 transition"
                                                        >
                                                            <Download size={13} />
                                                        </a>
                                                    )}
                                                </>
                                            )}

                                            {canEdit && !isConfirming && (
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmDeleteId(key)}
                                                    aria-label={`Delete ${doc.title || doc.original_filename}`}
                                                    title="Remove document"
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-400 hover:text-rose-600 hover:border-rose-200 transition"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {canEdit && isConfirming && (
                                        <div className="mt-2 pt-2 border-t border-stone-200/80 flex items-center justify-between gap-2">
                                            <span className="text-[11px] font-semibold text-rose-700">
                                                Remove this document permanently?
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmDeleteId(null)}
                                                    className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-bold text-stone-600 hover:bg-stone-50"
                                                >
                                                    Keep
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={isDeleting}
                                                    onClick={() => handleDeleteDocument(doc)}
                                                    className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                                                >
                                                    {isDeleting ? 'Removing...' : 'Remove'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                            </div>
                        )}

                        {!isStagedMode && employeeId && (
                            <div className="pt-1 flex justify-end">
                                <Link
                                    href={route('hr.employees.time-card', { employee: employeeId, tab: 'documents' })}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-clay-700 hover:text-clay-900 transition"
                                >
                                    <span>Manage all in Employee Records</span>
                                    <ArrowRight size={12} />
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <EmployeeDocumentPreviewModal
                document={previewDoc}
                onClose={() => setPreviewDoc(null)}
            />
        </>
    );
}
