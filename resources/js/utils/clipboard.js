/**
 * Safely copy text to clipboard across all browser environments,
 * including mobile devices, iframes, and insecure (HTTP/LAN) contexts.
 *
 * @param {string|number} text
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
    if (text === null || text === undefined) {
        return false;
    }

    const content = String(text);

    // 1. Modern Clipboard API in Secure Context
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        try {
            await navigator.clipboard.writeText(content);
            return true;
        } catch {
            // Fall through to legacy execCommand fallback if writeText rejects (e.g. lack of focus)
        }
    }

    // 2. Legacy fallback using document.execCommand('copy')
    if (typeof document !== 'undefined') {
        try {
            const textarea = document.createElement('textarea');
            textarea.value = content;
            textarea.setAttribute('readonly', '');
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            textarea.style.top = '-9999px';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            return Boolean(success);
        } catch {
            return false;
        }
    }

    return false;
}

export default copyToClipboard;
