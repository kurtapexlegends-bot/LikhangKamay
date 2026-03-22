import { useEffect } from 'react';

const STORAGE_KEY = 'lk-sponsored-events';
let seenEvents = null;

function loadSeenEvents() {
    if (seenEvents) {
        return seenEvents;
    }

    if (typeof window === 'undefined') {
        seenEvents = new Set();
        return seenEvents;
    }

    try {
        const stored = window.sessionStorage.getItem(STORAGE_KEY);
        seenEvents = new Set(stored ? JSON.parse(stored) : []);
    } catch {
        seenEvents = new Set();
    }

    return seenEvents;
}

function rememberEvent(key) {
    const cache = loadSeenEvents();
    cache.add(key);

    try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(cache)));
    } catch {
        // Ignore storage write failures. Server-side dedupe remains in place.
    }
}

function getCsrfToken() {
    if (typeof document === 'undefined') {
        return '';
    }

    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
}

export function trackSponsorshipEvent({ productId, eventType, placement, oncePerSession = false }) {
    if (!productId || !eventType || !placement || typeof window === 'undefined') {
        return;
    }

    const cacheKey = `${eventType}:${placement}:${productId}`;
    const cache = loadSeenEvents();

    if (oncePerSession && cache.has(cacheKey)) {
        return;
    }

    const csrfToken = getCsrfToken();

    if (!csrfToken) {
        return;
    }

    window.fetch(route('sponsorships.track'), {
        method: 'POST',
        credentials: 'same-origin',
        keepalive: eventType === 'click',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({
            product_id: productId,
            event_type: eventType,
            placement,
        }),
    }).catch(() => {
        // Best-effort tracking only.
    });

    if (oncePerSession) {
        rememberEvent(cacheKey);
    }
}

export function useSponsoredImpressionTracking(products, placement) {
    useEffect(() => {
        if (!Array.isArray(products) || products.length === 0 || typeof window === 'undefined') {
            return undefined;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    return;
                }

                const productId = entry.target.getAttribute('data-sponsored-product-id');

                trackSponsorshipEvent({
                    productId,
                    eventType: 'impression',
                    placement,
                    oncePerSession: true,
                });

                observer.unobserve(entry.target);
            });
        }, {
            threshold: 0.55,
        });

        const nodes = document.querySelectorAll(`[data-sponsored-placement="${placement}"]`);
        nodes.forEach((node) => observer.observe(node));

        return () => observer.disconnect();
    }, [placement, Array.isArray(products) ? products.map((product) => product?.id).join(',') : '']);
}
