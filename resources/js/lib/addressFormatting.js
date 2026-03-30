export const cleanAddressPart = (value = '') =>
    String(value ?? '')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^,+|,+$/g, '');

export const formatStructuredAddress = ({
    street_address = '',
    barangay = '',
    city = '',
    region = '',
    postal_code = '',
} = {}) => {
    const seen = new Set();

    return [street_address, barangay, city, region, postal_code]
        .map(cleanAddressPart)
        .filter(Boolean)
        .filter((part) => {
            const key = part.toLowerCase();

            if (seen.has(key)) {
                return false;
            }

            seen.add(key);
            return true;
        })
        .join(', ');
};
