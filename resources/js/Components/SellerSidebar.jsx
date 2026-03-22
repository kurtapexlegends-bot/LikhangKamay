import React, { useEffect, useMemo, useState } from 'react'; 
import { Link, router, usePage } from '@inertiajs/react';
import { 
    LayoutDashboard, Package, ShoppingBag, BarChart3, Box, 
    Users, MessageCircle, Settings, X,
    ClipboardList, Warehouse, FileQuestion, Sliders, Wallet, Star, Award, Crown, Sparkles, Zap, ChevronRight
} from 'lucide-react';
import { PlanModal } from './PlanBadge';

const GROUPS_STORAGE_KEY = 'seller_sidebar_expanded_groups_v1';
const GEAR_HINT_STORAGE_KEY = 'seller_sidebar_gear_hint_seen_v1';
const resolveActiveGroup = (active) => {
    if (['overview', 'products', 'analytics', '3d'].includes(active)) return 'core';
    if (['orders', 'chat', 'reviews'].includes(active)) return 'crm';
    if (['settings'].includes(active)) return 'appearance';
    if (['sponsorships'].includes(active)) return 'marketing';
    if (['hr', 'accounting', 'procurement', 'stock-requests'].includes(active)) return 'advanced';

    return null;
};

const getInitialExpandedGroups = (active) => {
    const defaultGroups = {
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
    const { sellerSubscription, sellerSidebar } = usePage().props;

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

    const enabledToggles = useMemo(() => {
        return {
            hr: isElite || visibleModulesSet.has('hr'),
            accounting: isElite || visibleModulesSet.has('accounting'),
            procurement: isElite || visibleModulesSet.has('procurement') || visibleModulesSet.has('stock_requests'),
        };
    }, [isElite, visibleModulesSet]);

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

    const hasCore = ['overview', 'products', 'analytics', '3d'].some((moduleName) => visibleModulesSet.has(moduleName));
    const hasCrm = ['orders', 'messages', 'reviews'].some((moduleName) => visibleModulesSet.has(moduleName));
    const hasAppearance = visibleModulesSet.has('shop_settings');
    const hasMarketing = visibleModulesSet.has('sponsorships');
    const hasAdvanced = ['hr', 'accounting', 'procurement', 'stock_requests'].some(moduleName => visibleModulesSet.has(moduleName));
    const activeModuleCount = [modules.hr, modules.accounting, modules.procurement].filter(Boolean).length;

    return (
        <>
            {mobileOpen && (
                <div 
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
                    onClick={onClose}
                />
            )}

            <aside className={`fixed inset-y-0 left-0 z-50 w-56 bg-white border-r border-clay-100 flex flex-col transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="px-5 py-3 border-b border-gray-50 shrink-0 bg-white/50 backdrop-blur-sm relative flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <img 
                            src="/images/logo.png" 
                            alt="LikhangKamay" 
                            className="w-7 h-7 object-contain"
                        />
                        <span className="font-serif text-lg font-bold text-gray-900 tracking-tight">LikhangKamay</span>
                    </div>

                    <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>

                    {showGear && (
                        <div className="hidden lg:block ml-auto relative">
                            <button 
                                onClick={() => {
                                    setShowModulePanel(!showModulePanel);
                                    if (showGearHint) dismissGearHint();
                                }}
                                className={`p-1.5 rounded-lg transition-all relative ${showModulePanel ? 'bg-clay-600 text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-clay-600'} ${showGearHint ? 'animate-pulse' : ''}`}
                                title="Customize Modules"
                            >
                                <Settings size={14} />
                                {activeModuleCount > 0 && !showModulePanel && (
                                    <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] bg-clay-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                                        {activeModuleCount}
                                    </span>
                                )}
                            </button>

                            {showGearHint && (
                                <div className="absolute top-8 right-0 w-44 p-2 rounded-lg bg-gray-900 text-white text-[10px] font-medium shadow-lg animate-in fade-in slide-in-from-top-1 duration-200 z-[80]">
                                    Use this gear to enable extra modules.
                                    <button
                                        onClick={dismissGearHint}
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
                        
                        <div className="absolute top-16 left-2 right-2 lg:top-4 lg:left-full lg:right-auto lg:ml-4 lg:w-72 z-[70] bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 animate-in fade-in slide-in-from-left-2 duration-200">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900">Customize Modules</h3>
                                    <p className="text-[10px] text-gray-400 font-medium">Toggle features for your shop.</p>
                                </div>
                                <button 
                                    onClick={() => setShowModulePanel(false)}
                                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            
                            <div className="space-y-2">
                                <ModuleToggle 
                                    label="HR & Payroll" 
                                    description={isElite ? "Always enabled in Elite." : "Manage employees, attendance, and payslips."}
                                    icon={Users}
                                    enabled={modules.hr} 
                                    onToggle={() => toggleModule('hr')} 
                                    locked={isElite}
                                    color="bg-purple-100 text-purple-600"
                                />
                                <ModuleToggle 
                                    label="Accounting" 
                                    description={isElite ? "Always enabled in Elite." : "Track revenue, expenses, and fund requests."}
                                    icon={Wallet}
                                    enabled={modules.accounting} 
                                    onToggle={() => toggleModule('accounting')} 
                                    locked={isElite}
                                    color="bg-blue-100 text-blue-600"
                                />
                                <ModuleToggle 
                                    label="Procurement" 
                                    description={isElite ? "Always enabled in Elite." : "Required for inventory and stock requests."}
                                    icon={Warehouse}
                                    enabled={modules.procurement} 
                                    onToggle={() => toggleModule('procurement')}
                                    locked
                                    color="bg-amber-100 text-amber-600"
                                />
                            </div>

                            <div className="mt-4 pt-3 border-t border-gray-50">
                                <p className="text-[10px] text-gray-400 text-center flex items-center justify-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Changes save automatically
                                </p>
                            </div>
                        </div>
                    </>
                )}

                {showPlanPanel && (
                    <>
                        <div className="px-5 py-3 border-b flex-shrink-0 border-gray-50 bg-stone-50/30">
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
                                                className={`h-full rounded-full transition-all duration-500 ${
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

                <nav className="flex-1 px-3 py-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                    {hasCore && (
                        <CategoryGroup
                            title="Core Operations"
                            open={expandedGroups.core}
                            onToggle={() => toggleGroup('core')}
                        >
                            {visibleModulesSet.has('overview') && (
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
                    )}

                    {hasCrm && (
                        <CategoryGroup
                            title="CRM"
                            open={expandedGroups.crm}
                            onToggle={() => toggleGroup('crm')}
                        >
                            {visibleModulesSet.has('orders') && (
                                <NavItem href={route('orders.index')} icon={ShoppingBag} active={active === 'orders'} onClick={onClose}>Orders</NavItem>
                            )}
                            {visibleModulesSet.has('messages') && (
                                <NavItem href={route('chat.index')} icon={MessageCircle} active={active === 'chat'} onClick={onClose}>Messages</NavItem>
                            )}
                            {visibleModulesSet.has('reviews') && (
                                <NavItem href={route('reviews.index')} icon={Star} active={active === 'reviews'} onClick={onClose}>Reviews</NavItem>
                            )}
                        </CategoryGroup>
                    )}

                    {hasAppearance && (
                        <CategoryGroup
                            title="Shop Appearance"
                            open={expandedGroups.appearance}
                            onToggle={() => toggleGroup('appearance')}
                        >
                            {visibleModulesSet.has('shop_settings') && (
                                <NavItem href={route('shop.settings')} icon={Sliders} active={active === 'settings'} onClick={onClose}>Shop Settings</NavItem>
                            )}
                        </CategoryGroup>
                    )}

                    {hasMarketing && (
                        <CategoryGroup
                            title="Marketing"
                            open={expandedGroups.marketing}
                            onToggle={() => toggleGroup('marketing')}
                        >
                            <NavItem href={route('seller.sponsorships')} icon={Award} active={active === 'sponsorships'} onClick={onClose}>Sponsorships</NavItem>
                        </CategoryGroup>
                    )}

                    {hasAdvanced && (
                        <CategoryGroup
                            title="Advanced Modules"
                            open={expandedGroups.advanced}
                            onToggle={() => toggleGroup('advanced')}
                        >
                            {visibleModulesSet.has('hr') && (
                                <NavItem href={route('hr.index')} icon={Users} active={active === 'hr'} onClick={onClose}>HR</NavItem>
                            )}
                            {visibleModulesSet.has('accounting') && (
                                <NavItem href={route('accounting.index')} icon={Wallet} active={active === 'accounting'} onClick={onClose}>Accounting</NavItem>
                            )}
                            {(visibleModulesSet.has('procurement') || visibleModulesSet.has('stock_requests')) && (
                                <div className="space-y-0.5">
                                    <p className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                        <ClipboardList size={11} /> Procurement
                                    </p>
                                    <div className="pl-2 space-y-0.5">
                                        {visibleModulesSet.has('procurement') && (
                                            <NavItem href={route('procurement.index')} icon={Warehouse} active={active === 'procurement'} compact onClick={onClose}>Inventory</NavItem>
                                        )}
                                        {visibleModulesSet.has('stock_requests') && (
                                            <NavItem href={route('stock-requests.index')} icon={FileQuestion} active={active === 'stock-requests'} compact onClick={onClose}>Stock Requests</NavItem>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CategoryGroup>
                    )}
                </nav>
            </aside>
        </>
    );
}

const CategoryGroup = ({ title, open, onToggle, children }) => (
    <div className="mt-3 first:mt-1">
        <button
            type="button"
            onClick={onToggle}
            className="w-full px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between hover:text-gray-500 transition-colors"
        >
            <span>{title}</span>
            <ChevronRight
                size={13}
                className={`transition-transform duration-300 ${open ? 'rotate-90' : ''}`}
            />
        </button>
        {open && (
            <div className="space-y-0.5 pt-0.5">
                {children}
            </div>
        )}
    </div>
);

const ModuleToggle = ({ label, description, enabled, onToggle, icon: Icon, color, locked = false }) => (
    <div 
        onClick={locked ? undefined : onToggle}
        className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-200 border ${enabled ? 'bg-clay-50 border-clay-100' : 'bg-white border-transparent'} ${locked ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}
    >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${enabled ? color : 'bg-gray-100 text-gray-400'}`}>
            {Icon && <Icon size={16} />}
        </div>

        <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
                <span className={`text-xs font-bold transition-colors ${enabled ? 'text-gray-900' : 'text-gray-500'}`}>
                    {label}
                </span>
                
                <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-300 ease-in-out flex-shrink-0 relative ${enabled ? 'bg-clay-600' : 'bg-gray-200'}`}>
                    <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${enabled ? 'translate-x-3.5' : 'translate-x-0'}`}></div>
                </div>
            </div>
            <p className="text-[10px] text-gray-400 leading-tight pr-2">{description}</p>
        </div>
    </div>
);

const NavItem = ({ href, icon: Icon, active, children, compact, onClick }) => (
    <Link 
        href={href} 
        onClick={onClick}
        className={`flex items-center gap-3 px-4 ${compact ? 'py-2' : 'py-2.5'} rounded-lg text-xs font-bold transition-all duration-200 ${active ? 'bg-clay-600 text-white shadow-md shadow-clay-200' : 'text-gray-500 hover:bg-clay-50 hover:text-clay-700'}`}
    >
        <Icon size={compact ? 16 : 18} strokeWidth={2.5} className={active ? 'text-white' : 'text-gray-400 group-hover:text-clay-600'} />
        {children}
    </Link>
);
