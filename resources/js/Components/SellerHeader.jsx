import React from 'react';
import Dropdown from '@/Components/Dropdown';
import NotificationDropdown from '@/Components/NotificationDropdown';
import { Menu, ChevronDown, User, LogOut, Building2 } from 'lucide-react';

/**
 * Reusable Seller Header Component
 * 
 * @param {Object} props
 * @param {string} props.title - Page title
 * @param {string} props.subtitle - Page subtitle (optional)
 * @param {Object} props.auth - Auth object containing user
 * @param {Function} props.onMenuClick - Mobile menu toggle callback
 */
export default function SellerHeader({ title, subtitle, auth, onMenuClick, badge }) {
    return (
        <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-40">
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden text-gray-500 hover:text-clay-600"
                >
                    <Menu size={24} />
                </button>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
                        {badge && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-900 text-[10px] font-bold uppercase tracking-wider text-gray-300">
                                <Building2 size={10} className={badge.iconColor || 'text-emerald-400'} /> {badge.label || 'Enterprise'}
                            </span>
                        )}
                    </div>
                    {subtitle && (
                        <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <NotificationDropdown />
                </div>
                <div className="h-8 w-px bg-gray-200"></div>

                {/* Profile Dropdown */}
                <div className="relative">
                    <Dropdown>
                        <Dropdown.Trigger>
                            <span className="inline-flex rounded-md">
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-3 px-1 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-transparent hover:text-gray-700 focus:outline-none transition ease-in-out duration-150"
                                >
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-bold text-gray-900">
                                            {auth.user.shop_name || auth.user.name}
                                        </p>
                                        <p className="text-[10px] text-gray-500">
                                            Seller Account
                                        </p>
                                    </div>
                                    <div className="w-9 h-9 rounded-full bg-clay-100 flex items-center justify-center text-clay-700 font-bold border border-clay-200 uppercase overflow-hidden flex-none aspect-square">
                                        {auth.user.avatar ? (
                                            <img 
                                                src={auth.user.avatar.startsWith('http') || auth.user.avatar.startsWith('/storage') ? auth.user.avatar : `/storage/${auth.user.avatar}`} 
                                                alt={auth.user.name} 
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            (auth.user.shop_name || auth.user.name).charAt(0)
                                        )}
                                    </div>
                                    <ChevronDown size={16} className="text-gray-400" />
                                </button>
                            </span>
                        </Dropdown.Trigger>

                        <Dropdown.Content>
                            <Dropdown.Link
                                href={route("profile.edit")}
                                className="flex items-center gap-2"
                            >
                                <User size={16} /> Profile
                            </Dropdown.Link>
                            <Dropdown.Link
                                href={route("logout")}
                                method="post"
                                as="button"
                                className="flex items-center gap-2 text-red-600 hover:text-red-700"
                            >
                                <LogOut size={16} /> Log Out
                            </Dropdown.Link>
                        </Dropdown.Content>
                    </Dropdown>
                </div>
            </div>
        </header>
    );
}
