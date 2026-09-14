import React from 'react';
import Dropdown from '@/Components/Dropdown';
import UserAvatar from '@/Components/UserAvatar';
import { 
    ChevronDown, User, ShoppingBag, Heart, Clock, Shield, LogOut 
} from 'lucide-react';

export default function BuyerUserMenu({ 
    user, 
    buyerDisplayName, 
    sellerWorkspaceHref, 
    workspaceLabel 
}) {
    if (!user) return null;

    return (
        <div className="relative">
            <Dropdown>
                <Dropdown.Trigger>
                    <button 
                        type="button"
                        className="flex items-center gap-2 sm:gap-3 pl-1 pr-1.5 sm:pr-2 py-1 rounded-full hover:bg-gray-50 transition-all active:scale-95 border border-transparent hover:border-gray-200 group"
                    >
                        <UserAvatar 
                            user={user} 
                            className="w-9 h-9 border-2 border-white shadow-sm group-hover:border-clay-200 transition-colors" 
                        />
                        <div className="text-left hidden sm:block">
                            <p className="text-sm font-bold text-gray-900 leading-none">{buyerDisplayName}</p>
                        </div>
                        <ChevronDown size={16} className="text-gray-400 group-hover:text-clay-600" />
                    </button>
                </Dropdown.Trigger>
                <Dropdown.Content width="56">
                    <div className="px-4 py-3 border-b border-gray-100 mb-1 bg-gray-50/50">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Signed in as</p>
                        <p className="text-sm font-bold text-gray-900 truncate">{user.email}</p>
                    </div>
                    {user.role !== 'artisan' || user.artisan_status !== 'pending' ? (
                        <>
                            <Dropdown.Link href={route('profile.edit')}>
                                <User size={16} className="inline mr-2"/> Profile Settings
                            </Dropdown.Link>
                            <Dropdown.Link href={route('my-orders.index')}>
                                <ShoppingBag size={16} className="inline mr-2"/> My Purchases
                            </Dropdown.Link>
                            <Dropdown.Link href={route('saved.index')}>
                                <Heart size={16} className="inline mr-2"/> Saved
                            </Dropdown.Link>
                        </>
                    ) : (
                        <Dropdown.Link href={route('artisan.pending')} className="text-amber-600 font-bold bg-amber-50/50">
                            <span className="flex items-center">
                                <Clock size={16} className="inline mr-2" />
                                Application Status
                            </span>
                        </Dropdown.Link>
                    )}
                    {/* ADMIN LINK */}
                    {(user.role === 'super_admin' || user.role === 'admin') && (
                        <Dropdown.Link href={route('admin.dashboard')} className="text-stone-900 font-bold bg-stone-50 border-b border-stone-100">
                            <span className="flex items-center text-stone-700">
                                <Shield size={16} className="inline mr-2" />
                                Admin Dashboard
                            </span>
                        </Dropdown.Link>
                    )}
                    {/* SELLER LINK */}
                    {sellerWorkspaceHref && (
                        <Dropdown.Link href={sellerWorkspaceHref} className="text-clay-600 font-bold bg-clay-50/50">
                            <span className="flex items-center">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                {workspaceLabel}
                            </span>
                        </Dropdown.Link>
                    )}
                    <div className="border-t border-gray-100 my-1"></div>
                    <Dropdown.Link href={route('logout')} method="post" as="button" className="text-red-600 hover:bg-red-50">
                        <LogOut size={16} className="inline mr-2"/> Log Out
                    </Dropdown.Link>
                </Dropdown.Content>
            </Dropdown>
        </div>
    );
}
