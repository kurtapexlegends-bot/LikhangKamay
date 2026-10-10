import React from 'react';
import { MoveHorizontal, RotateCcw } from 'lucide-react';

/**
 * Interactive desktop resize handle placed along the right edge of a sidebar.
 * Features:
 * - 12px grab hit area centered on border with cursor col-resize
 * - Subtle 2px accent indicator that illuminates on hover and active dragging
 * - Floating hover badge informing user of drag and double-click to reset (220px)
 * - Double-click to reset width to default
 * - Screen-reader / accessibility role
 */
export default function SidebarResizeHandle({
    onMouseDown,
    onDoubleClick,
    isDragging = false,
    isCollapsed = false,
    className = ''
}) {
    return (
        <div
            role="separator"
            aria-orientation="vertical"
            tabIndex={0}
            title="Drag to resize • Double-click to reset"
            onMouseDown={onMouseDown}
            onDoubleClick={onDoubleClick}
            className={`hidden lg:block absolute top-0 bottom-0 -right-1.5 w-3 z-[105] cursor-col-resize group touch-none select-none ${className}`}
        >
            {/* Visual indicator bar that illuminates on hover or active dragging */}
            <div
                className={`w-0.5 h-full mx-auto transition-colors duration-150 ${
                    isDragging
                        ? 'bg-clay-600 shadow-[0_0_8px_rgba(182,107,76,0.5)]'
                        : 'bg-transparent group-hover:bg-clay-400/80 group-active:bg-clay-600'
                }`}
            />

            {/* Ultra-compact Hover Micro-Pill */}
            {!isDragging && (
                <div className="absolute top-1/2 -translate-y-1/2 left-2.5 pointer-events-none opacity-0 scale-95 -translate-x-1 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 transition-all duration-150 ease-out z-[120]">
                    <div className="bg-stone-900/95 text-stone-200 text-[10px] font-medium px-2 py-0.5 rounded-md shadow-lg border border-stone-700/70 backdrop-blur-md whitespace-nowrap flex items-center gap-1.5 leading-none">
                        <span className="flex items-center gap-1 text-stone-300">
                            <MoveHorizontal size={10} className="text-stone-400" />
                            {isCollapsed ? 'Expand' : 'Drag'}
                        </span>
                        <span className="text-stone-600 text-[9px]">•</span>
                        <span className="flex items-center gap-1 text-clay-300 font-medium">
                            <RotateCcw size={9} className="text-clay-400" />
                            Reset
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
