import { useRef, useCallback, useEffect } from 'react';

export default function useDragAutoScroll({
    isDraggingAny,
    contentWrapperRef,
    modalBodyRef,
    driverListRef,
    onDragEndCleanup,
}) {
    const autoScrollRafRef = useRef(null);
    const scrollTargetRef = useRef(null);

    const stopAutoScroll = useCallback(() => {
        if (autoScrollRafRef.current) {
            window.cancelAnimationFrame(autoScrollRafRef.current);
            autoScrollRafRef.current = null;
        }
        scrollTargetRef.current = null;
    }, []);

    const startAutoScroll = useCallback((element, speed) => {
        if (!element) return;
        scrollTargetRef.current = { element, speed };
        if (!autoScrollRafRef.current) {
            const step = () => {
                if (scrollTargetRef.current && scrollTargetRef.current.element) {
                    const { element: el, speed: sp } = scrollTargetRef.current;
                    if (sp < 0 && el.scrollTop <= 0) {
                        autoScrollRafRef.current = null;
                        return;
                    }
                    if (sp > 0 && Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight) {
                        autoScrollRafRef.current = null;
                        return;
                    }
                    el.scrollTop += sp;
                    autoScrollRafRef.current = window.requestAnimationFrame(step);
                } else {
                    autoScrollRafRef.current = null;
                }
            };
            autoScrollRafRef.current = window.requestAnimationFrame(step);
        }
    }, []);

    useEffect(() => {
        if (!isDraggingAny) {
            stopAutoScroll();
            return;
        }

        const handleGlobalDragOver = (e) => {
            const clientY = e.clientY;
            const clientX = e.clientX;

            const modalContainer = contentWrapperRef.current?.closest('.overflow-y-auto') || modalBodyRef.current;

            const checkAndScroll = (container, threshold = 65, maxSpeed = 16) => {
                if (!container) return false;
                const rect = container.getBoundingClientRect();
                if (clientX < rect.left - 40 || clientX > rect.right + 40) return false;

                if (clientY <= rect.top + threshold && clientY >= rect.top - 80) {
                    if (container.scrollTop > 0) {
                        const dist = rect.top + threshold - clientY;
                        const intensity = Math.min(1.5, Math.max(0.2, dist / threshold));
                        startAutoScroll(container, -Math.round(intensity * maxSpeed));
                        return true;
                    }
                }
                if (clientY >= rect.bottom - threshold && clientY <= rect.bottom + 80) {
                    if (Math.ceil(container.scrollTop + container.clientHeight) < container.scrollHeight) {
                        const dist = clientY - (rect.bottom - threshold);
                        const intensity = Math.min(1.5, Math.max(0.2, dist / threshold));
                        startAutoScroll(container, Math.round(intensity * maxSpeed));
                        return true;
                    }
                }
                return false;
            };

            let handled = checkAndScroll(driverListRef.current, 50, 14);
            if (!handled) {
                handled = checkAndScroll(modalContainer, 75, 18);
            }

            if (!handled) {
                stopAutoScroll();
            }
        };

        const handleWheel = (e) => {
            const modalContainer = contentWrapperRef.current?.closest('.overflow-y-auto') || modalBodyRef.current;
            if (driverListRef.current && driverListRef.current.contains(e.target)) {
                e.preventDefault();
                driverListRef.current.scrollTop += e.deltaY;
            } else if (modalContainer) {
                e.preventDefault();
                modalContainer.scrollTop += e.deltaY;
            }
        };

        const handleGlobalDragEnd = () => {
            onDragEndCleanup?.();
            stopAutoScroll();
        };

        window.addEventListener('dragover', handleGlobalDragOver, { capture: true, passive: false });
        window.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('dragend', handleGlobalDragEnd);
        window.addEventListener('drop', handleGlobalDragEnd);
        window.addEventListener('mouseup', handleGlobalDragEnd);

        return () => {
            window.removeEventListener('dragover', handleGlobalDragOver, { capture: true });
            window.removeEventListener('wheel', handleWheel);
            window.removeEventListener('dragend', handleGlobalDragEnd);
            window.removeEventListener('drop', handleGlobalDragEnd);
            window.removeEventListener('mouseup', handleGlobalDragEnd);
            stopAutoScroll();
        };
    }, [isDraggingAny, startAutoScroll, stopAutoScroll, contentWrapperRef, modalBodyRef, driverListRef, onDragEndCleanup]);

    return { startAutoScroll, stopAutoScroll };
}
