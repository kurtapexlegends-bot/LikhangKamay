import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

/**
 * Reusable Scroll Back to Top button with smooth behavior and mobile dock clearance.
 *
 * @param {Object} props
 * @param {number} [props.showThreshold=300] - Minimum scroll distance in pixels before showing.
 * @param {string} [props.targetSelector] - Optional scroll container selector (e.g. '[scroll-region="true"]').
 * @param {string} [props.className] - Additional Tailwind classes for position or style overrides.
 */
export default function ScrollToTop({
    showThreshold = 300,
    targetSelector = null,
    className = '',
}) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const getScrollContainer = () => {
            if (targetSelector && typeof document !== 'undefined') {
                return document.querySelector(targetSelector);
            }
            return null;
        };

        const targetElement = getScrollContainer();

        const handleScroll = () => {
            const currentContainer = targetSelector && typeof document !== 'undefined'
                ? document.querySelector(targetSelector)
                : targetElement;

            const currentScroll = currentContainer
                ? currentContainer.scrollTop
                : (window.pageYOffset || document.documentElement.scrollTop || 0);

            setIsVisible(currentScroll > showThreshold);
        };

        if (targetElement) {
            targetElement.addEventListener('scroll', handleScroll, { passive: true });
        } else {
            window.addEventListener('scroll', handleScroll, { passive: true });
        }

        handleScroll();

        return () => {
            if (targetElement) {
                targetElement.removeEventListener('scroll', handleScroll);
            } else {
                window.removeEventListener('scroll', handleScroll);
            }
        };
    }, [showThreshold, targetSelector]);

    const scrollToTop = () => {
        const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const scrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';

        if (targetSelector && typeof document !== 'undefined') {
            const el = document.querySelector(targetSelector);
            if (el) {
                el.scrollTo({ top: 0, behavior: scrollBehavior });
                return;
            }
        }
        window.scrollTo({ top: 0, behavior: scrollBehavior });
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.button
                    type="button"
                    initial={{ opacity: 0, scale: 0.8, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 8 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    onClick={scrollToTop}
                    aria-label="Scroll back to top"
                    title="Back to top"
                    className={`fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-stone-900/90 hover:bg-clay-700 text-white shadow-lg shadow-stone-900/15 border border-stone-700/20 backdrop-blur-xs transition-colors duration-200 active:scale-90 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-clay-500 focus:ring-offset-2 ${className}`}
                >
                    <ArrowUp size={18} className="transition-transform duration-200 group-hover:-translate-y-0.5" />
                </motion.button>
            )}
        </AnimatePresence>
    );
}
