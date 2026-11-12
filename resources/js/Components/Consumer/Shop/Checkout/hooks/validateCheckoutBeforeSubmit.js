export default function validateCheckoutBeforeSubmit({
    data,
    summary,
    shippingQuote,
    hasPickupDisabledSeller,
    sellersWithPickupDisabled,
    totalSellers,
    sellerGroups,
    pickupConfigs,
    pickupSchedules,
    primaryPickupConfig,
    setError,
    addToast,
}) {
    if (data.shipping_method === 'Delivery') {
        const localErrors = {};

        if (!data.recipient_name || data.recipient_name.trim() === '') {
            localErrors.recipient_name = 'Recipient name is required';
        }
        if (!data.phone_number || data.phone_number.trim() === '') {
            localErrors.phone_number = 'Phone number is required';
        } else if (!/^(09|\+639)\d{9}$/.test(data.phone_number.replace(/\s+/g, ''))) {
            localErrors.phone_number = 'Please enter a valid Philippine mobile number (e.g. 09171234567)';
        }
        if (!data.shipping_street_address || data.shipping_street_address.trim() === '') {
            localErrors.shipping_street_address = 'Street address is required';
        }
        if (!data.shipping_city || data.shipping_city.trim() === '') {
            localErrors.shipping_city = 'City/Municipality is required';
        }
        if (!data.shipping_barangay || data.shipping_barangay.trim() === '') {
            localErrors.shipping_barangay = 'Barangay is required';
        }
        if (!data.shipping_region || data.shipping_region.trim() === '') {
            localErrors.shipping_region = 'Province/Region is required';
        }

        if (Object.keys(localErrors).length > 0) {
            setError(localErrors);
            addToast('Please complete all delivery details before placing order.', 'error');
            return false;
        }

        if (shippingQuote.status !== 'ready') {
            if (shippingQuote.status === 'error') {
                const errorMsg =
                    shippingQuote.errorMessage ||
                    'Unable to calculate shipping quote. Please check your delivery address.';
                addToast(errorMsg, 'error');
            } else {
                addToast('Wait for the delivery quote before placing the order.', 'info');
            }
            return false;
        }
    } else if (data.shipping_method === 'Pick Up') {
        const localErrors = {};

        if (hasPickupDisabledSeller) {
            for (const group of sellersWithPickupDisabled) {
                localErrors[`pickup_schedules.${group.sellerId}`] =
                    `${group.shopName} does not offer workshop pick-up. Please switch to Standard Delivery or purchase their items separately.`;
            }
            setError(localErrors);
            addToast(
                `${sellersWithPickupDisabled[0].shopName} does not offer workshop pick-up. Please switch to Standard Delivery or purchase their items separately.`,
                'error'
            );
            return false;
        }

        if (totalSellers > 1) {
            for (const group of sellerGroups) {
                const config = pickupConfigs?.[String(group.sellerId)];
                if (config && config.pickup_enabled === false) {
                    localErrors[`pickup_schedules.${group.sellerId}`] =
                        `${group.shopName} does not offer workshop pick-up. Please switch to Standard Delivery or purchase their items separately.`;
                } else {
                    const sched = pickupSchedules[String(group.sellerId)];
                    if (!sched?.date) {
                        localErrors[`pickup_schedules.${group.sellerId}`] =
                            `Please select a pickup date for ${group.shopName}.`;
                    } else if (!sched?.time_slot) {
                        localErrors[`pickup_schedules.${group.sellerId}`] =
                            `Please select a time slot for ${group.shopName}.`;
                    }
                }
            }
        } else {
            const config = primaryPickupConfig;
            if (config && config.pickup_enabled === false) {
                localErrors.pickup_date = `${sellerGroups[0]?.shopName || 'This workshop'} does not offer workshop pick-up. Please switch to Standard Delivery.`;
            } else {
                if (!data.pickup_date) {
                    localErrors.pickup_date = 'Please select a pickup date.';
                }
                if (!data.pickup_time_slot) {
                    localErrors.pickup_time_slot = 'Please select an available pickup time window.';
                }
            }
        }

        if (Object.keys(localErrors).length > 0) {
            setError(localErrors);
            addToast('Please select your preferred pickup date and time window for each workshop.', 'error');
            return false;
        }
    }

    if (
        ['GCash', 'Maya'].includes(data.payment_method) &&
        Array.isArray(summary?.groups) &&
        summary.groups.some((group) => Number(group.total || 0) < 20)
    ) {
        const msg = 'Online payment (GCash/Maya) requires at least PHP 20.00 per order. Please select Cash on Delivery.';
        setError('payment_method', msg);
        addToast(msg, 'error');
        return false;
    }

    return true;
}
