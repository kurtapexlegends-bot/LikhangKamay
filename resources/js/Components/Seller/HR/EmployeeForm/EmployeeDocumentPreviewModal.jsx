import React from 'react';
import { X, FileText, Download, ExternalLink, Calendar, Shield } from 'lucide-react';
import Modal from '@/Components/Modal';

const formatBytes = (bytes) => {
    const num = Number(bytes || 0);
    if (!num) return '0 B';
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(2)} MB`;
};

export default function EmployeeDocumentPreviewModal({ document, onClose }) {
    if (!document) return null;

    const fileUrl = document.file_url;

    return (
        <Modal show={true} onClose={onClose} maxWidth="3xl">
            <div className="bg-white rounded-2xl overflow-hidden flex flex-col max-h-[88vh]">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-stone-100 bg-[#FDFBF9]">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-clay-200 bg-[#FCF7F2] text-clay-700">
                            <FileText size={16} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-bold text-stone-900 truncate">
                                    {document.title || document.document_type_label}
                                </h3>
                                <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">
                                    {document.document_type_label || 'Document'}
                                </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-500">
                                <span className="truncate max-w-[260px]" title={document.original_filename}>
                                    {document.original_filename}
                                </span>
                                <span>{formatBytes(document.file_size)}</span>
                                {document.expires_at && (
                                    <span className="inline-flex items-center gap-1 text-stone-600 font-medium">
                                        <Calendar size={11} />
                                        Expires: {document.expires_at}
                                    </span>
                                )}
                                {document.uploaded_by_name && (
                                    <span className="inline-flex items-center gap-1">
                                        <Shield size={11} />
                                        Uploaded by {document.uploaded_by_name}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        {fileUrl && (
                            <>
                                <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition min-h-[36px]"
                                >
                                    <ExternalLink size={13} />
                                    <span className="hidden sm:inline">Open</span>
                                </a>
                                <a
                                    href={document.download_url || fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={document.original_filename || 'employee-document'}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-clay-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-clay-700 transition min-h-[36px]"
                                >
                                    <Download size={13} />
                                    <span className="hidden sm:inline">Download</span>
                                </a>
                            </>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close document preview"
                            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Preview Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-stone-50/80">
                    {!fileUrl ? (
                        <div className="py-12 text-center text-xs text-stone-500">
                            File URL is unavailable.
                        </div>
                    ) : document.is_image ? (
                        <div className="flex items-center justify-center">
                            <img
                                src={fileUrl}
                                alt={document.title || 'Employee Document'}
                                className="max-h-[65vh] w-auto max-w-full rounded-xl border border-stone-200 bg-white object-contain shadow-xs"
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = '/images/placeholder.svg';
                                }}
                            />
                        </div>
                    ) : document.is_pdf ? (
                        <div className="space-y-3">
                            <iframe
                                src={fileUrl}
                                title={document.title || 'PDF Document Preview'}
                                className="w-full h-[62vh] rounded-xl border border-stone-200 bg-white"
                            />
                        </div>
                    ) : (
                        <div className="py-10 text-center space-y-3 bg-white rounded-2xl border border-stone-200 p-6">
                            <FileText size={28} className="mx-auto text-clay-600" />
                            <p className="text-xs font-semibold text-stone-700">
                                Preview is not available for this file format.
                            </p>
                            <a
                                href={document.download_url || fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={document.original_filename || 'document'}
                                className="inline-flex items-center gap-2 rounded-xl bg-clay-600 px-4 py-2 text-xs font-bold text-white hover:bg-clay-700 transition"
                            >
                                <Download size={14} />
                                <span>Download File</span>
                            </a>
                        </div>
                    )}

                    {document.notes && (
                        <div className="mt-4 rounded-xl border border-stone-200 bg-white px-4 py-3 text-xs text-stone-600">
                            <span className="font-bold text-stone-800">Notes: </span>
                            {document.notes}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
