export function getPosPromoBreakdown(item) {
    const qty = Number(item?.quantity || 0);
    const regularPrice = Number(item?.regularPrice ?? item?.unitPrice ?? 0);
    const promoPrice = Number(item?.unitPrice ?? regularPrice);
    const maxLimit = (item?.maxPromoLimit !== null && item?.maxPromoLimit !== undefined)
        ? Number(item.maxPromoLimit)
        : null;

    if (maxLimit !== null && maxLimit >= 0 && qty > maxLimit && promoPrice < regularPrice) {
        const promoQty = maxLimit;
        const regularQty = qty - maxLimit;
        const lineTotal = Number(((promoQty * promoPrice) + (regularQty * regularPrice)).toFixed(2));
        return {
            promoQty,
            regularQty,
            promoPrice,
            regularPrice,
            lineTotal,
            hasSplitTier: promoQty > 0 && regularQty > 0,
        };
    }

    const lineTotal = Number((promoPrice * qty).toFixed(2));
    return { promoQty: qty, regularQty: 0, promoPrice, regularPrice, lineTotal, hasSplitTier: false };
}

export function calculatePosLineTotal(item) {
    return getPosPromoBreakdown(item).lineTotal;
}
