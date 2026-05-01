import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePage } from '@inertiajs/react';

const AUTH_PREFIXES = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/artisan/register'];

function isAuthRoute(url) {
    const path = url.split('?')[0];
    return AUTH_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + '/'));
}

const contentVariants = {
    initial: { opacity: 0, y: 4 },
    animate: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.1, ease: 'easeIn' },
    },
};

const overlayVariants = {
    initial: { opacity: 0 },
    animate: {
        opacity: 1,
        transition: { duration: 0.2, ease: 'easeOut' },
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.15, ease: 'easeIn' },
    },
};

export default function PageTransition({ children }) {
    const { url } = usePage();
    const variants = isAuthRoute(url) ? overlayVariants : contentVariants;

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={url}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full h-full"
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}
