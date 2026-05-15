import { motion } from 'framer-motion';

export default function PrimaryButton({
    className = '',
    disabled,
    children,
    ...props
}) {
    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            {...props}
            className={
                `inline-flex items-center rounded-xl border border-transparent bg-clay-600 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition-colors duration-300 ease-in-out hover:bg-clay-700 hover:shadow-md focus:bg-clay-700 focus:outline-none focus:ring-2 focus:ring-clay-500 focus:ring-offset-2 active:bg-clay-800 active:shadow-sm ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </motion.button>
    );
}
