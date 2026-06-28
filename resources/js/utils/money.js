export const parsePrice = (price) => Number(String(price ?? 0).replace(/,/g, ''));

export const formatPrice = (price) => parsePrice(price).toLocaleString('en-PH');
