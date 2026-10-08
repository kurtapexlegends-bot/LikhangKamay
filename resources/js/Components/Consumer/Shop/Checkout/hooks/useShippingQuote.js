import { useState, useRef, useEffect } from 'react';

export default function useShippingQuote({
    data,
    activeShippingAddress,
    checkoutItems,
}) {
    const [quoteRetryNonce, setQuoteRetryNonce] = useState(0);
    const [shippingQuote, setShippingQuote] = useState({
        status: 'idle',
        totalShippingFee: 0,
        groups: {},
    });
    const quoteRequestRef = useRef(0);

    useEffect(() => {
        if (data.shipping_method !== 'Delivery') {
            setShippingQuote({
                status: 'ready',
                totalShippingFee: 0,
                groups: {},
            });
            return undefined;
        }

        if (!activeShippingAddress.trim() || checkoutItems.length === 0) {
            setShippingQuote({
                status: 'idle',
                totalShippingFee: 0,
                groups: {},
            });
            return undefined;
        }

        const requestId = quoteRequestRef.current + 1;
        quoteRequestRef.current = requestId;
        const timeoutId = window.setTimeout(async () => {
            setShippingQuote((current) => ({ ...current, status: 'loading' }));

            try {
                const response = await window.axios.post(route('checkout.shipping-quote'), {
                    items: checkoutItems.map((item) => ({
                        id: item.id,
                        qty: item.qty,
                        variant: item.variant ?? 'Standard',
                    })),
                    shipping_method: data.shipping_method,
                    selected_address_id: data.selected_address_id,
                    shipping_address: data.shipping_address,
                    shipping_address_type: data.shipping_address_type,
                    shipping_street_address: data.shipping_street_address,
                    shipping_barangay: data.shipping_barangay,
                    shipping_city: data.shipping_city,
                    shipping_region: data.shipping_region,
                    shipping_postal_code: data.shipping_postal_code,
                });

                const groupsBySellerId = (response.data.groups || []).reduce((map, group) => {
                    map[String(group.seller_id)] = Number(group.shipping_fee_amount || 0);
                    return map;
                }, {});

                const vehiclesBySellerId = (response.data.groups || []).reduce((map, group) => {
                    if (group.vehicle_info) {
                        map[String(group.seller_id)] = group.vehicle_info;
                    }
                    return map;
                }, {});

                if (quoteRequestRef.current !== requestId) return;

                setShippingQuote({
                    status: 'ready',
                    totalShippingFee: Number(response.data.total_shipping_fee || 0),
                    groups: groupsBySellerId,
                    vehicles: vehiclesBySellerId,
                });
            } catch {
                if (quoteRequestRef.current !== requestId) return;

                setShippingQuote({
                    status: 'error',
                    totalShippingFee: 0,
                    groups: {},
                    vehicles: {},
                });
            }
        }, 350);

        return () => window.clearTimeout(timeoutId);
    }, [
        activeShippingAddress,
        data.shipping_address,
        data.shipping_address_type,
        data.shipping_barangay,
        data.shipping_city,
        data.shipping_method,
        data.shipping_postal_code,
        data.shipping_region,
        data.shipping_street_address,
        checkoutItems,
        quoteRetryNonce,
        data.selected_address_id,
    ]);

    return {
        shippingQuote,
        setShippingQuote,
        quoteRetryNonce,
        setQuoteRetryNonce,
    };
}
