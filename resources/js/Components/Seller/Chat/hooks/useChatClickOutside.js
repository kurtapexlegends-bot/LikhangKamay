import { useEffect } from 'react';

export default function useChatClickOutside({
    showEmojiPicker,
    setShowEmojiPicker,
    emojiPickerRef,
    showTemplateSelector,
    setShowTemplateSelector,
    templateSelectorRef,
    isDropdownVisible,
    setShowMentions,
    mentionsDropdownRef,
    isSlashDropdownVisible,
    setShowSlashMenu,
    slashCommandsDropdownRef,
}) {
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Click outside emoji picker
            if (showEmojiPicker && emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                const toggleBtn = event.target.closest('[title="Add emoji"]');
                if (!toggleBtn) {
                    setShowEmojiPicker(false);
                }
            }

            // Click outside templates dropdown
            if (showTemplateSelector && templateSelectorRef.current && !templateSelectorRef.current.contains(event.target)) {
                const toggleBtn = event.target.closest('[title="Quick Templates"]');
                if (!toggleBtn) {
                    setShowTemplateSelector(false);
                }
            }

            // Click outside mentions dropdown
            if (isDropdownVisible && mentionsDropdownRef.current && !mentionsDropdownRef.current.contains(event.target)) {
                setShowMentions(false);
            }

            // Click outside slash commands dropdown
            if (isSlashDropdownVisible && slashCommandsDropdownRef.current && !slashCommandsDropdownRef.current.contains(event.target)) {
                setShowSlashMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [
        showEmojiPicker,
        showTemplateSelector,
        isDropdownVisible,
        isSlashDropdownVisible,
        setShowMentions,
        setShowSlashMenu,
        emojiPickerRef,
        templateSelectorRef,
        mentionsDropdownRef,
        slashCommandsDropdownRef,
        setShowEmojiPicker,
        setShowTemplateSelector,
    ]);
}
