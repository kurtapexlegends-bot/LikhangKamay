import { useState, useMemo, useCallback, useEffect } from 'react';

const formatPesoShort = (amount) =>
    `PHP ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const evaluateVoucherForCartGroup = (voucher, groupItems = [], fallbackSubtotal = 0) => {
    if (!voucher) {
        return { isEligible: false, discountAmount: 0, shortfall: 0, ineligibleReason: null };
    }

    if (voucher.audience_eligible === false) {
        return {
            isEligible: false,
            discountAmount: voucher.discount_amount || 0,
            shortfall: voucher.shortfall || 0,
            ineligibleReason: voucher.ineligible_reason || 'Customer eligibility not met',
        };
    }

    let qualifyingItems = groupItems;
    if (voucher.scope_type === 'specific_products') {
        const allowed = (voucher.applicable_products || []).map(Number);
        qualifyingItems = groupItems.filter((it) => allowed.includes(Number(it.id || it.product_id)));
    } else if (voucher.scope_type === 'category' && voucher.applicable_category) {
        qualifyingItems = groupItems.filter(
            (it) => String(it.category || '').toLowerCase() === String(voucher.applicable_category).toLowerCase()
        );
    }

    if (qualifyingItems.length === 0 && groupItems.length > 0 && voucher.scope_type !== 'all') {
        return {
            isEligible: false,
            discountAmount: 0,
            shortfall: 0,
            ineligibleReason:
                voucher.scope_type === 'category'
                    ? `Requires category '${voucher.applicable_category}'`
                    : 'No eligible items in cart',
        };
    }

    const qualifyingSubtotal = qualifyingItems.length > 0
        ? qualifyingItems.reduce((sum, it) => sum + Number(it.price || 0) * Number(it.qty || 1), 0)
        : fallbackSubtotal;

    const qualifyingQuantity = qualifyingItems.length > 0
        ? qualifyingItems.reduce((sum, it) => sum + Number(it.qty || 1), 0)
        : 1;

    if (voucher.min_requirement_type === 'quantity') {
        const minQty = Math.max(1, Number(voucher.min_quantity || 1));
        if (qualifyingQuantity < minQty) {
            const diff = minQty - qualifyingQuantity;
            return {
                isEligible: false,
                discountAmount: Number(voucher.discount_amount || 0),
                shortfall: diff,
                ineligibleReason: `Add ${diff} more item(s) to unlock`,
            };
        }
    } else {
        const minSpend = Number(voucher.min_spend || 0);
        if (qualifyingSubtotal < minSpend) {
            const shortfall = Number((minSpend - qualifyingSubtotal).toFixed(2));
            return {
                isEligible: false,
                discountAmount: Number(voucher.discount_amount || 0),
                shortfall,
                ineligibleReason: `Add ${formatPesoShort(shortfall)} more to unlock`,
            };
        }
    }

    let discount = 0;
    if (voucher.discount_type === 'percentage') {
        discount = Number((qualifyingSubtotal * (Number(voucher.discount_value || 0) / 100)).toFixed(2));
        if (voucher.max_discount !== null && voucher.max_discount !== undefined && Number(voucher.max_discount) > 0) {
            discount = Math.min(discount, Number(voucher.max_discount));
        }
    } else {
        discount = Number(voucher.discount_value || 0);
    }

    return {
        isEligible: true,
        discountAmount: Number(Math.min(Math.max(0, discount), qualifyingSubtotal).toFixed(2)),
        shortfall: 0,
        ineligibleReason: null,
    };
};

export default function useCheckoutVouchers({
    sellerGroups = [],
    availableVouchers = { shops: {} },
    setData,
    addToast,
}) {
    const [appliedShopVouchers, setAppliedShopVouchers] = useState({});
    const [followedShopOverrides, setFollowedShopOverrides] = useState({});
    const [followingShopId, setFollowingShopId] = useState(null);
    const [promoCodeInput, setPromoCodeInput] = useState('');
    const [validatingCode, setValidatingCode] = useState(false);
    const [voucherError, setVoucherError] = useState('');
    const [isVoucherDrawerOpen, setIsVoucherDrawerOpen] = useState(false);

    const subtotalsBySeller = useMemo(() => {
        const map = {};
        sellerGroups.forEach((g) => {
            map[String(g.sellerId)] = Number((g.subtotal || 0).toFixed(2));
        });
        return map;
    }, [sellerGroups]);

    // Dynamically re-evaluate public drawer vouchers whenever cart quantities/items change
    const dynamicAvailableVouchers = useMemo(() => {
        const incomingShops = availableVouchers?.shops || {};
        const nextShops = {};

        sellerGroups.forEach((g) => {
            const key = String(g.sellerId);
            const rawSub = Number((g.subtotal || 0).toFixed(2));
            const list = Array.isArray(incomingShops[key]) ? incomingShops[key] : [];

            nextShops[key] = list.map((voucher) => {
                const isFollowOverride = followedShopOverrides[key] === true;
                const patchedVoucher =
                    voucher.target_audience === 'followers' && isFollowOverride
                        ? {
                              ...voucher,
                              audience_eligible: true,
                              is_following_shop: true,
                              ineligible_reason: null,
                          }
                        : voucher;

                const evaluation = evaluateVoucherForCartGroup(patchedVoucher, g.items || [], rawSub);
                return {
                    ...patchedVoucher,
                    is_eligible: evaluation.isEligible,
                    shortfall: evaluation.shortfall,
                    ineligible_reason: evaluation.ineligibleReason,
                    discount_amount: evaluation.isEligible ? evaluation.discountAmount : voucher.discount_amount,
                };
            });
        });

        return { shops: nextShops };
    }, [availableVouchers, sellerGroups, followedShopOverrides]);

    // Calculate live discounts per shop for currently applied vouchers
    const voucherCalculations = useMemo(() => {
        const shopDiscountsBySeller = {};
        let totalShopDiscount = 0;

        sellerGroups.forEach((g) => {
            const key = String(g.sellerId);
            const rawSub = Number((g.subtotal || 0).toFixed(2));
            const shopVoucher = appliedShopVouchers[key] || null;
            const shopDisc = shopVoucher
                ? (() => {
                      const ev = evaluateVoucherForCartGroup(shopVoucher, g.items || [], rawSub);
                      return ev.isEligible ? ev.discountAmount : 0;
                  })()
                : 0;

            shopDiscountsBySeller[key] = shopDisc;
            totalShopDiscount = Number((totalShopDiscount + shopDisc).toFixed(2));
        });

        return {
            shopDiscountsBySeller,
            totalShopDiscount,
            totalVoucherDiscount: totalShopDiscount,
        };
    }, [sellerGroups, appliedShopVouchers]);

    const applyVoucherObject = useCallback(
        (voucherObj) => {
            if (!voucherObj || !voucherObj.shop_id) return;
            setVoucherError('');

            const shopKey = String(voucherObj.shop_id);
            setAppliedShopVouchers((prev) => ({
                ...prev,
                [shopKey]: voucherObj,
            }));
            if (addToast) addToast(`Shop voucher ${voucherObj.code} applied.`, 'success');
        },
        [addToast]
    );

    const removeShopVoucher = useCallback((sellerId) => {
        const key = String(sellerId);
        setAppliedShopVouchers((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    }, []);

    const handleFollowShop = useCallback(
        async (shopId) => {
            if (!shopId || followingShopId) return false;
            setFollowingShopId(shopId);

            try {
                const response = await window.axios.post(route('buyer.shops.toggle-follow'), {
                    shop_id: Number(shopId),
                });

                const followed = Boolean(response.data?.is_followed);
                setFollowedShopOverrides((prev) => ({
                    ...prev,
                    [String(shopId)]: followed,
                }));

                if (addToast) {
                    addToast(
                        followed ? 'Workshop followed. Follower voucher unlocked.' : 'Unfollowed workshop.',
                        followed ? 'success' : 'info'
                    );
                }

                return followed;
            } catch {
                if (addToast) addToast('Could not follow this workshop right now.', 'error');
                return false;
            } finally {
                setFollowingShopId(null);
            }
        },
        [followingShopId, addToast]
    );

    const handleApplyPromoCode = useCallback(
        async (explicitCode = null) => {
            const codeToApply = String(explicitCode ?? promoCodeInput).trim().toUpperCase();
            if (!codeToApply) {
                setVoucherError('Please enter a promo code.');
                return false;
            }

            setValidatingCode(true);
            setVoucherError('');

            try {
                const allItems = sellerGroups.flatMap((g) => g.items || []);
                const response = await window.axios.post(route('checkout.validate-voucher'), {
                    code: codeToApply,
                    subtotals: subtotalsBySeller,
                    items: allItems,
                });

                if (response.data?.valid && response.data?.voucher) {
                    applyVoucherObject(response.data.voucher);
                    setPromoCodeInput('');
                    return true;
                }
            } catch (err) {
                const msg =
                    err.response?.data?.errors?.voucher_code?.[0] ||
                    err.response?.data?.message ||
                    'Unable to apply promo code.';
                setVoucherError(msg);
            } finally {
                setValidatingCode(false);
            }

            return false;
        },
        [promoCodeInput, subtotalsBySeller, sellerGroups, applyVoucherObject]
    );

    // Sync applied voucher codes into Inertia form data
    useEffect(() => {
        const shopCodesMap = {};
        Object.entries(appliedShopVouchers).forEach(([sellerKey, v]) => {
            if (v?.code && (voucherCalculations.shopDiscountsBySeller[sellerKey] || 0) > 0) {
                shopCodesMap[sellerKey] = v.code;
            }
        });

        setData((curr) => {
            const currentMap = curr.shop_vouchers || {};
            const currentKeys = Object.keys(currentMap);
            const nextKeys = Object.keys(shopCodesMap);
            if (
                currentKeys.length === nextKeys.length &&
                currentKeys.every((k) => currentMap[k] === shopCodesMap[k])
            ) {
                return curr;
            }
            return {
                ...curr,
                shop_vouchers: shopCodesMap,
            };
        });
    }, [appliedShopVouchers, voucherCalculations.shopDiscountsBySeller, setData]);

    const totalAvailableVouchersCount = useMemo(() => {
        return Object.values(dynamicAvailableVouchers?.shops || {}).reduce(
            (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
            0
        );
    }, [dynamicAvailableVouchers]);

    return {
        appliedShopVouchers,
        dynamicAvailableVouchers,
        voucherCalculations,
        promoCodeInput,
        setPromoCodeInput,
        validatingCode,
        voucherError,
        setVoucherError,
        isVoucherDrawerOpen,
        setIsVoucherDrawerOpen,
        applyVoucherObject,
        removeShopVoucher,
        handleApplyPromoCode,
        handleFollowShop,
        followingShopId,
        totalAvailableVouchersCount,
    };
}
