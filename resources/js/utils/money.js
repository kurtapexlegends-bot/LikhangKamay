export const parsePrice = (price) => Number(String(price ?? 0).replace(/,/g, ''));

export const formatPrice = (price) => {
    const num = parsePrice(price);
    return num % 1 !== 0
        ? num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : num.toLocaleString('en-PH');
};
