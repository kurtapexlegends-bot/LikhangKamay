import React, { useState } from 'react';
import { FileIcon, X } from 'lucide-react';

export default function MessageAttachmentPreview({
    attachmentPreview,
    removeAttachment,
}) {
    const [attachmentPreviewBroken, setAttachmentPreviewBroken] = useState(false);

    if (!attachmentPreview) return null;

    return (
        <div className="group mb-3 mt-3 flex items-start justify-between rounded-xl border border-gray-200 bg-gray-50 p-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex min-w-0 items-center gap-3 overflow-hidden">
                {attachmentPreview.type === 'image' ? (
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                        {attachmentPreviewBroken ? (
                            <div className="flex h-full w-full items-center justify-center bg-stone-50 text-stone-400">
                                <FileIcon size={18} />
                            </div>
                        ) : (
                            <img
                                src={attachmentPreview.url}
                                alt="Preview"
                                className="h-full w-full object-cover"
                                onError={() => setAttachmentPreviewBroken(true)}
                            />
                        )}
                    </div>
                ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-clay-500 shadow-sm">
                        <FileIcon size={24} />
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <p className="mb-0.5 truncate text-sm font-medium text-gray-800">{attachmentPreview.name}</p>
                    <p className="text-xs text-gray-500">
                        {attachmentPreview.type === 'image' ? 'Image File' : 'Document File'}
                    </p>
                </div>
            </div>
            <button
                type="button"
                onClick={removeAttachment}
                className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
            >
                <X size={16} />
            </button>
        </div>
    );
}
