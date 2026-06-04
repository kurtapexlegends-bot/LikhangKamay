import React from 'react';
import EmojiPicker from 'emoji-picker-react';
import { 
    Send, Paperclip, Image as ImageIcon, Smile, 
    MessageCircle, FileIcon, X, LoaderCircle 
} from 'lucide-react';
import { SellerOrderActionBar } from '@/Components/Chat/OrderContextCard';
import ReadOnlyCapabilityNotice from '@/Components/Seller/Shared/ReadOnlyCapabilityNotice';

export default function MessageInput({
    currentChatUser,
    currentOrderContext,
    data,
    setData,
    post,
    reset,
    processing,
    inputRef,
    fileInputRef,
    imageInputRef,
    emojiPickerRef,
    templateSelectorRef,
    showEmojiPicker,
    setShowEmojiPicker,
    showTemplateSelector,
    setShowTemplateSelector,
    showTemplateManager,
    setShowTemplateManager,
    chatTemplates,
    isMessagesReadOnly,
    handleOrderDecision,
    handleFileChange,
    removeAttachment,
    attachmentPreview,
    signalTyping,
    onEmojiClick,
    injectTemplate
}) {
    if (!currentChatUser) return null;

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (isMessagesReadOnly) return;
        if (!data.message.trim() && !data.attachment) return;
        
        post(route('chat.store'), {
            onSuccess: () => {
                reset('message', 'attachment');
                removeAttachment();
                setShowEmojiPicker(false);
                if (inputRef.current) inputRef.current.style.height = 'auto';
            },
            preserveScroll: true
        });
    };

    return (
        <div className="p-3 sm:p-4 bg-white/90 backdrop-blur-md border-t border-gray-100 shrink-0 relative shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 w-full">
            <div className="max-w-4xl mx-auto flex flex-col">
                <SellerOrderActionBar
                    order={currentOrderContext}
                    onApprove={() => handleOrderDecision('Accepted')}
                    onReject={() => handleOrderDecision('Rejected')}
                />

                {/* Mobile Quick Templates Carousel: Swipable scroll tags on mobile */}
                {!isMessagesReadOnly && (
                    <div className="flex sm:hidden overflow-x-auto flex-nowrap gap-2 pb-2.5 mb-2.5 no-scrollbar">
                        {chatTemplates.length > 0 ? (
                            <>
                                {chatTemplates.map((tpl) => (
                                    <button
                                        key={tpl.id}
                                        type="button"
                                        onClick={() => injectTemplate(tpl.content)}
                                        className="px-4 py-2 bg-clay-50 border border-clay-100 hover:bg-clay-100 text-clay-700 text-xs font-bold rounded-full whitespace-nowrap min-h-[38px] flex items-center justify-center active:scale-95 transition-all"
                                    >
                                        {tpl.title}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setShowTemplateManager(true)}
                                    className="px-4 py-2 bg-stone-100 border border-stone-200 hover:bg-stone-200 text-stone-600 text-xs font-bold rounded-full whitespace-nowrap min-h-[38px] flex items-center justify-center active:scale-95 transition-all"
                                >
                                    Manage
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowTemplateManager(true)}
                                className="px-4 py-2 bg-clay-50 border border-clay-100 hover:bg-clay-100 text-clay-700 text-xs font-bold rounded-full whitespace-nowrap min-h-[38px] flex items-center justify-center active:scale-95 transition-all"
                            >
                                + Add Message Template
                            </button>
                        )}
                    </div>
                )}

                {/* Emoji Picker Popover */}
                {showEmojiPicker && !isMessagesReadOnly && (
                    <div ref={emojiPickerRef} className="absolute bottom-full right-3 sm:right-4 mb-2 z-50 animate-in slide-in-from-bottom-2 duration-200 shadow-2xl rounded-2xl overflow-hidden border border-gray-100">
                        <EmojiPicker 
                            onEmojiClick={onEmojiClick}
                            autoFocusSearch={false}
                            theme="light"
                            lazyLoadEmojis={true}
                        />
                    </div>
                )}

                {/* Attachment Preview bar */}
                {attachmentPreview && (
                    <div className="mb-3 mt-1 p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-start justify-between group animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-3 overflow-hidden">
                            {attachmentPreview.type === 'image' ? (
                                <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-gray-200 shadow-sm bg-white">
                                    <img src={attachmentPreview.url} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0 shadow-sm text-clay-500">
                                    <FileIcon size={24} />
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-800 truncate mb-0.5">{attachmentPreview.name}</p>
                                <p className="text-xs text-gray-500">
                                    {attachmentPreview.type === 'image' ? 'Image File' : 'Document File'}
                                </p>
                            </div>
                        </div>
                        <button 
                            type="button" 
                            onClick={removeAttachment}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}

                <form onSubmit={handleSendMessage} className="flex w-full flex-col gap-3">
                    {isMessagesReadOnly && (
                        <div className="w-full">
                            <ReadOnlyCapabilityNotice label="Messages is read only for your account." />
                        </div>
                    )}
                    <div className="flex items-end gap-2 sm:gap-3 w-full">
                        <div className="flex-1 relative bg-gray-50 border border-gray-200 focus-within:border-clay-400 focus-within:ring-4 focus-within:ring-clay-50 rounded-2xl flex items-center p-1 transition-all overflow-hidden shadow-sm">
                            {/* Template Selector Dropdown (Desktop Only) */}
                            {showTemplateSelector && !isMessagesReadOnly && (
                                <div ref={templateSelectorRef} className="absolute bottom-full left-0 mb-2 z-50 w-72 max-h-80 overflow-y-auto bg-white rounded-2xl shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-2 duration-200">
                                    <div className="p-3 border-b border-gray-50 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Message Templates</span>
                                        <button 
                                            onClick={() => { setShowTemplateSelector(false); setShowTemplateManager(true); }}
                                            className="text-[10px] font-bold text-clay-600 hover:text-clay-700 underline min-h-[32px] px-2 flex items-center"
                                            type="button"
                                        >
                                            Manage
                                        </button>
                                    </div>
                                    <div className="p-1">
                                        {chatTemplates.length > 0 ? (
                                            chatTemplates.map((tpl) => (
                                                <button
                                                    key={tpl.id}
                                                    onClick={() => injectTemplate(tpl.content)}
                                                    className="w-full text-left p-3 hover:bg-clay-50 rounded-xl transition-all group min-h-[44px]"
                                                    type="button"
                                                >
                                                    <p className="text-xs font-bold text-gray-900 mb-0.5 group-hover:text-clay-700 transition-colors">{tpl.title}</p>
                                                    <p className="text-[10px] text-gray-500 line-clamp-2">{tpl.content}</p>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="p-6 text-center">
                                                <p className="text-[11px] text-gray-400 font-medium">No templates found.</p>
                                                <button 
                                                    onClick={() => { setShowTemplateSelector(false); setShowTemplateManager(true); }}
                                                    className="mt-2 text-[11px] font-bold text-clay-600 hover:text-clay-700"
                                                    type="button"
                                                >
                                                    Create your first template
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-0.5 px-1">
                                <button 
                                    type="button"
                                    onClick={() => !isMessagesReadOnly && setShowTemplateSelector(!showTemplateSelector)}
                                    disabled={isMessagesReadOnly}
                                    className={`hidden sm:flex p-2 rounded-xl transition-all duration-200 min-h-[44px] min-w-[44px] items-center justify-center ${
                                        isMessagesReadOnly
                                            ? 'cursor-not-allowed text-gray-300'
                                            : showTemplateSelector 
                                                ? 'bg-white text-clay-600 shadow-sm'
                                                : 'text-gray-400 hover:bg-white hover:text-clay-600'
                                    }`}
                                    title="Quick Templates"
                                >
                                    <MessageCircle size={20} />
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => imageInputRef.current?.click()}
                                    disabled={isMessagesReadOnly}
                                    className={`p-2 rounded-xl transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center ${
                                        isMessagesReadOnly
                                            ? 'cursor-not-allowed text-gray-300'
                                            : 'text-gray-400 hover:bg-white hover:text-clay-600'
                                    }`}
                                    title="Attach Image"
                                >
                                    <ImageIcon size={20} />
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isMessagesReadOnly}
                                    className={`p-2 rounded-xl transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center ${
                                        isMessagesReadOnly
                                            ? 'cursor-not-allowed text-gray-300'
                                            : 'text-gray-400 hover:bg-white hover:text-clay-600'
                                    }`}
                                    title="Attach Document"
                                >
                                    <Paperclip size={20} />
                                </button>
                            </div>

                            <textarea 
                                ref={inputRef}
                                rows={1}
                                value={data.message}
                                onChange={(e) => {
                                    setData('message', e.target.value);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage(e);
                                    } else {
                                        signalTyping();
                                    }
                                }}
                                disabled={isMessagesReadOnly}
                                placeholder={isMessagesReadOnly ? "Chat is read-only..." : "Type a message..."}
                                className="flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none resize-none py-3 px-3 text-sm text-gray-800 placeholder-gray-400 font-medium max-h-32 min-h-[44px]"
                            />

                            <div className="flex items-center px-1">
                                <button 
                                    type="button" 
                                    onClick={() => !isMessagesReadOnly && setShowEmojiPicker(!showEmojiPicker)}
                                    disabled={isMessagesReadOnly}
                                    className={`p-2 rounded-xl transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center ${
                                        isMessagesReadOnly
                                            ? 'cursor-not-allowed text-gray-300'
                                            : showEmojiPicker 
                                                ? 'bg-white text-clay-600 shadow-sm'
                                                : 'text-gray-400 hover:bg-white hover:text-clay-600'
                                    }`}
                                    title="Emoji Picker"
                                >
                                    <Smile size={20} />
                                </button>
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={processing || isMessagesReadOnly || (!data.message.trim() && !attachmentPreview)}
                            className="p-3 bg-clay-600 text-white rounded-2xl hover:bg-clay-700 active:scale-95 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none"
                        >
                            {processing ? (
                                <LoaderCircle size={18} className="animate-spin" />
                            ) : (
                                <Send size={18} />
                            )}
                        </button>
                    </div>
                </form>

                {/* Hidden File Upload Inputs */}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange}
                    className="hidden" 
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" 
                />
                <input 
                    type="file" 
                    ref={imageInputRef} 
                    onChange={handleFileChange}
                    className="hidden" 
                    accept="image/*" 
                />
            </div>
        </div>
    );
}
