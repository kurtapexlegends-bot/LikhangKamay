/**
 * Shared client-side validation utilities matching LikhangKamay Form Requests.
 */

/**
 * Validates Philippine mobile numbers (e.g. 09171234567 or +639171234567).
 *
 * @param {string} phone
 * @returns {boolean}
 */
export function isValidPhilippinePhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    const cleaned = phone.replace(/[\s-]/g, '');
    return /^(09\d{9}|\+639\d{9})$/.test(cleaned);
}

/**
 * Normalizes a Philippine mobile number into standard 11-digit 09XXXXXXXXX format.
 *
 * @param {string} phone
 * @returns {string}
 */
export function formatPhilippinePhone(phone) {
    if (!phone || typeof phone !== 'string') return '';
    const cleaned = phone.replace(/[\s-]/g, '');
    if (cleaned.startsWith('+63')) {
        return '0' + cleaned.slice(3);
    }
    return cleaned;
}

/**
 * Validates Cavite postal code ranges (4100 through 4125).
 *
 * @param {string|number} zip
 * @returns {boolean}
 */
export function isValidCaviteZip(zip) {
    if (!zip) return false;
    const num = parseInt(String(zip).trim(), 10);
    return !isNaN(num) && num >= 4100 && num <= 4125;
}

/**
 * Validates that an amount is a positive number within expected platform bounds.
 *
 * @param {number|string} amount
 * @param {number} min
 * @param {number} max
 * @returns {boolean}
 */
export function isValidAmount(amount, min = 0.01, max = 500000.00) {
    const val = parseFloat(amount);
    return !isNaN(val) && val >= min && val <= max;
}

/**
 * Validates SKU format (alphanumeric and dashes, 3-30 chars).
 *
 * @param {string} sku
 * @returns {boolean}
 */
export function isValidSku(sku) {
    if (!sku || typeof sku !== 'string') return false;
    return /^[A-Za-z0-9_-]{3,30}$/.test(sku.trim());
}

export default {
    isValidPhilippinePhone,
    formatPhilippinePhone,
    isValidCaviteZip,
    isValidAmount,
    isValidSku,
};
