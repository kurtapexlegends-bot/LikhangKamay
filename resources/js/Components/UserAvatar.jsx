import React from 'react';
import { Crown, Sparkles } from 'lucide-react';

export default function UserAvatar({ user, className = 'w-9 h-9' }) {
    if (!user) return null;
    
    // Check both premium_tier (from User model) and subscription_plan (if passed explicitly)
    const plan = user.premium_tier || user.subscription_plan || 'free';
    const isPremium = plan === 'premium' && user.role !== 'super_admin';
    const isElite = plan === 'super_premium' && user.role !== 'super_admin';
    
    return (
        <div className="relative inline-flex">
            {isPremium && (
                <div className="absolute -top-2 -right-1.5 z-10 text-amber-500 drop-shadow-sm rotate-[15deg]">
                    <Crown size={16} strokeWidth={2.5} className="fill-amber-400" />
                </div>
            )}
            {isElite && (
                <div className="absolute -top-2 -right-1.5 z-10 text-violet-500 drop-shadow-sm rotate-[15deg]">
                    <Sparkles size={14} strokeWidth={2.5} className="fill-violet-400" />
                </div>
            )}
            <div className={`${className} rounded-full bg-stone-100 flex items-center justify-center text-stone-700 font-bold uppercase overflow-hidden ring-2 ring-offset-2 ${isElite ? 'ring-violet-500' : isPremium ? 'ring-amber-500' : 'ring-stone-200'} shrink-0`}>
                {user.avatar ? (
                    <img 
                        src={user.avatar.startsWith('http') || user.avatar.startsWith('/storage') ? user.avatar : `/storage/${user.avatar}`} 
                        alt={user.shop_name || user.name} 
                        className="w-full h-full object-cover"
                    />
                ) : (
                    (user.shop_name || user.name || 'A').charAt(0)
                )}
            </div>
        </div>
    );
}
