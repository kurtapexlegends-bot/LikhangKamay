import { useEffect } from 'react';

/**
 * Isolates a horizontal scroll container's wheel hitbox from parent window/screen scrolling.
 * When the user scrolls with their mouse wheel over this element:
 * - If the element has horizontal overflow, it intercepts the wheel event via e.preventDefault()
 *   and scrolls the element horizontally.
 * - This completely isolates its hitbox, preventing the window/screen from scrolling
 *   simultaneously while the cursor is inside this element.
 * - Trackpad horizontal gestures are also isolated to prevent parent chaining.
 *
 * @param {React.RefObject<HTMLElement|null>} ref
 */
export default function useIsolatedHorizontalScroll(ref) {
    useEffect(() => {
        const el = ref?.current;
        if (!el) return;

        const handleWheel = (e) => {
            if (el.scrollWidth <= el.clientWidth) return;

            // Trackpad horizontal scroll - stop propagation to avoid parent chaining
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                e.stopPropagation();
                return;
            }

            // Isolate wheel hitbox: prevent parent page scrolling and drive horizontal scroll
            e.preventDefault();
            e.stopPropagation();
            el.scrollLeft += e.deltaY;
        };

        el.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            el.removeEventListener('wheel', handleWheel);
        };
    }, [ref]);
}
