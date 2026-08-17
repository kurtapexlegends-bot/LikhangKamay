import React, { useState, useMemo, forwardRef } from 'react';
import { Sparkles, MessageSquare } from 'lucide-react';

export const SlashCommandsList = forwardRef(({
    isVisible,
    filteredTemplates = [],
    selectedIndex = 0,
    onSelect,
}, ref) => {
    if (!isVisible || filteredTemplates.length === 0) return null;

    return (
        <div 
            ref={ref} 
            className="absolute bottom-full left-3 sm:left-4 mb-2 z-50 bg-white border border-stone-200 shadow-2xl rounded-2xl w-80 max-w-[calc(100vw-2rem)] overflow-hidden font-sans text-xs animate-in slide-in-from-bottom-2 duration-150"
        >
            <div className="px-3.5 py-2 border-b border-stone-100 bg-stone-50/80 flex items-center justify-between text-stone-400 font-bold uppercase tracking-wider text-[9px]">
                <div className="flex items-center gap-1.5 text-clay-700">
                    <Sparkles size={12} className="text-clay-600" />
                    <span>Quick Templates</span>
                </div>
                <span>{filteredTemplates.length} match{filteredTemplates.length === 1 ? '' : 'es'}</span>
            </div>
            <div className="max-h-52 overflow-y-auto p-1 divide-y divide-stone-50 custom-scrollbar">
                {filteredTemplates.map((tpl, idx) => (
                    <button
                        key={tpl.id}
                        type="button"
                        onClick={() => onSelect(tpl)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors flex flex-col gap-1 ${
                            idx === selectedIndex 
                                ? 'bg-clay-50 text-clay-900 font-bold' 
                                : 'hover:bg-stone-50 text-stone-700'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-stone-900 truncate text-xs">{tpl.title}</span>
                            {tpl.shortcut && (
                                <span className="rounded bg-clay-100 border border-clay-200 px-1.5 py-0.5 text-[10px] font-mono font-bold text-clay-700 shrink-0">
                                    {tpl.shortcut}
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed font-normal">
                            {tpl.content}
                        </p>
                    </button>
                ))}
            </div>
            <div className="px-3 py-1.5 bg-stone-50 border-t border-stone-100 text-[10px] text-stone-400 flex items-center justify-between">
                <span>Use <kbd className="px-1 py-0.5 bg-white border border-stone-200 rounded font-mono text-[9px]">↑</kbd> <kbd className="px-1 py-0.5 bg-white border border-stone-200 rounded font-mono text-[9px]">↓</kbd> to navigate</span>
                <span><kbd className="px-1 py-0.5 bg-white border border-stone-200 rounded font-mono text-[9px]">Enter</kbd> to insert</span>
            </div>
        </div>
    );
});

SlashCommandsList.displayName = 'SlashCommandsList';

export function useSlashCommands({ message, setMessage, inputRef, chatTemplates = [] }) {
    const [slashSearch, setSlashSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [showSlashMenu, setShowSlashMenu] = useState(false);
    const [slashStart, setSlashStart] = useState(-1);

    const checkSlashCommands = (text, cursorPosition) => {
        if (!chatTemplates || chatTemplates.length === 0) {
            setShowSlashMenu(false);
            return;
        }

        const textBeforeCursor = text.slice(0, cursorPosition);
        const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
        
        if (lastSlashIndex !== -1) {
            const charBeforeSlash = textBeforeCursor[lastSlashIndex - 1];
            const isValidTrigger = lastSlashIndex === 0 || /\s/.test(charBeforeSlash);
            
            if (isValidTrigger) {
                const query = textBeforeCursor.slice(lastSlashIndex + 1);
                // Allow queries up to 30 characters without line breaks or spaces
                if (!query.includes('\n') && !query.includes(' ') && query.length < 30) {
                    setSlashStart(lastSlashIndex);
                    setSlashSearch(query);
                    setShowSlashMenu(true);
                    setSelectedIndex(0);
                    return;
                }
            }
        }
        setShowSlashMenu(false);
    };

    const filteredTemplates = useMemo(() => {
        if (!showSlashMenu || !chatTemplates || chatTemplates.length === 0) return [];
        const search = slashSearch.toLowerCase();
        
        if (!search) {
            return chatTemplates;
        }

        return chatTemplates.filter(tpl => {
            const shortcutMatch = tpl.shortcut && tpl.shortcut.toLowerCase().replace(/^\//, '').includes(search);
            const titleMatch = tpl.title && tpl.title.toLowerCase().includes(search);
            const contentMatch = tpl.content && tpl.content.toLowerCase().includes(search);
            return shortcutMatch || titleMatch || contentMatch;
        });
    }, [chatTemplates, showSlashMenu, slashSearch]);

    const isDropdownVisible = showSlashMenu && filteredTemplates.length > 0;

    const selectTemplate = (template) => {
        if (slashStart === -1) return;
        
        const beforeSlash = message.slice(0, slashStart);
        const cursorPosition = inputRef.current ? inputRef.current.selectionStart : message.length;
        const afterSlash = message.slice(cursorPosition);
        
        const replacement = template.content;
        const newText = beforeSlash + replacement + (afterSlash.startsWith(' ') || afterSlash === '' ? '' : ' ') + afterSlash;
        
        setMessage(newText);
        setShowSlashMenu(false);
        
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.style.height = 'auto';
                inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
                inputRef.current.focus();
                const newCursorPos = beforeSlash.length + replacement.length;
                inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 10);
    };

    const handleKeyDown = (event) => {
        if (!isDropdownVisible) return false;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % filteredTemplates.length);
            return true;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + filteredTemplates.length) % filteredTemplates.length);
            return true;
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
            if (filteredTemplates[selectedIndex]) {
                selectTemplate(filteredTemplates[selectedIndex]);
                return true;
            }
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            setShowSlashMenu(false);
            return true;
        }

        return false;
    };

    return {
        isDropdownVisible,
        filteredTemplates,
        selectedIndex,
        selectTemplate,
        checkSlashCommands,
        handleKeyDown,
        setShowSlashMenu,
    };
}
