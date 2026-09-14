import React from 'react';
import { X, ExternalLink, FileText, Image as ImageIcon } from 'lucide-react';

export default function DocumentViewerModal({
    isOpen = false,
    onClose,
    doc = null,
}) {
    if (!isOpen || !doc) return null;

    const docUrl = typeof doc === 'string' ? doc : doc.url;
    const docTitle = (typeof doc === 'object' && doc.title) ? doc.title : 'Document Preview';
    const isImage = typeof doc === 'object' && doc.type ? doc.type === 'image' : (
        docUrl && (/\.(jpe?g|png|webp|gif|svg)(\?.*)?$/i.test(docUrl) || docUrl.startsWith('data:image/') || docUrl.startsWith('blob:'))
    );

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <div 
                className="fixed inset-0" 
                onClick={onClose} 
            />

            <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden z-10 border border-stone-200 animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
                {/* Modal Header */}
                <header className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/60">
                    <div className="flex items-center gap-2 min-w-0">
                        {isImage ? (
                            <ImageIcon size={16} className="text-clay-600 shrink-0" />
                        ) : (
                            <FileText size={16} className="text-clay-600 shrink-0" />
                        )}
                        <h3 className="font-bold text-stone-900 text-xs sm:text-sm tracking-wide truncate">
                            {docTitle}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200/50 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                        title="Close preview"
                    >
                        <X size={18} />
                    </button>
                </header>

                {/* Modal Body */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex items-center justify-center bg-stone-100/50 min-h-[260px]">
                    {isImage ? (
                        <img
                            src={docUrl}
                            alt={docTitle}
                            className="max-h-[60vh] w-auto max-w-full rounded-xl object-contain shadow-sm border border-stone-200 bg-white"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/images/placeholder.svg';
                            }}
                        />
                    ) : (
                        <div className="text-center p-8 bg-white rounded-2xl border border-stone-200 shadow-2xs max-w-sm">
                            <FileText size={48} className="mx-auto text-clay-600/60 mb-3" />
                            <h4 className="text-sm font-bold text-stone-900 mb-1">{docTitle}</h4>
                            <p className="text-xs text-stone-500 mb-4">
                                Preview not available directly. Open or download to inspect file.
                            </p>
                            <a
                                href={docUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-clay-600 text-white font-bold text-xs hover:bg-clay-700 transition"
                            >
                                <ExternalLink size={13} />
                                <span>Open File</span>
                            </a>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <footer className="px-5 py-3 border-t border-stone-100 flex items-center justify-between bg-white">
                    <span className="text-[11px] text-stone-400 font-medium truncate max-w-[200px] sm:max-w-xs">
                        Artisan Evidence &amp; Verification
                    </span>
                    <div className="flex items-center gap-2">
                        {docUrl && (
                            <a
                                href={docUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 font-bold text-xs inline-flex items-center gap-1.5 transition"
                            >
                                <ExternalLink size={12} />
                                <span>Open in New Tab</span>
                            </a>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition cursor-pointer"
                        >
                            Close
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
}
