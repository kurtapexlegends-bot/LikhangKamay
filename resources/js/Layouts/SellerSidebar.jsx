import React, { useEffect, useMemo, useState } from 'react'; 
import { router, usePage } from '@inertiajs/react';
import StaffAttendanceMonitor from '@/Components/StaffAttendanceMonitor';
import { 
    LayoutDashboard, Package, ShoppingBag, BarChart3, Box, 
    Users, MessageCircle, Settings, X,
    ClipboardList, Warehouse, FileQuestion, Sliders, Banknote, Star, Award, Crown, Sparkles, Zap
} from 'lucide-react';
import { PlanModal } from '@/Components/PlanBadge';

// Imported modular components
import CategoryGroup from '@/Components/Seller/Sidebar/CategoryGroup';
import ModuleToggle from '@/Components/Seller/Sidebar/ModuleToggle';
import NavItem from '@/Components/Seller/Sidebar/NavItem';
import StaffAttendanceDock from '@/Components/Seller/Sidebar/StaffAttendanceDock';

const GROUPS_STORAGE_KEY = 'seller_sidebar_expanded_groups_v1';
const GEAR_HINT_STORAGE_KEY = 'seller_sidebar_gear_hint_seen_v1';
const resolveActiveGroup = (active) => {
    if (['staff-dashboard'].includes(active)) return 'workspace';
    if (['overview', 'products', 'analytics', '3d'].includes(active)) return 'core';
    if (['orders', 'chat', 'team-messages', 'reviews'].includes(active)) return 'crm';
    if (['settings'].includes(active)) return 'appearance';
    if (['sponsorships'].includes(active)) return 'marketing';
    if (['hr', 'accounting', 'procurement', 'stock-requests', 'audit-log'].includes(active)) return 'advanced';

    return null;
};

const getInitialExpandedGroups = (active) => {
    const defaultGroups = {
        workspace: true,
        core: true,
        crm: true,
        appearance: true,
        marketing: true,
        advanced: true,
    };

    if (typeof window === 'undefined') {
        return defaultGroups;
    }

    try {
        const raw = window.localStorage.getItem(GROUPS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        const activeGroup = resolveActiveGroup(active);

        if (parsed && typeof parsed === 'object') {
            return {
                ...defaultGroups,
                ...parsed,
                ...(activeGroup ? { [activeGroup]: true } : {}),
            };
        }
    } catch {
        // Ignore invalid localStorage data.
    }

    return defaultGroups;
};

export default function SellerSidebar({ active, user, mobileOpen = false, onClose = () => {} }) {
    const { sellerSubscription, sellerSidebar, attendance } = usePage().props;

    const currentTierKey = sellerSubscription?.tierKey
        || sellerSidebar?.tierKey
        || (user?.premium_tier === 'super_premium'
            ? 'super_premium'
            : user?.premium_tier === 'premium'
                ? 'premium'
                : 'free');
    const isElite = currentTierKey === 'super_premium';
    const isPremium = currentTierKey === 'premium';

    const entitlement = useMemo(() => {
        if (sellerSidebar) return sellerSidebar;

        return {
            tierLabel: isElite ? 'Elite' : isPremium ? 'Premium' : 'Standard',
            visibleModules: isElite
                ? ['overview', 'products', 'analytics', '3d', 'orders', 'messages', 'reviews', 'shop_settings', 'sponsorships', 'hr', 'accounting', 'procurement', 'stock_requests']
                : isPremium
                    ? ['overview', 'products', 'analytics', '3d', 'orders', 'messages', 'reviews', 'shop_settings', 'procurement', 'stock_requests']
                    : ['overview', 'products', 'analytics', '3d', 'orders', 'messages', 'reviews', 'shop_settings'],
            toggleableModules: isElite || isPremium ? ['hr', 'accounting', 'procurement'] : [],
            enabledToggleableModules: isElite ? ['hr', 'accounting', 'procurement'] : ['procurement'],
            showGear: user?.role === 'artisan' && (isElite || isPremium),
            allModulesUnlocked: isElite,
            canManageSubscription: user?.role === 'artisan',
            showPlanPanel: user?.role === 'artisan',
        };
    }, [isElite, isPremium, sellerSidebar, user?.role]);

    const visibleModulesSet = useMemo(() => new Set(entitlement.visibleModules || []), [entitlement.visibleModules]);
    const showGear = !!entitlement.showGear;
    const canManagePlan = sellerSubscription?.canManageSubscription ?? entitlement.canManageSubscription ?? user?.role === 'artisan';
    const showPlanPanel = sellerSubscription?.showPlanPanel ?? entitlement.showPlanPanel ?? user?.role === 'artisan';
    const isStaffActor = (entitlement.actorType || (user?.role === 'staff' ? 'staff' : 'owner')) === 'staff';

    const enabledToggles = useMemo(() => {
        return {
            hr: isElite || visibleModulesSet.has('hr'),
            accounting: isElite || visibleModulesSet.has('accounting'),
            procurement: isElite || visibleModulesSet.has('procurement') || visibleModulesSet.has('stock_requests'),
        };
    }, [isElite, visibleModulesSet]);
    const hasActiveAttendanceSession = !isStaffActor || !!attendance?.has_open_session;

    const [modules, setModules] = useState(enabledToggles);
    const [showModulePanel, setShowModulePanel] = useState(false);
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [showGearHint, setShowGearHint] = useState(false);

    const [expandedGroups, setExpandedGroups] = useState(() => getInitialExpandedGroups(active));

    useEffect(() => {
        setModules(enabledToggles);
    }, [enabledToggles]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(expandedGroups));
    }, [expandedGroups]);

    useEffect(() => {
        if (!showGear || !user?.id || typeof window === 'undefined') return;
        const key = `${GEAR_HINT_STORAGE_KEY}_${user.id}`;
        const hasSeen = window.localStorage.getItem(key);
        if (!hasSeen) {
            setShowGearHint(true);
        }
    }, [showGear, user?.id]);

    const dismissGearHint = () => {
        if (typeof window !== 'undefined' && user?.id) {
            window.localStorage.setItem(`${GEAR_HINT_STORAGE_KEY}_${user.id}`, '1');
        }
        setShowGearHint(false);
    };

    const toggleGroup = (key) => {
        setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleModule = (moduleName) => {
        if (!showGear || isElite) return;
        if (moduleName === 'procurement') return;

        const newState = !modules[moduleName];
        const newModules = { ...modules, [moduleName]: newState };
        setModules(newModules);

        router.post(route('settings.modules'), newModules, {
            preserveScroll: true,
            preserveState: true,
            onError: () => {
                setModules(prev => ({ ...prev, [moduleName]: !newState }));
                console.error("Failed to save module settings");
            }
        });
    };

    const hasCore = (!isStaffActor || hasActiveAttendanceSession) && (isStaffActor
        ? ['products', 'analytics', '3d'].some((moduleName) => visibleModulesSet.has(moduleName))
        : ['overview', 'products', 'analytics', '3d'].some((moduleName) => visibleModulesSet.has(moduleName)));
    const hasCrm = (!isStaffActor || hasActiveAttendanceSession) && ['orders', 'messages', 'team_messages', 'reviews'].some((moduleName) => visibleModulesSet.has(moduleName));
    const hasAppearance = (!isStaffActor || hasActiveAttendanceSession) && visibleModulesSet.has('shop_settings');
    const hasMarketing = (!isStaffActor || hasActiveAttendanceSession) && visibleModulesSet.has('sponsorships');
    const canViewAuditLog = !isStaffActor && user?.role === 'artisan';
    const hasAdvanced = (!isStaffActor || hasActiveAttendanceSession) && (
        ['hr', 'accounting', 'procurement', 'stock_requests'].some(moduleName => visibleModulesSet.has(moduleName))
        || canViewAuditLog
    );
    const activeModuleCount = [modules.hr, modules.accounting, modules.procurement].filter(Boolean).length;

    return (
        <>
            <StaffAttendanceMonitor />

            {mobileOpen && (
                <div 
                    className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
                    onClick={onClose}
                />
            )}

            <aside className={`fixed inset-y-0 left-0 z-50 w-52 bg-white/70 backdrop-blur-md border-r border-clay-100/50 flex flex-col transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="relative flex shrink-0 items-center justify-between border-b border-clay-100/30 bg-transparent px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                        <img 
                            src="/images/logo.png" 
                            alt="LikhangKamay" 
                            className="w-6 h-6 object-contain shrink-0"
                        />
                        <span className="font-serif text-base font-bold text-gray-900 tracking-tight truncate">LikhangKamay</span>
                    </div>

                    <button onClick={onClose} aria-label="Close sidebar" className="lg:hidden rounded-lg p-1 text-gray-400 transition-colors hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30">
                        <X size={20} />
                    </button>

                    {showGear && (
                        <div className="hidden lg:block ml-auto relative">
                            <button 
                                onClick={() => {
                                    setShowModulePanel(!showModulePanel);
                                    if (showGearHint) dismissGearHint();
                                }}
                                aria-label={showModulePanel ? 'Hide module settings' : 'Show module settings'}
                                className={`relative rounded-lg p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30 ${showModulePanel ? 'bg-clay-600 text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-clay-600'}`}
                                title="Enable Capabilities"
                            >
                                <Settings size={14} />
                                {activeModuleCount > 0 && !showModulePanel && (
                                    <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] bg-clay-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                                        {activeModuleCount}
                                    </span>
                                )}
                            </button>

                            {showGearHint && (
                                <div className="absolute right-0 top-8 z-[80] w-44 rounded-lg bg-gray-900 p-2 text-[10px] font-medium text-white">
                                    Use this gear to enable extra capabilities.
                                    <button
                                        onClick={dismissGearHint}
                                        aria-label="Dismiss module settings hint"
                                        className="block mt-1.5 text-[9px] text-gray-300 hover:text-white"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {showGear && showModulePanel && (
                    <>
                        <div 
                            className="fixed inset-0 z-[60]" 
                            onClick={() => setShowModulePanel(false)}
                        />
                        
                        <div className="absolute left-2 right-2 top-16 z-[70] rounded-2xl border border-gray-100 bg-white p-5 lg:left-full lg:right-auto lg:top-4 lg:ml-4 lg:w-72">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900">Enable Capabilities</h3>
                                    <p className="text-[10px] text-gray-400 font-medium">Turn additional capabilities on for your shop.</p>
                                </div>
                                <button 
                                    onClick={() => setShowModulePanel(false)}
                                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            
                            <div className="space-y-2">
                                <ModuleToggle 
                                    label="People & Payroll" 
                                    description={isElite ? "Always enabled in Elite." : "Manage employees, payroll prep, and workspace access."}
                                    icon={Users}
                                    enabled={modules.hr} 
                                    onToggle={() => toggleModule('hr')} 
                                    locked={isElite}
                                    color="bg-purple-100 text-purple-600"
                                />
                                <ModuleToggle 
                                    label="Finance Approvals" 
                                    description={isElite ? "Always enabled in Elite." : "Review funds, payroll requests, and finance records."}
                                    icon={Banknote}
                                    enabled={modules.accounting} 
                                    onToggle={() => toggleModule('accounting')} 
                                    locked={isElite}
                                    color="bg-blue-100 text-blue-600"
                                />
                                <ModuleToggle 
                                    label="Inventory" 
                                    description={isElite ? "Always enabled in Elite." : "Required for inventory tracking and restock requests."}
                                    icon={Warehouse}
                                    enabled={modules.procurement} 
                                    onToggle={() => toggleModule('procurement')}
                                    locked
                                    color="bg-amber-100 text-amber-600"
                                />
                            </div>

                            <div className="mt-4 border-t border-gray-50 pt-3">
                                <p className="text-[10px] text-gray-400 text-center flex items-center justify-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Changes save automatically
                                </p>
                            </div>
                        </div>
                    </>
                )}

                {showPlanPanel && (
                    <>
                        <div className="border-b border-clay-100/30 bg-stone-50/10 px-5 py-3 flex-shrink-0">
                            <button type="button" onClick={() => setIsPlanModalOpen(true)} className="block group w-full text-left">
                                <div className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${isElite ? 'bg-violet-50 border-violet-200 text-violet-800 group-hover:bg-violet-100' : isPremium ? 'bg-amber-50 border-amber-200 text-amber-800 group-hover:bg-amber-100' : 'bg-stone-100 border-stone-200 text-stone-700 group-hover:bg-stone-200'}`}>
                                    {isElite ? (
                                        <Sparkles size={13} className="text-violet-500 fill-violet-200" />
                                    ) : isPremium ? (
                                        <Crown size={13} className="text-amber-500 fill-amber-200" />
                                    ) : (
                                        <Zap size={13} className="text-stone-400 fill-stone-200" />
                                    )}
                                    <span className="tracking-wide">{entitlement.tierLabel} Plan</span>
                                </div>
                                
                                {sellerSubscription && (
                                    <div className="flex flex-col gap-1.5 mt-2.5">
                                        <div className="flex items-center justify-between text-[10px] text-stone-500 font-medium group-hover:text-stone-700 transition-colors">
                                            <span>Active Products</span>
                                            <span>
                                                <strong className="text-stone-900">{sellerSubscription.activeCount}</strong> / {sellerSubscription.limit}
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-stone-200/80 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-[width] duration-500 ${
                                                    sellerSubscription.activeCount >= sellerSubscription.limit 
                                                        ? 'bg-red-500' 
                                                        : isElite 
                                                            ? 'bg-violet-500' 
                                                            : isPremium 
                                                                ? 'bg-amber-500' 
                                                                : 'bg-stone-500'
                                                }`}
                                                style={{ width: `${Math.min(100, (sellerSubscription.activeCount / sellerSubscription.limit) * 100)}%` }}
                                            />
                                        </div>
                                        {sellerSubscription.activeCount >= sellerSubscription.limit && !isElite && (
                                            <span className="text-[9px] text-red-500 font-medium leading-tight mt-0.5">
                                                {canManagePlan
                                                    ? 'Product limit reached. Upgrade to add more.'
                                                    : 'Product limit reached. Only the shop owner can upgrade.'}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </button>
                        </div>

                        <PlanModal 
                            isOpen={isPlanModalOpen} 
                            onClose={() => setIsPlanModalOpen(false)} 
                            currentTier={sellerSubscription?.tierKey || entitlement.tierKey || currentTierKey}
                            canManagePlan={canManagePlan}
                        />
                    </>
                )}

                <nav scroll-region="true" className="flex-1 overflow-y-auto px-3 py-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                    {isStaffActor && (
                        <CategoryGroup
                            title="Workspace"
                            open={expandedGroups.workspace}
                            onToggle={() => toggleGroup('workspace')}
                        >
                            <NavItem href={route('staff.dashboard')} icon={LayoutDashboard} active={active === 'staff-dashboard'} onClick={onClose}>Staff Hub</NavItem>
                        </CategoryGroup>
                    )}

                    {hasCore && (
                        <div>
                            <CategoryGroup
                                title="Core Operations"
                                open={expandedGroups.core}
                                onToggle={() => toggleGroup('core')}
                            >
                                {!isStaffActor && visibleModulesSet.has('overview') && (
                                    <NavItem href={route('dashboard')} icon={LayoutDashboard} active={active === 'overview'} onClick={onClose}>Overview</NavItem>
                                )}
                                {visibleModulesSet.has('products') && (
                                    <NavItem href={route('products.index')} icon={Package} active={active === 'products'} onClick={onClose}>Products</NavItem>
                                )}
                                {visibleModulesSet.has('analytics') && (
                                    <NavItem href={route('analytics.index')} icon={BarChart3} active={active === 'analytics'} onClick={onClose}>Analytics</NavItem>
                                )}
                                {visibleModulesSet.has('3d') && (
                                    <NavItem href={route('3d.index')} icon={Box} active={active === '3d'} onClick={onClose}>3D Manager</NavItem>
                                )}
                            </CategoryGroup>
                        </div>
                    )}

                    {hasCrm && (
                        <div>
                            <CategoryGroup
                                title="Sales & Support"
                                open={expandedGroups.crm}
                                onToggle={() => toggleGroup('crm')}
                            >
                                {visibleModulesSet.has('orders') && (
                                    <NavItem href={route('orders.index')} icon={ShoppingBag} active={active === 'orders'} onClick={onClose}>Orders</NavItem>
                                )}
                                {visibleModulesSet.has('messages') && (
                                    <NavItem href={route('chat.index')} icon={MessageCircle} active={active === 'chat'} onClick={onClose}>Messages</NavItem>
                                )}
                                {visibleModulesSet.has('team_messages') && (
                                    <NavItem href={route('team-messages.index')} icon={Users} active={active === 'team-messages'} onClick={onClose}>Team Inbox</NavItem>
                                )}
                                {visibleModulesSet.has('reviews') && (
                                    <NavItem href={route('reviews.index')} icon={Star} active={active === 'reviews'} onClick={onClose}>Reviews</NavItem>
                                )}
                            </CategoryGroup>
                        </div>
                    )}

                    {hasAppearance && (
                        <div>
                            <CategoryGroup
                                title="Shop Appearance"
                                open={expandedGroups.appearance}
                                onToggle={() => toggleGroup('appearance')}
                            >
                                {visibleModulesSet.has('shop_settings') && (
                                    <NavItem href={route('shop.settings')} icon={Sliders} active={active === 'settings'} onClick={onClose}>Shop Settings</NavItem>
                                )}
                            </CategoryGroup>
                        </div>
                    )}

                    {hasMarketing && (
                        <div>
                            <CategoryGroup
                                title="Marketing"
                                open={expandedGroups.marketing}
                                onToggle={() => toggleGroup('marketing')}
                            >
                                <NavItem href={route('seller.sponsorships')} icon={Award} active={active === 'sponsorships'} onClick={onClose}>Sponsorships</NavItem>
                            </CategoryGroup>
                        </div>
                    )}

                    {hasAdvanced && (
                        <div>
                            <CategoryGroup
                                title="Business Capabilities"
                                open={expandedGroups.advanced}
                                onToggle={() => toggleGroup('advanced')}
                            >
                                {visibleModulesSet.has('hr') && (
                                    <NavItem href={route('hr.index')} icon={Users} active={active === 'hr'} onClick={onClose}>People & Payroll</NavItem>
                                )}
                                {visibleModulesSet.has('accounting') && (
                                    <NavItem href={route('accounting.index')} icon={Banknote} active={active === 'accounting'} onClick={onClose}>Finance</NavItem>
                                )}
                                {canViewAuditLog && (
                                    <NavItem href={route('audit-log.index')} icon={ClipboardList} active={active === 'audit-log'} onClick={onClose}>Audit Log</NavItem>
                                )}
                                {(visibleModulesSet.has('procurement') || visibleModulesSet.has('stock_requests')) && (
                                    <div className="space-y-0.5">
                                        <p className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                            <ClipboardList size={11} /> Inventory   
                                        </p>
                                        <div className="pl-2 space-y-0.5">
                                            {visibleModulesSet.has('procurement') && (
                                                <NavItem href={route('procurement.index')} icon={Warehouse} active={active === 'procurement'} compact onClick={onClose}>Inventory</NavItem>
                                            )}
                                            {visibleModulesSet.has('stock_requests') && (
                                                <NavItem href={route('stock-requests.index')} icon={FileQuestion} active={active === 'stock-requests'} compact onClick={onClose}>Restock Requests</NavItem>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CategoryGroup>
                        </div>
                    )}
                </nav>

                {isStaffActor && (
                    <div className="border-t border-gray-100 px-3 py-3">
                        <StaffAttendanceDock attendance={attendance} />
                    </div>
                )}
            </aside>
        </>
    );
}
