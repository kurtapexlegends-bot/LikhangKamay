import React, { Suspense, lazy } from 'react';

const EmojiPicker = lazy(() => import('emoji-picker-react'));

export default function EmojiPickerPopover({
    showEmojiPicker,
    emojiPickerRef,
    onEmojiClick,
}) {
    if (!showEmojiPicker) return null;

    return (
        <div ref={emojiPickerRef} className="absolute bottom-full right-3 z-50 mb-2 overflow-hidden rounded-2xl border border-gray-100 shadow-2xl sm:right-4">
            <Suspense fallback={<div className="h-[350px] w-[300px] flex items-center justify-center bg-white text-xs text-stone-400">Loading emojis...</div>}>
                <EmojiPicker
                    onEmojiClick={onEmojiClick}
                    autoFocusSearch={false}
                    theme="light"
                    lazyLoadEmojis
                />
            </Suspense>
        </div>
    );
}
