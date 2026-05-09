import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LayoutGrid, ChevronRight, ChevronLeft } from 'lucide-react';

/**
 * FloatingModuleActions
 * 
 * A component that renders module-specific actions in a premium, banner-like 
 * floating container at the bottom right. Uses React Portal to ensure it 
 * stays fixed to the viewport regardless of parent transform contexts.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.actions - The actions to render.
 */
export default function FloatingModuleActions({ actions }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!actions || !mounted) return null;

    const content = (
        <div className="fixed bottom-6 right-6 z-[250] flex items-end justify-end group pointer-events-none">
            <div 
                className={`
                    flex items-center gap-2.5 px-1 py-1 rounded-2xl shadow-xl transition-all duration-500 ease-out pointer-events-auto
                    ${isCollapsed ? 'bg-white/90 w-9 overflow-hidden' : 'bg-white/80 w-auto px-3 py-2'}
                    backdrop-blur-xl border border-gray-200 ring-1 ring-black/5 shadow-clay-900/10 text-gray-800
                `}
            >
                {/* Brand/Icon Section */}
                <div 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`
                        flex-shrink-0 cursor-pointer flex items-center justify-center transition-all duration-300
                        ${isCollapsed ? 'w-7 h-7 bg-clay-100 rounded-full' : 'bg-gray-100/80 p-1.5 rounded-xl'}
                    `}
                >
                    <LayoutGrid size={isCollapsed ? 16 : 18} className="text-gray-700" />
                </div>
                
                {!isCollapsed && (
                    <>
                        <div className="flex flex-col min-w-[70px] animate-in fade-in slide-in-from-left-2 duration-300">
                            <span className="text-[9px] font-black uppercase tracking-widest leading-none text-gray-400">Module</span>
                            <span className="text-[11px] font-bold uppercase tracking-tight text-gray-800 mt-0.5">Actions</span>
                        </div>

                        <div className="h-6 w-px bg-gray-200 mx-0.5 animate-in zoom-in duration-500"></div>

                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-500">
                            {actions}
                        </div>

                        <button 
                            onClick={() => setIsCollapsed(true)}
                            className="ml-2 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-all"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </>
                )}

                {isCollapsed && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <button 
                            onClick={() => setIsCollapsed(false)}
                            className="w-full h-full"
                            title="Expand Actions"
                        />
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(content, document.body);
}
