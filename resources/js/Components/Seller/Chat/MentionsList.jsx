import React, { useState, useEffect, useMemo, forwardRef } from 'react';
import UserAvatar from '@/Components/UserAvatar';

export const MentionsList = forwardRef(({
    isVisible,
    filteredMentions = [],
    mentionIndex = 0,
    onSelect,
}, ref) => {
    if (!isVisible || filteredMentions.length === 0) return null;

    return (
        <div ref={ref} className="absolute bottom-full left-3 sm:left-4 mb-2 z-50 bg-white border border-stone-200 shadow-xl rounded-xl w-60 overflow-hidden font-sans text-xs">
            <div className="px-3 py-2 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between text-stone-400 font-bold uppercase tracking-wider text-[9px]">
                <span>Mention Teammate</span>
                <span>{filteredMentions.length} matches</span>
            </div>
            <div className="max-h-48 overflow-y-auto p-1 divide-y divide-stone-50 custom-scrollbar">
                {filteredMentions.map((contact, idx) => (
                    <button
                        key={contact.id}
                        type="button"
                        onClick={() => onSelect(contact)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2.5 ${
                            idx === mentionIndex 
                                ? 'bg-clay-50 text-clay-800 font-bold' 
                                : 'hover:bg-stone-50 text-stone-700'
                        }`}
                    >
                        <UserAvatar user={contact} className="w-5 h-5 text-[8px] shrink-0" />
                        <div className="min-w-0 flex-1">
                            <p className="truncate leading-none text-xs text-stone-900">{contact.name}</p>
                            <span className="text-[8px] text-stone-400 font-bold uppercase tracking-wider">
                                {contact.roleLabel}
                            </span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
});

MentionsList.displayName = 'MentionsList';

export function useMentions({ message, setMessage, inputRef, eligibleContacts, currentChannel }) {
    const [mentionSearch, setMentionSearch] = useState('');
    const [mentionIndex, setMentionIndex] = useState(0);
    const [showMentions, setShowMentions] = useState(false);
    const [mentionStart, setMentionStart] = useState(-1);

    const checkMentions = (text, cursorPosition) => {
        if (!currentChannel) {
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
        
        const beforeAt = message.slice(0, mentionStart);
        const cursorPosition = inputRef.current ? inputRef.current.selectionStart : message.length;
        const afterMention = message.slice(cursorPosition);
        
        const replacement = `@[${contact.name}] `;
        const newText = beforeAt + replacement + afterMention;
        
        setMessage(newText);
        setShowMentions(false);
        
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
                const newCursorPos = beforeAt.length + replacement.length;
                inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 10);
    };

    const handleKeyDown = (event) => {
        if (!isDropdownVisible) return false;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setMentionIndex((prev) => (prev + 1) % filteredMentions.length);
            return true;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setMentionIndex((prev) => (prev - 1 + filteredMentions.length) % filteredMentions.length);
            return true;
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            selectMention(filteredMentions[mentionIndex]);
            return true;
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            setShowMentions(false);
            return true;
        }
        return false;
    };

    // When channel changes, reset mentions
    useEffect(() => {
        setShowMentions(false);
        setMentionSearch('');
        setMentionIndex(0);
        setMentionStart(-1);
    }, [currentChannel?.id]);

    return {
        isDropdownVisible,
        filteredMentions,
        mentionIndex,
        selectMention,
        checkMentions,
        handleKeyDown,
        setShowMentions,
    };
}

export default MentionsList;
