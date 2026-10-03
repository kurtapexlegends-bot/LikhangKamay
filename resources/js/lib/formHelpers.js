/**
 * Form ergonomics & accessibility helpers.
 */

/**
 * Automatically smooth-scrolls to and focuses the first invalid form input.
 * 
 * @param {Record<string, string>|null} [errors=null] - Validation error dictionary from Inertia
 * @param {HTMLElement|Document} [container=document] - Optional container to scope search
 */
export function scrollToFirstError(errors = null, container = typeof document !== 'undefined' ? document : null) {
    if (!container || typeof window === 'undefined') return;

    // Brief timeout allows React DOM updates to flush error state & class names
    setTimeout(() => {
        let firstInvalidElement = null;

        // 1. Try finding input corresponding to the first validation error key
        if (errors && typeof errors === 'object' && Object.keys(errors).length > 0) {
            for (const key of Object.keys(errors)) {
                // Check name attribute, id, or data-error-field
                try {
                    const el = container.querySelector(
                        `[name="${key}"], #${CSS.escape(key)}, [data-error-field="${key}"], [aria-describedby*="${key}"]`
                    );
                    if (el && typeof el.focus === 'function') {
                        firstInvalidElement = el;
                        break;
                    }
                } catch {
                    // Fall through if CSS.escape or selector fails
                }
            }
        }

        // 2. Fall back to standard HTML5 / ARIA invalid attributes
        if (!firstInvalidElement) {
            firstInvalidElement = container.querySelector(
                '[aria-invalid="true"], :invalid, .is-invalid, [data-invalid="true"]'
            );
        }

        // 3. Fall back to input closest to error label or message
        if (!firstInvalidElement) {
            const errorMsg = container.querySelector(
                '.text-red-500, .text-rose-600, .text-red-600, .text-danger, [role="alert"]'
            );
            if (errorMsg) {
                const parent = errorMsg.closest('div, label, fieldset, tr');
                if (parent) {
                    firstInvalidElement = parent.querySelector('input, select, textarea, button');
                }
            }
        }

        // 4. Smooth scroll and focus
        if (firstInvalidElement) {
            firstInvalidElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
            });

            setTimeout(() => {
                if (typeof firstInvalidElement.focus === 'function') {
                    firstInvalidElement.focus({ preventScroll: true });
                }
            }, 300);
        }
    }, 60);
}
