/* global route */
import React, { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import {
    Download,
    Eye,
    FileText,
    FolderOpen,
    Image as ImageIcon,
    Loader2,
    Plus,
    Trash2,
} from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import CompactPagination from '@/Components/CompactPagination';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import EmployeeDocumentPreviewModal from '@/Components/Seller/HR/EmployeeForm/EmployeeDocumentPreviewModal';
import { formatShortDateSafe } from '@/utils/hrHelpers';

const ITEMS_PER_PAGE = 10;

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

export default function EmployeeDocumentsTable({
    employeeId,
    documents = [],
    documentTypes = {},
    canEdit = false,
    onOpenUploadModal,
}) {
    const { addToast } = useToast();
    const [deletingId, setDeletingId] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [previewDoc, setPreviewDoc] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);

    const totalItems = documents?.length || 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);

    const paginatedDocuments = useMemo(() => {
        if (!Array.isArray(documents) || documents.length === 0) return [];
        const start = (safePage - 1) * ITEMS_PER_PAGE;
        return documents.slice(start, start + ITEMS_PER_PAGE);
    }, [documents, safePage]);

    const handleDeleteDocument = (doc) => {
        if (!canEdit || !employeeId) return;
        setDeletingId(doc.id);
        router.delete(route('hr.employees.documents.destroy', [employeeId, doc.id]), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                addToast('Employee document removed.', 'success');
                setConfirmDeleteId(null);
            },
            onError: (errors) => {
                const msg = Object.values(errors)[0] || 'Failed to remove document.';
                addToast(String(msg), 'error');
            },
            onFinish: () => setDeletingId(null),
        });
    };

    if (!documents || documents.length === 0) {
        return (
            <div className="p-4 sm:p-6">
                <WorkspaceEmptyState
                    icon={FolderOpen}
                    title="No employee documents"
                    description={canEdit
                        ? 'Upload government IDs, clearances, contracts, or medical certificates for this staff member.'
                        : 'No documents have been uploaded for this employee.'}
                    actionLabel={canEdit && onOpenUploadModal ? 'Add Document' : undefined}
                    onAction={canEdit ? onOpenUploadModal : undefined}
                    compact
                />
            </div>
        );
    }

    return (
        <>
            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto min-w-0">
                <table className="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr className="border-b border-stone-200/80 bg-stone-50/60 text-[10px] font-extrabold uppercase tracking-wider text-stone-500">
                            <th className="py-3 px-4">Document</th>
                            <th className="py-3 px-4">Category</th>
                            <th className="py-3 px-4">Uploaded</th>
                            <th className="py-3 px-4">Expiry</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                        {paginatedDocuments.map((doc) => {
                            const { base, ext } = splitFilenameForTruncation(doc.original_filename);
                            const expiryMeta = getExpiryMeta(doc.expires_at);
                            const isConfirming = confirmDeleteId === doc.id;
                            const isDeleting = deletingId === doc.id;
                            const categoryLabel = doc.document_type_label || documentTypes[doc.document_type] || 'Document';

                            return (
                                <tr key={doc.id} className="hover:bg-stone-50/50 transition-colors">
                                    <td className="py-3 px-4 min-w-0 max-w-[300px]">
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                                                doc.is_pdf
                                                    ? 'bg-rose-50 text-rose-600 border-rose-100'
                                                    : 'bg-clay-50 text-clay-600 border-clay-100'
                                            }`}>
                                                {doc.is_pdf ? <FileText size={16} /> : <ImageIcon size={16} />}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-bold text-stone-900 truncate">
                                                    {doc.title || categoryLabel}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[11px] text-stone-500 min-w-0 mt-0.5">
                                                    <span className="inline-flex min-w-0 max-w-[200px]">
                                                        <span className="truncate">{base}</span>
                                                        <span className="shrink-0">{ext}</span>
                                                    </span>
                                                    <span className="shrink-0 text-stone-300">•</span>
                                                    <span className="shrink-0 font-medium">{formatBytes(doc.file_size)}</span>
                                                </div>
                                                {doc.notes && (
                                                    <p className="text-[11px] text-stone-500 truncate mt-0.5">{doc.notes}</p>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    <td className="py-3 px-4 whitespace-nowrap">
                                        <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-100/80 px-2.5 py-0.5 text-[11px] font-bold text-stone-700">
                                            {categoryLabel}
                                        </span>
                                    </td>

                                    <td className="py-3 px-4 whitespace-nowrap">
                                        <div className="font-semibold text-stone-800">
                                            {(doc.uploaded_at || doc.created_at)
                                                ? formatShortDateSafe(doc.uploaded_at || doc.created_at)
                                                : 'Recently'}
                                        </div>
                                        {doc.uploaded_by_name && (
                                            <div className="text-[11px] text-stone-500">by {doc.uploaded_by_name}</div>
                                        )}
                                    </td>

                                    <td className="py-3 px-4 whitespace-nowrap">
                                        {expiryMeta ? (
                                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${expiryMeta.className}`}>
                                                {expiryMeta.label}
                                            </span>
                                        ) : (
                                            <span className="text-[11px] text-stone-400 font-medium">No expiry</span>
                                        )}
                                    </td>

                                    <td className="py-3 px-4 text-right whitespace-nowrap">
                                        <div className="inline-flex items-center justify-end gap-1.5">
                                            {doc.file_url && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => setPreviewDoc(doc)}
                                                        title="Preview document"
                                                        aria-label={`Preview ${doc.title || categoryLabel}`}
                                                        className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white p-2 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition min-h-[36px] min-w-[36px]"
                                                    >
                                                        <Eye size={14} />
                                                    </button>
                                                    <a
                                                        href={doc.download_url || doc.file_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        download={doc.original_filename || true}
                                                        title="Download document"
                                                        aria-label={`Download ${doc.title || categoryLabel}`}
                                                        className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white p-2 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition min-h-[36px] min-w-[36px]"
                                                    >
                                                        <Download size={14} />
                                                    </a>
                                                </>
                                            )}

                                            {canEdit && (
                                                isConfirming ? (
                                                    <div className="inline-flex items-center gap-1 ml-1">
                                                        <button
                                                            type="button"
                                                            disabled={isDeleting}
                                                            onClick={() => handleDeleteDocument(doc)}
                                                            className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-rose-700 disabled:opacity-50 min-h-[36px]"
                                                        >
                                                            {isDeleting && <Loader2 size={12} className="animate-spin" />}
                                                            <span>Remove</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={isDeleting}
                                                            onClick={() => setConfirmDeleteId(null)}
                                                            className="rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-600 hover:bg-stone-50 min-h-[36px]"
                                                        >
                                                            Keep
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmDeleteId(doc.id)}
                                                        title="Remove document"
                                                        aria-label={`Remove ${doc.title || categoryLabel}`}
                                                        className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white p-2 text-stone-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 transition min-h-[36px] min-w-[36px]"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View (< md) */}
            <div className="md:hidden divide-y divide-stone-100">
                {paginatedDocuments.map((doc) => {
                    const { base, ext } = splitFilenameForTruncation(doc.original_filename);
                    const expiryMeta = getExpiryMeta(doc.expires_at);
                    const isConfirming = confirmDeleteId === doc.id;
                    const isDeleting = deletingId === doc.id;
                    const categoryLabel = doc.document_type_label || documentTypes[doc.document_type] || 'Document';

                    return (
                        <div key={doc.id} className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2.5 min-w-0">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                                        doc.is_pdf
                                            ? 'bg-rose-50 text-rose-600 border-rose-100'
                                            : 'bg-clay-50 text-clay-600 border-clay-100'
                                    }`}>
                                        {doc.is_pdf ? <FileText size={16} /> : <ImageIcon size={16} />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-stone-900 truncate">
                                            {doc.title || categoryLabel}
                                        </p>
                                        <div className="flex items-center gap-1.5 text-[11px] text-stone-500 min-w-0 mt-0.5">
                                            <span className="inline-flex min-w-0">
                                                <span className="truncate">{base}</span>
                                                <span className="shrink-0">{ext}</span>
                                            </span>
                                            <span className="shrink-0 text-stone-300">•</span>
                                            <span className="shrink-0">{formatBytes(doc.file_size)}</span>
                                        </div>
                                    </div>
                                </div>
                                <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-100/80 px-2 py-0.5 text-[10px] font-bold text-stone-700 shrink-0">
                                    {categoryLabel}
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500">
                                <span>
                                    Uploaded {(doc.uploaded_at || doc.created_at)
                                        ? formatShortDateSafe(doc.uploaded_at || doc.created_at)
                                        : 'recently'}
                                    {doc.uploaded_by_name ? ` by ${doc.uploaded_by_name}` : ''}
                                </span>
                                {expiryMeta && (
                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${expiryMeta.className}`}>
                                        {expiryMeta.label}
                                    </span>
                                )}
                            </div>

                            {doc.notes && (
                                <p className="text-[11px] text-stone-600 bg-stone-50 rounded-xl border border-stone-200/70 px-3 py-2">
                                    {doc.notes}
                                </p>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-1">
                                {doc.file_url && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setPreviewDoc(doc)}
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 min-h-[44px]"
                                        >
                                            <Eye size={14} />
                                            <span>Preview</span>
                                        </button>
                                        <a
                                            href={doc.download_url || doc.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            download={doc.original_filename || true}
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 min-h-[44px]"
                                        >
                                            <Download size={14} />
                                            <span>Download</span>
                                        </a>
                                    </>
                                )}
                                {canEdit && (
                                    isConfirming ? (
                                        <>
                                            <button
                                                type="button"
                                                disabled={isDeleting}
                                                onClick={() => handleDeleteDocument(doc)}
                                                className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white min-h-[44px]"
                                            >
                                                {isDeleting && <Loader2 size={13} className="animate-spin" />}
                                                <span>Remove</span>
                                            </button>
                                            <button
                                                type="button"
                                                disabled={isDeleting}
                                                onClick={() => setConfirmDeleteId(null)}
                                                className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-600 min-h-[44px]"
                                            >
                                                Keep
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setConfirmDeleteId(doc.id)}
                                            className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white p-2.5 text-stone-500 hover:bg-rose-50 hover:text-rose-700 min-h-[44px] min-w-[44px]"
                                            aria-label={`Remove ${doc.title || categoryLabel}`}
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {totalPages > 1 && (
                <CompactPagination
                    currentPage={safePage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                    itemLabel="documents"
                />
            )}

            {canEdit && onOpenUploadModal && (
                <div className="border-t border-stone-100 px-4 py-3 bg-stone-50/40 flex items-center justify-between text-[11px] text-stone-500 rounded-b-2xl sm:rounded-b-3xl">
                    <span>{documents.length} stored {documents.length === 1 ? 'document' : 'documents'}</span>
                    <button
                        type="button"
                        onClick={onOpenUploadModal}
                        className="inline-flex items-center gap-1 font-bold text-clay-700 hover:text-clay-900 transition"
                    >
                        <Plus size={13} />
                        <span>Add Document</span>
                    </button>
                </div>
            )}

            <EmployeeDocumentPreviewModal
                document={previewDoc}
                onClose={() => setPreviewDoc(null)}
            />
        </>
    );
}
