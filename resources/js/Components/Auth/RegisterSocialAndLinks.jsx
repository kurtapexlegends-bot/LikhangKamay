import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@inertiajs/react';
import { Loader2, User, Store } from 'lucide-react';

export default function RegisterSocialAndLinks({ itemVariants }) {
    const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);

    const handleGoogleClick = () => {
        setIsGoogleSigningIn(true);
    };

    return (
        <>
            {/* Social Signup Section */}
            <motion.div variants={itemVariants} className="mt-8 flex flex-col items-center">
                <div className="relative w-full mb-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full h-px bg-stone-200/60" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                        <span className="px-4 bg-white text-stone-400 font-bold uppercase tracking-widest text-[9px]">Or sign up with</span>
                    </div>
                </div>

                <a 
                    href="/auth/google" 
                    onClick={handleGoogleClick}
                    className="group flex items-center justify-center gap-3 px-6 py-2.5 border border-stone-200/80 rounded-full bg-white hover:bg-stone-50 hover:border-stone-400 transition-all duration-300 active:scale-[0.98] shadow-sm hover:shadow"
                >
                    {isGoogleSigningIn ? (
                        <>
                            <Loader2 size={14} className="animate-spin text-stone-500" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Connecting...</span>
                        </>
                    ) : (
                        <>
                            <img src="/images/google-icon.svg" className="w-4 h-4 group-hover:scale-110 transition-transform" alt="Google" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-600 group-hover:text-stone-900 transition-colors">Google Account</span>
                        </>
                    )}
                </a>
            </motion.div>

            {/* Footer Navigation */}
            <motion.div 
                variants={itemVariants}
                className="mt-10 pt-6 border-t border-stone-100"
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    <Link 
                        href={route('login')}
                        className="group flex items-center justify-center gap-2 text-xs font-bold text-stone-600 bg-stone-50 border border-stone-200 px-5 py-3 rounded-xl hover:bg-stone-100 hover:border-stone-300 transition-all duration-300 shadow-sm hover:shadow uppercase tracking-wider"
                    >
                        <User size={14} className="text-stone-400 group-hover:text-stone-600 transition-colors group-hover:scale-110" />
                        <span>Log in</span>
                    </Link>
                    
                    <Link 
                        href="/artisan/register" 
                        className="group flex items-center justify-center gap-2 text-xs font-bold text-clay-700 bg-clay-50 border border-clay-200 px-5 py-3 rounded-xl hover:bg-clay-100 hover:border-clay-300 transition-all duration-300 shadow-sm hover:shadow uppercase tracking-wider"
                    >
                        <Store size={14} className="text-clay-500 group-hover:text-clay-700 transition-colors group-hover:scale-110" />
                        <span>Become an Artisan</span>
                    </Link>
                </div>
            </motion.div>
        </>
    );
}
