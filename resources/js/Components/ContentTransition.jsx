import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ContentTransition({ isShowingPlaceholder, placeholder, children, className = "" }) {
    return (
        <AnimatePresence mode="wait">
            {isShowingPlaceholder ? (
                <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={className}
                >
                    {placeholder}
                </motion.div>
            ) : (
                <motion.div
                    key="content"
                    initial={{ opacity: 0, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className={className}
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
