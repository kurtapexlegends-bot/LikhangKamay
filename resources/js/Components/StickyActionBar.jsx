import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function StickyActionBar({ children, className = '' }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        document.body.classList.add('has-sticky-action-bar');
        
        return () => {
            setMounted(false);
            document.body.classList.remove('has-sticky-action-bar');
        };
    }, []);

    const content = (
        <div className={`fixed inset-x-0 bottom-0 z-[70] w-full border-t border-stone-200 bg-white/95 backdrop-blur-md p-3 sm:p-4 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] ${className}`}>
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
                {children}
            </div>
        </div>
    );

    if (!mounted) return null;

    return createPortal(content, document.body);
}
