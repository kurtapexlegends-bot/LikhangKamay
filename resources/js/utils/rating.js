export const normalizeRating = (rating) => {
    const parsedRating = Number.parseFloat(rating);

    return Number.isFinite(parsedRating) ? parsedRating : 0;
};

export const hasRating = (rating) => normalizeRating(rating) > 0;

export const formatRating = (rating, digits = 1) => normalizeRating(rating).toFixed(digits);
