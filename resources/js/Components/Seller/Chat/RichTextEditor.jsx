import React, { useRef, useEffect } from 'react';
import { Bold, Italic } from 'lucide-react';

export default function RichTextEditor({ value, onChange, placeholder }) {
    const editorRef = useRef(null);

    useEffect(() => {
        if (editorRef.current && value !== editorRef.current.innerHTML) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    const exec = (cmd, val = null) => {
        document.execCommand(cmd, false, val);
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    return (
        <div className="border border-stone-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-clay-200 focus-within:border-clay-400 transition-all">
            <div className="flex items-center gap-1 px-3 py-2 bg-stone-50 border-b border-stone-200">
                <button 
                    type="button" 
                    onClick={() => exec('bold')} 
                    className="p-2 rounded-lg hover:bg-stone-200 text-stone-600 transition flex items-center justify-center min-h-[36px] min-w-[36px]" 
                    title="Bold"
                >
                    <Bold size={14} />
                </button>
                <button 
                    type="button" 
                    onClick={() => exec('italic')} 
                    className="p-2 rounded-lg hover:bg-stone-200 text-stone-600 transition flex items-center justify-center min-h-[36px] min-w-[36px]" 
                    title="Italic"
                >
                    <Italic size={14} />
                </button>
            </div>
            <div
                ref={editorRef}
                contentEditable
                className="min-h-[80px] max-h-[200px] overflow-y-auto p-3 text-sm text-stone-700 focus:outline-none"
                onInput={() => onChange(editorRef.current?.innerHTML || '')}
                data-placeholder={placeholder}
                suppressContentEditableWarning
            />
        </div>
    );
}
