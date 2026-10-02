import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

/**
 * Reusable Scroll Back to Top button with buttery smooth cubic-glide
 * and absolute 0px top-lock guarantee across all containers.
 *
 * @param {Object} props
 * @param {number} [props.showThreshold=280] - Minimum scroll distance in pixels before showing.
 * @param {string} [props.targetSelector] - Optional scroll container selector (e.g. '[scroll-region="true"]').
 * @param {string} [props.className] - Additional Tailwind classes for position or style overrides.
 */
export default function ScrollToTop({
    showThreshold = 280,
    targetSelector = null,
    className = '',
}) {
    const [isVisible, setIsVisible] = useState(false);
    const animFrameRef = useRef(null);

    // Resolve all active scroll candidates in the DOM
    const getScrollTargets = useCallback(() => {
        if (typeof document === 'undefined') return [];

        const targets = new Set();

        if (targetSelector) {
            const el = document.querySelector(targetSelector);
            if (el) targets.add(el);
        }

        // Auto-detect known scrollable viewports
        const sellerRegion = document.querySelector('[scroll-region="true"]');
        if (sellerRegion) targets.add(sellerRegion);

        const sellerMain = document.getElementById('seller-main-content');
        if (sellerMain) targets.add(sellerMain);

        const adminMain = document.getElementById('admin-main-content');
        if (adminMain) targets.add(adminMain);

        return Array.from(targets);
    }, [targetSelector]);

    // Measure maximum scroll depth across window and containers
    const getCurrentScrollDepth = useCallback(() => {
        let max = 0;
        if (typeof window !== 'undefined') {
            max = Math.max(
                max,
                window.pageYOffset || 0,
                document.documentElement?.scrollTop || 0,
                document.body?.scrollTop || 0
            );
        }

        const targets = getScrollTargets();
        for (const t of targets) {
            if (t && typeof t.scrollTop === 'number') {
                max = Math.max(max, t.scrollTop);
            }
        }

        return max;
    }, [getScrollTargets]);

    useEffect(() => {
        const handleScroll = () => {
            const depth = getCurrentScrollDepth();
            setIsVisible(depth > showThreshold);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });

        const targets = getScrollTargets();
        targets.forEach((t) => t.addEventListener('scroll', handleScroll, { passive: true }));

        handleScroll();

        return () => {
            window.removeEventListener('scroll', handleScroll);
            targets.forEach((t) => t.removeEventListener('scroll', handleScroll));
            if (animFrameRef.current && typeof window !== 'undefined') {
                window.cancelAnimationFrame(animFrameRef.current);
            }
        };
    }, [showThreshold, getCurrentScrollDepth, getScrollTargets]);

    const scrollToTop = () => {
        if (animFrameRef.current && typeof window !== 'undefined') {
            window.cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }

        const targets = getScrollTargets();
        const startWindowY = typeof window !== 'undefined'
            ? (window.pageYOffset || document.documentElement?.scrollTop || document.body?.scrollTop || 0)
            : 0;

        const targetStarts = targets.map((t) => ({
            element: t,
            startY: t.scrollTop || 0,
            originalBehavior: t.style.scrollBehavior || '',
        }));

        const maxStart = Math.max(startWindowY, ...targetStarts.map((ts) => ts.startY));
        if (maxStart <= 0) return;

        const prefersReducedMotion = typeof window !== 'undefined'
            && window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Instant fallback for reduced-motion accessibility preference
        if (prefersReducedMotion) {
            targetStarts.forEach(({ element }) => {
                element.scrollTop = 0;
            });
            if (typeof window !== 'undefined') {
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                if (document.documentElement) document.documentElement.scrollTop = 0;
                if (document.body) document.body.scrollTop = 0;
            }
            setIsVisible(false);
            return;
        }

        // Prevent CSS smooth-scroll conflict during requestAnimationFrame ticks
        const originalHtmlBehavior = document.documentElement.style.scrollBehavior || '';
        document.documentElement.style.scrollBehavior = 'auto';
        targetStarts.forEach(({ element }) => {
            element.style.scrollBehavior = 'auto';
        });

        // Dynamic adaptive duration: 320ms to 480ms for a snappy, fluid glide
        const duration = Math.min(480, Math.max(320, Math.round(maxStart * 0.22)));
        const startTime = typeof window !== 'undefined' && window.performance ? window.performance.now() : Date.now();

        // Ease-out quartic curve: fast initial acceleration, buttery soft landing
        const easeOutQuart = (x) => 1 - Math.pow(1 - x, 4);

        const restoreBehaviors = () => {
            document.documentElement.style.scrollBehavior = originalHtmlBehavior;
            targetStarts.forEach(({ element, originalBehavior }) => {
                element.style.scrollBehavior = originalBehavior;
            });
        };

        const tick = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedFactor = 1 - easeOutQuart(progress);

            // Interpolate internal containers
            targetStarts.forEach(({ element, startY }) => {
                if (element) {
                    element.scrollTop = Math.round(startY * easedFactor);
                }
            });

            // Interpolate document and window
            if (typeof window !== 'undefined') {
                const currentWindowY = Math.round(startWindowY * easedFactor);
                window.scrollTo(0, currentWindowY);
                if (document.documentElement) document.documentElement.scrollTop = currentWindowY;
                if (document.body) document.body.scrollTop = currentWindowY;
            }

            if (progress < 1) {
                if (typeof window !== 'undefined') {
                    animFrameRef.current = window.requestAnimationFrame(tick);
                }
            } else {
                // Absolute 0px Touchdown Guarantee
                targetStarts.forEach(({ element }) => {
                    if (element) element.scrollTop = 0;
                });
                if (typeof window !== 'undefined') {
                    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                    if (document.documentElement) document.documentElement.scrollTop = 0;
                    if (document.body) document.body.scrollTop = 0;
                }
                restoreBehaviors();
                animFrameRef.current = null;
                setIsVisible(false);
            }
        };

        if (typeof window !== 'undefined') {
            animFrameRef.current = window.requestAnimationFrame(tick);
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.button
                    type="button"
                    initial={{ opacity: 0, scale: 0.85, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, y: 8 }}
                    whileHover={{ scale: 1.08, y: -2 }}
                    whileTap={{ scale: 0.92 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    onClick={scrollToTop}
                    aria-label="Scroll back to top"
                    title="Back to top"
                    className={`fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-stone-900/95 hover:bg-clay-700 text-white shadow-xl shadow-stone-900/25 border border-stone-700/30 backdrop-blur-md transition-colors duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-clay-500 focus:ring-offset-2 ${className}`}
                >
                    <ArrowUp size={19} className="transition-transform duration-300 ease-out group-hover:-translate-y-1" />
                </motion.button>
            )}
        </AnimatePresence>
    );
}
