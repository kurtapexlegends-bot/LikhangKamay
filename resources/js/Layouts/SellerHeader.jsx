import { usePage } from '@inertiajs/react';
import Dropdown from '@/Components/Dropdown';
import NotificationDropdown from '@/Components/NotificationDropdown';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceAccountSummary from '@/Components/WorkspaceAccountSummary';
import WorkspaceLogoutLink from '@/Components/WorkspaceLogoutLink';
import { Menu, ChevronDown, User, LogOut, Building2, Clock } from 'lucide-react';

import FloatingModuleActions from '@/Components/FloatingModuleActions';
import GlobalSearch from '@/Components/Consumer/GlobalSearch';
import { useRealtime } from '@/hooks/useRealtime';

/**
 * Reusable Seller Header Component
 *
 * @param {Object} props
 * @param {string} props.title
 * @param {string} props.subtitle
 * @param {Object} props.auth
 * @param {Function} props.onMenuClick
 */
export default function SellerHeader({ title, subtitle, auth: propAuth, onMenuClick, badge, actions = null }) {
    useRealtime();
    const { auth: pageAuth } = usePage().props;
    const auth = propAuth || pageAuth;

    return (
        <>
            {actions && <FloatingModuleActions actions={actions} />}
            <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8 sticky top-0 z-40">
                {/* Left: Menu & Title */}
                <div className="flex min-w-0 items-center gap-3">
                    <button
                        onClick={onMenuClick}
                        className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-clay-600 transition-all active:scale-95"
                    >
                        <Menu size={24} />
                    </button>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{title}</h1>
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

                {/* Right: Search, Notifications & Profile */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <GlobalSearch />
                    <NotificationDropdown />
                    <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>

                    {/* Profile Dropdown */}
                    <div className="relative">
                        <Dropdown>
                            <Dropdown.Trigger>
                                <span className="inline-flex rounded-xl">
                                    <button
                                        type="button"
                                        className="inline-flex items-center gap-2 sm:gap-3 px-1 sm:px-2 py-1 sm:py-2 border border-transparent text-sm leading-4 font-bold rounded-xl text-stone-600 bg-transparent hover:bg-stone-50 hover:text-stone-800 focus:outline-none transition-all duration-300 active:scale-95"
                                    >
                                        {auth?.user && (
                                            <>
                                                <WorkspaceAccountSummary user={auth.user} className="hidden lg:block text-right" />
                                                <UserAvatar user={auth.user} />
                                                <ChevronDown size={16} className="text-gray-400 hidden sm:block" />
                                            </>
                                        )}
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
                                    href={route("audit-log.index")}
                                    className="flex items-center gap-2"
                                >
                                    <Clock size={16} /> Activity History
                                </Dropdown.Link>
                                <WorkspaceLogoutLink className="flex items-center gap-2 text-red-600 hover:text-red-700">
                                    <LogOut size={16} /> Log Out
                                </WorkspaceLogoutLink>
                            </Dropdown.Content>
                        </Dropdown>
                    </div>
                </div>
            </header>
        </>
    );
}
