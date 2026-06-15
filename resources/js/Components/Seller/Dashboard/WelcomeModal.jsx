import React, { useState, useEffect } from 'react';
import Modal from '@/Components/Modal';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import { Sparkles } from 'lucide-react';

export default function WelcomeModal({ show, onClose }) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const content = (
        <div className="text-center relative overflow-hidden bg-white p-6 sm:p-8">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-amber-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-amber-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            
            <div className="relative z-10">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 border border-amber-200 shadow-sm mb-6">
                    <Sparkles className="h-8 w-8 text-amber-600" aria-hidden="true" />
                </div>
                
                <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2 tracking-tight">
                    Welcome to LikhangKamay!
                </h2>
                
                <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto leading-relaxed">
                    Congratulations! Your artisan application has been approved. You are now officially part of our growing community of local craftsmen. Let's start setting up your store and showcasing your handcrafted items.
                </p>
                
                <div className="flex flex-col gap-3 mt-4">
                    <button
                        type="button"
                        className="w-full inline-flex justify-center items-center rounded-xl bg-clay-600 px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-clay-700 transition-colors focus:outline-none focus:ring-2 focus:ring-clay-500 focus:ring-offset-2 min-h-[44px]"
                        onClick={onClose}
                    >
                        Get Started
                    </button>
                </div>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <SlideOverDrawer
                show={show}
                onClose={onClose}
                title="Welcome!"
                widthClass="max-w-md"
            >
                <div className="pt-2">
                    {content}
                </div>
            </SlideOverDrawer>
        );
    }

    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            {content}
        </Modal>
    );
}
