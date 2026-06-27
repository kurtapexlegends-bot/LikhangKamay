import React from 'react';

export default function TemplateDropdown({
    isVisible,
    dropdownRef,
    chatTemplates = [],
    onSelect,
    onManage,
    onCreateFirst,
}) {
    if (!isVisible) return null;

    return (
        <div ref={dropdownRef} className="absolute bottom-full left-3 sm:left-4 mb-2 z-50 animate-in slide-in-from-bottom-2 duration-200 bg-white border border-gray-100 shadow-2xl rounded-2xl w-72 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Quick Templates</span>
                <button 
                    onClick={onManage}
                    className="text-[10px] font-bold text-clay-600 hover:text-clay-700 uppercase tracking-wider"
                    type="button"
                >
                    Manage
                </button>
            </div>
            <div className="max-h-60 overflow-y-auto p-1 divide-y divide-gray-50 custom-scrollbar">
                {chatTemplates.length > 0 ? (
                    chatTemplates.map((tpl) => (
                        <button
                            key={tpl.id}
                            onClick={() => onSelect(tpl.content)}
                            className="w-full text-left px-3 py-2.5 hover:bg-stone-50 transition rounded-lg text-xs font-semibold text-gray-700 flex flex-col gap-0.5"
                            type="button"
                        >
                            <span className="font-bold text-gray-900 truncate block w-full">{tpl.title}</span>
                            <span className="text-gray-500 line-clamp-2 leading-relaxed">{tpl.content}</span>
                        </button>
                    ))
                ) : (
                    <div className="p-6 text-center">
                        <p className="text-[11px] text-gray-400 font-medium">No templates found.</p>
                        <button 
                            onClick={onCreateFirst}
                            className="mt-2 text-[11px] font-bold text-clay-600 hover:text-clay-700"
                            type="button"
                        >
                            Create your first template
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
