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
        <div className={`fixed bottom-4 inset-x-4 z-[70] border border-stone-200/60 bg-white/95 backdrop-blur-xl p-3 shadow.sm shadow-[0_-8px_30px_rgba(27,27,27,0.06),0_15px_30px_rgba(0,0,0,0.04)] rounded-2xl sm:hidden ${className}`}>
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
                {children}
            </div>
        </div>
    );

    if (!mounted) return null;

    return createPortal(content, document.body);
}
