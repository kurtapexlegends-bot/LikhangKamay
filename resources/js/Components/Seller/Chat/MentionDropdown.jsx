import React from 'react';
import UserAvatar from '@/Components/UserAvatar';

export default function MentionDropdown({
    isVisible,
    filteredMentions = [],
    mentionIndex = 0,
    onSelect,
}) {
    if (!isVisible || filteredMentions.length === 0) return null;

    return (
        <div className="absolute bottom-full left-3 right-3 mb-2 z-50 bg-white border border-stone-200 shadow-xl rounded-xl overflow-hidden font-sans text-xs">
            <div className="px-3 py-2 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between text-stone-400 font-bold uppercase tracking-wider text-[9px]">
                <span>Mention Teammate</span>
                <span>{filteredMentions.length} matches</span>
            </div>
            <div className="max-h-36 overflow-y-auto p-1 divide-y divide-stone-50 custom-scrollbar">
                {filteredMentions.map((contact, idx) => (
                    <button
                        key={contact.id}
                        type="button"
                        onClick={() => onSelect(contact)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${
                            idx === mentionIndex 
                                ? 'bg-clay-50 text-clay-800 font-bold' 
                                : 'hover:bg-stone-50 text-stone-700'
                        }`}
                    >
                        <UserAvatar user={contact} className="w-4 h-4 text-[7px] shrink-0" />
                        <div className="min-w-0 flex-1">
                            <p className="truncate leading-none text-[11px] text-stone-900">{contact.name}</p>
                            <span className="text-[8px] text-stone-400 font-bold uppercase tracking-wider">
                                {contact.roleLabel}
                            </span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
