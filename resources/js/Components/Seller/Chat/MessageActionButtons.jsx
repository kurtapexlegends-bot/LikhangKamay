import React from 'react';
import {
    Image as ImageIcon,
    Paperclip,
    MessageCircle,
    Package,
} from 'lucide-react';

export default function MessageActionButtons({
    isTeamChat = false,
    isMessagesReadOnly = false,
    showTemplateSelector = false,
    setShowTemplateSelector,
    imageInputRef,
    fileInputRef,
    userOrders = [],
    toggleManualPicker,
}) {
    return (
        <div className="flex items-center gap-0.5 px-1">
            {/* Templates Button (Seller-Buyer Chat Only) */}
            {!isTeamChat && setShowTemplateSelector && (
                <button 
                    type="button"
                    onClick={() => !isMessagesReadOnly && setShowTemplateSelector(!showTemplateSelector)}
                    disabled={isMessagesReadOnly}
                    className={`hidden sm:flex p-2 rounded-xl transition-all duration-200 min-h-[40px] min-w-[40px] items-center justify-center ${
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
            )}

            <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={isMessagesReadOnly}
                className="rounded-xl p-2 text-gray-400 transition-all duration-200 hover:bg-white hover:text-clay-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Attach image"
            >
                <ImageIcon size={20} />
            </button>
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isMessagesReadOnly}
                className="rounded-xl p-2 text-gray-400 transition-all duration-200 hover:bg-white hover:text-clay-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Attach file"
            >
                <Paperclip size={20} />
            </button>
            {userOrders && userOrders.length > 0 && (
                <button
                    type="button"
                    onClick={toggleManualPicker}
                    disabled={isMessagesReadOnly}
                    className="rounded-xl p-2 text-gray-400 transition-all duration-200 hover:bg-white hover:text-clay-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Tag Specific Order (@)"
                >
                    <Package size={20} />
                </button>
            )}
        </div>
    );
}
