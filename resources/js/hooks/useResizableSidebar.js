import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for resizable desktop sidebar.
 * Supports continuous 1:1 mouse drag tracking without jumps,
 * smooth threshold snapping, double-click reset, and localStorage persistence.
 *
 * @param {Object} options
 * @param {string} options.storageKey - Key used for localStorage width persistence
 * @param {string} options.collapseStorageKey - Key used for localStorage collapse persistence
 * @param {number} options.defaultWidth - Default width in pixels (default: 220)
 * @param {number} options.minExpandedWidth - Minimum width when expanded (default: 180)
 * @param {number} options.maxWidth - Maximum allowable width in pixels (default: 360)
 * @param {number} options.collapsedWidth - Width when collapsed (default: 64)
 * @param {number} options.snapThreshold - Threshold below which release snaps to collapsed (default: 130)
 * @param {boolean} options.isCollapsed - Current collapsed state
 * @param {Function} options.onToggleCollapse - Callback to toggle collapsed state
 */
export function useResizableSidebar({
    storageKey = 'sidebar_width_v1',
    collapseStorageKey = 'sidebar_collapsed_v1',
    defaultWidth = 220,
    minExpandedWidth = 180,
    maxWidth = 360,
    collapsedWidth = 64,
    snapThreshold = 130,
    isCollapsed = false,
    onToggleCollapse = () => {},
} = {}) {
    // Saved expanded width (auto-sanitizes legacy/sub-minimum widths)
    const [savedWidth, setSavedWidth] = useState(() => {
        if (typeof window === 'undefined') return defaultWidth;
        try {
            const saved = window.localStorage.getItem(storageKey);
            if (saved) {
                const parsed = parseInt(saved, 10);
                if (!isNaN(parsed) && parsed >= minExpandedWidth && parsed <= maxWidth) {
                    return parsed;
                }
                // Normalize legacy sub-minimum widths (e.g. 140) to defaultWidth
                window.localStorage.setItem(storageKey, String(defaultWidth));
            }
        } catch {
            // Ignore localStorage parse errors in private browsing/sandboxes
        }
        return defaultWidth;
    });

    const [isDragging, setIsDragging] = useState(false);
    const [dragWidth, setDragWidth] = useState(null);

    // Track desktop viewport (>= 1024px) for layout styling
    const [isDesktop, setIsDesktop] = useState(() => {
        if (typeof window === 'undefined') return true;
        return window.innerWidth >= 1024;
    });

    useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth >= 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isCollapsedRef = useRef(isCollapsed);
    const savedWidthRef = useRef(savedWidth);
    const onToggleCollapseRef = useRef(onToggleCollapse);
    const dragWidthRef = useRef(dragWidth);

    useEffect(() => {
        isCollapsedRef.current = isCollapsed;
    }, [isCollapsed]);

    useEffect(() => {
        savedWidthRef.current = savedWidth;
    }, [savedWidth]);

    useEffect(() => {
        onToggleCollapseRef.current = onToggleCollapse;
    }, [onToggleCollapse]);

    useEffect(() => {
        dragWidthRef.current = dragWidth;
    }, [dragWidth]);

    const moveListenerRef = useRef(null);
    const upListenerRef = useRef(null);

    const startResizing = useCallback((e) => {
        // Only trigger on primary mouse button (left click)
        if (e.button !== 0) return;

        e.preventDefault();
        e.stopPropagation();

        setIsDragging(true);

        const handleMouseMove = (moveEvent) => {
            const clientX = moveEvent.clientX;

            // Clamped continuous width tracking directly under the cursor
            const currentWidth = Math.min(maxWidth, Math.max(collapsedWidth, clientX));
            setDragWidth(currentWidth);

            // Dynamically sync collapsed visual state without abrupt jumps
            const shouldCollapse = currentWidth < snapThreshold;
            if (shouldCollapse !== isCollapsedRef.current) {
                onToggleCollapseRef.current(shouldCollapse);
            }
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            moveListenerRef.current = null;
            upListenerRef.current = null;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            const finalRecordedWidth = dragWidthRef.current;
            setIsDragging(false);
            setDragWidth(null);

            // Smoothly commit final resting state
            if (finalRecordedWidth !== null) {
                if (finalRecordedWidth < snapThreshold) {
                    // Released in collapse zone: snap cleanly into 64px
                    onToggleCollapseRef.current(true);
                    try {
                        window.localStorage.setItem(collapseStorageKey, 'true');
                    } catch {
                        // Ignore localStorage errors
                    }
                } else {
                    // Released in expanded zone: ensure at least minExpandedWidth
                    const cleanWidth = Math.min(maxWidth, Math.max(minExpandedWidth, finalRecordedWidth));
                    setSavedWidth(cleanWidth);
                    onToggleCollapseRef.current(false);
                    try {
                        window.localStorage.setItem(collapseStorageKey, 'false');
                        window.localStorage.setItem(storageKey, String(cleanWidth));
                    } catch {
                        // Ignore localStorage errors
                    }
                }
            }
        };

        moveListenerRef.current = handleMouseMove;
        upListenerRef.current = handleMouseUp;

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [
        collapsedWidth,
        snapThreshold,
        minExpandedWidth,
        maxWidth,
        storageKey,
        collapseStorageKey,
    ]);

    const resetWidth = useCallback(() => {
        if (isCollapsed) {
            onToggleCollapse(false);
            try {
                window.localStorage.setItem(collapseStorageKey, 'false');
            } catch {
                // Ignore localStorage errors
            }
        }
        setSavedWidth(defaultWidth);
        try {
            window.localStorage.setItem(storageKey, String(defaultWidth));
        } catch {
            // Ignore localStorage save errors
        }
    }, [isCollapsed, onToggleCollapse, defaultWidth, storageKey, collapseStorageKey]);

    // Safety cleanup on unmount if component unmounts mid-drag
    useEffect(() => {
        return () => {
            if (moveListenerRef.current) {
                window.removeEventListener('mousemove', moveListenerRef.current);
            }
            if (upListenerRef.current) {
                window.removeEventListener('mouseup', upListenerRef.current);
            }
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, []);

    const activeWidth = isDragging && dragWidth !== null
        ? dragWidth
        : (isCollapsed ? collapsedWidth : savedWidth);

    return {
        width: activeWidth,
        savedWidth,
        isDragging,
        isDesktop,
        startResizing,
        resetWidth,
    };
}
