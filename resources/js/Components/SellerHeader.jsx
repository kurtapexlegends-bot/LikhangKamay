import React from 'react';
import Dropdown from '@/Components/Dropdown';
import NotificationDropdown from '@/Components/NotificationDropdown';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceAccountSummary from '@/Components/WorkspaceAccountSummary';
import WorkspaceLogoutLink from '@/Components/WorkspaceLogoutLink';
import { Menu, ChevronDown, User, LogOut, Building2 } from 'lucide-react';

/**
 * Reusable Seller Header Component
 *
 * @param {Object} props
 * @param {string} props.title
 * @param {string} props.subtitle
 * @param {Object} props.auth
 * @param {Function} props.onMenuClick
 */
export default function SellerHeader({ title, subtitle, auth, onMenuClick, badge, actions = null }) {
    return (
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 flex flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8 sm:flex-row sm:items-center sm:justify-between sticky top-0 z-40">
            <div className="flex min-w-0 items-center gap-3">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden text-gray-500 hover:text-clay-600"
                >
                    <Menu size={24} />
                </button>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
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

                        
            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap sm:gap-6">
                {actions && (
                    <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none sm:gap-3">
                        {actions}
                    </div>
                )}

                <div className="flex items-center gap-3">
                    <NotificationDropdown />
                </div>
                <div className="hidden sm:block h-8 w-px bg-gray-200"></div>

                {/* Profile Dropdown */}
                <div className="relative">
                    <Dropdown>
                        <Dropdown.Trigger>
                            <span className="inline-flex rounded-md">
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-2 sm:gap-3 px-1 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-transparent hover:text-gray-700 focus:outline-none transition ease-in-out duration-150"
                                >
                                    <WorkspaceAccountSummary user={auth.user} className="hidden lg:block text-right" />
                                    <UserAvatar user={auth.user} />
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
                            <WorkspaceLogoutLink className="flex items-center gap-2 text-red-600 hover:text-red-700">
                                <LogOut size={16} /> Log Out
                            </WorkspaceLogoutLink>
                        </Dropdown.Content>
                    </Dropdown>
                </div>
            </div>
        </header>
    );
}
