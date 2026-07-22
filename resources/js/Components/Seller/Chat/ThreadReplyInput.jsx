import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useForm } from '@inertiajs/react';
import { Send, Paperclip, FileIcon, ImageIcon, AlertCircle, X } from 'lucide-react';
import MentionDropdown from '@/Components/Seller/Chat/MentionDropdown';
import { compressImage } from '@/utils/imageCompressor';

export default function ThreadReplyInput({
    parent,
    onReplySuccess,
    eligibleContacts = []
}) {
    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);
    const inputRef = useRef(null);

    const [attachmentPreview, setAttachmentPreview] = useState(null);
    const [attachmentPreviewBroken, setAttachmentPreviewBroken] = useState(false);

    const form = useForm({
        parent_id: parent?.id || '',
        message: '',
        attachment: null,
    });

    const [mentionSearch, setMentionSearch] = useState('');
    const [mentionIndex, setMentionIndex] = useState(0);
    const [showMentions, setShowMentions] = useState(false);
    const [mentionStart, setMentionStart] = useState(-1);

    useEffect(() => {
        if (parent) {
            form.setData('parent_id', parent.id);
        }
    }, [parent?.id]);

    const checkMentions = (text, cursorPosition) => {
        if (!parent || !parent.team_channel_id) {
            setShowMentions(false);
            return;
        }

        const textBeforeCursor = text.slice(0, cursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        
        if (lastAtIndex !== -1) {
            const charBeforeAt = textBeforeCursor[lastAtIndex - 1];
            const isValidTrigger = lastAtIndex === 0 || /\s/.test(charBeforeAt);
            
            if (isValidTrigger) {
                const query = textBeforeCursor.slice(lastAtIndex + 1);
                if (!query.includes('\n') && query.length < 25) {
                    setMentionStart(lastAtIndex);
                    setMentionSearch(query);
                    setShowMentions(true);
                    setMentionIndex(0);
                    return;
                }
            }
        }
        setShowMentions(false);
    };

    const filteredMentions = useMemo(() => {
        if (!showMentions) return [];
        const search = mentionSearch.toLowerCase();
        return (eligibleContacts || []).filter(contact => 
            contact.name.toLowerCase().includes(search)
        );
    }, [eligibleContacts, showMentions, mentionSearch]);

    const isDropdownVisible = showMentions && filteredMentions.length > 0;

    const selectMention = (contact) => {
        if (mentionStart === -1) return;
        
        const messageText = form.data.message;
        const beforeAt = messageText.slice(0, mentionStart);
        
        const cursorPosition = inputRef.current ? inputRef.current.selectionStart : messageText.length;
        const afterMention = messageText.slice(cursorPosition);
        
        const replacement = `@[${contact.name}] `;
        const newText = beforeAt + replacement + afterMention;
        
        form.setData('message', newText);
        setShowMentions(false);
        
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
                const newCursorPos = beforeAt.length + replacement.length;
                inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 10);
    };

    const handleFileChange = async (event) => {
        let file = event.target.files?.[0];
        if (!file) return;

        if (file.type.startsWith('image/')) {
            file = await compressImage(file);
        }

        if (attachmentPreview?.url) {
            URL.revokeObjectURL(attachmentPreview.url);
        }

        form.setData('attachment', file);
        setAttachmentPreviewBroken(false);
        setAttachmentPreview({
            url: URL.createObjectURL(file),
            name: file.name,
            type: file.type.startsWith('image/') ? 'image' : 'document',
        });
    };

    const removeAttachment = () => {
        if (attachmentPreview?.url) {
            URL.revokeObjectURL(attachmentPreview.url);
        }
        form.setData('attachment', null);
        setAttachmentPreview(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.data.message.trim() && !form.data.attachment) return;

        form.post(route('team-messages.store'), {
            preserveScroll: true,
            preserveState: true,
            forceFormData: true,
            showProgress: false,
            onSuccess: () => {
                form.reset('message', 'attachment');
                if (attachmentPreview?.url) {
                    URL.revokeObjectURL(attachmentPreview.url);
                }
                setAttachmentPreview(null);
                if (onReplySuccess) {
                    onReplySuccess();
                }
            }
        });
    };

    return (
        <div className="p-3 border-t border-stone-100 bg-white shrink-0 relative">
            <MentionDropdown
                isVisible={isDropdownVisible}
                filteredMentions={filteredMentions}
                mentionIndex={mentionIndex}
                onSelect={selectMention}
            />

            {attachmentPreview && (
                <div className="mb-2 flex items-start justify-between rounded-lg border border-stone-200 bg-stone-50 p-2">
                    <div className="flex min-w-0 items-center gap-2">
                        {attachmentPreview.type === 'image' ? (
                            <img
                                src={attachmentPreview.url}
                                alt="Preview"
                                className="h-10 w-10 rounded object-cover border border-stone-200 bg-white"
                                onError={() => setAttachmentPreviewBroken(true)}
                            />
                        ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded border border-stone-200 bg-white text-stone-400">
                                <FileIcon size={14} />
                            </div>
                        )}
                        <span className="truncate text-[10px] font-semibold text-stone-600 max-w-[120px]">
                            {attachmentPreview.name}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={removeAttachment}
                        className="text-stone-400 hover:text-red-500 p-0.5 rounded"
                    >
                        <X size={12} />
                    </button>
                </div>
            )}

            {form.errors.message && (
                <p className="mb-1 inline-flex items-center gap-1.5 text-[9px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                    <AlertCircle size={10} /> {form.errors.message}
                </p>
            )}

            <form onSubmit={handleSubmit} className="flex items-end gap-1.5">
                <div className="relative flex-1 flex items-center bg-stone-50 border border-stone-200 rounded-xl px-2 py-1">
                    <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="p-1 text-stone-400 hover:text-clay-600 rounded-lg"
                        title="Add image"
                    >
                        <ImageIcon size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1 text-stone-400 hover:text-clay-600 rounded-lg mr-1"
                        title="Add file"
                    >
                        <Paperclip size={16} />
                    </button>
                    <input
                        ref={inputRef}
                        type="text"
                        value={form.data.message}
                        onChange={(e) => {
                            const val = e.target.value;
                            form.setData('message', val);
                            checkMentions(val, e.target.selectionStart);
                        }}
                        onSelect={(e) => {
                            checkMentions(e.target.value, e.target.selectionStart);
                        }}
                        onKeyDown={(e) => {
                            if (isDropdownVisible) {
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setMentionIndex((prev) => (prev + 1) % filteredMentions.length);
                                    return;
                                }
                                if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setMentionIndex((prev) => (prev - 1 + filteredMentions.length) % filteredMentions.length);
                                    return;
                                }
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    selectMention(filteredMentions[mentionIndex]);
                                    return;
                                }
                                if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setShowMentions(false);
                                    return;
                                }
                            }
                        }}
                        placeholder="Reply in thread..."
                        className="w-full bg-transparent border-none p-1 text-xs text-stone-700 placeholder-stone-400 focus:ring-0"
                    />
                </div>
                <button
                    type="submit"
                    disabled={form.processing || (!form.data.message.trim() && !form.data.attachment)}
                    className="bg-clay-600 text-white p-2 rounded-xl hover:bg-clay-700 shrink-0 disabled:opacity-50 min-h-[34px] min-w-[34px] flex items-center justify-center"
                >
                    <Send size={14} />
                </button>
            </form>

            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
            />
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.zip"
                onChange={handleFileChange}
                className="hidden"
            />
        </div>
    );
}
