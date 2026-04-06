import React, { useEffect, useMemo, useRef, useState } from 'react'; 
import { Link, router, usePage } from '@inertiajs/react';
import StaffAttendanceMonitor from '@/Components/StaffAttendanceMonitor';
import ConfirmationModal from '@/Components/ConfirmationModal';
import { 
    LayoutDashboard, Package, ShoppingBag, BarChart3, Box, 
    Users, MessageCircle, Settings, X,
    ClipboardList, Warehouse, FileQuestion, Sliders, Banknote, Star, Award, Crown, Sparkles, Zap, ChevronRight, Clock3, PauseCircle, LogOut, ChevronUp, PlayCircle
} from 'lucide-react';
import { PlanModal } from './PlanBadge';

const GROUPS_STORAGE_KEY = 'seller_sidebar_expanded_groups_v1';
const GEAR_HINT_STORAGE_KEY = 'seller_sidebar_gear_hint_seen_v1';
const resolveActiveGroup = (active) => {
    if (['staff-dashboard'].includes(active)) return 'workspace';
    if (['overview', 'wallet', 'products', 'analytics', '3d'].includes(active)) return 'core';
    if (['orders', 'chat', 'team-messages', 'reviews'].includes(active)) return 'crm';
    if (['settings'].includes(active)) return 'appearance';
    if (['sponsorships'].includes(active)) return 'marketing';
    if (['hr', 'accounting', 'procurement', 'stock-requests'].includes(active)) return 'advanced';

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
                ? ['overview', 'wallet', 'products', 'analytics', '3d', 'orders', 'messages', 'reviews', 'shop_settings', 'sponsorships', 'hr', 'accounting', 'procurement', 'stock_requests']
                : isPremium
                    ? ['overview', 'wallet', 'products', 'analytics', '3d', 'orders', 'messages', 'reviews', 'shop_settings', 'procurement', 'stock_requests']
                    : ['overview', 'wallet', 'products', 'analytics', '3d', 'orders', 'messages', 'reviews', 'shop_settings'],
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
        ? ['wallet', 'products', 'analytics', '3d'].some((moduleName) => visibleModulesSet.has(moduleName))
        : ['overview', 'wallet', 'products', 'analytics', '3d'].some((moduleName) => visibleModulesSet.has(moduleName)));
    const hasCrm = (!isStaffActor || hasActiveAttendanceSession) && ['orders', 'messages', 'team_messages', 'reviews'].some((moduleName) => visibleModulesSet.has(moduleName));
    const hasAppearance = (!isStaffActor || hasActiveAttendanceSession) && visibleModulesSet.has('shop_settings');
    const hasMarketing = (!isStaffActor || hasActiveAttendanceSession) && visibleModulesSet.has('sponsorships');
    const hasAdvanced = (!isStaffActor || hasActiveAttendanceSession) && ['hr', 'accounting', 'procurement', 'stock_requests'].some(moduleName => visibleModulesSet.has(moduleName));
    const activeModuleCount = [modules.hr, modules.accounting, modules.procurement].filter(Boolean).length;

    return (
        <>
            <StaffAttendanceMonitor />

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
                                    icon={Banknote}
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
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                            <CategoryGroup
                                title="Core Operations"
                                open={expandedGroups.core}
                                onToggle={() => toggleGroup('core')}
                            >
                                {!isStaffActor && visibleModulesSet.has('overview') && (
                                    <NavItem href={route('dashboard')} icon={LayoutDashboard} active={active === 'overview'} onClick={onClose}>Overview</NavItem>
                                )}
                                {visibleModulesSet.has('wallet') && (
                                    <NavItem href={route('seller.wallet.index')} icon={Banknote} active={active === 'wallet'} onClick={onClose}>Wallet</NavItem>
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
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
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
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
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
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
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
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                            <CategoryGroup
                                title="Advanced Modules"
                                open={expandedGroups.advanced}
                                onToggle={() => toggleGroup('advanced')}
                            >
                                {visibleModulesSet.has('hr') && (
                                    <NavItem href={route('hr.index')} icon={Users} active={active === 'hr'} onClick={onClose}>HR</NavItem>
                                )}
                                {visibleModulesSet.has('accounting') && (
                                    <NavItem href={route('accounting.index')} icon={Banknote} active={active === 'accounting'} onClick={onClose}>Accounting</NavItem>
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

const StaffAttendanceDock = ({ attendance }) => {
    const [open, setOpen] = useState(false);
    const [processingAction, setProcessingAction] = useState(null);
    const [showBreakConfirm, setShowBreakConfirm] = useState(false);
    const [timerNow, setTimerNow] = useState(() => Date.now());
    const containerRef = useRef(null);
    const hasOpenSession = !!attendance?.has_open_session;
    const isPaused = attendance?.current_state === 'paused';

    useEffect(() => {
        if (!open) return undefined;

        const handlePointerDown = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
        };
    }, [open]);

    useEffect(() => {
        if (!open || (!attendance?.active_session_started_at && !attendance?.break_started_at)) {
            return undefined;
        }

        const interval = window.setInterval(() => {
            setTimerNow(Date.now());
        }, 1000);

        return () => {
            window.clearInterval(interval);
        };
    }, [attendance?.active_session_started_at, attendance?.break_started_at, open]);

    const firstClockInLabel = attendance?.today_first_clock_in
        ? new Intl.DateTimeFormat('en-PH', {
            hour: 'numeric',
            minute: '2-digit',
        }).format(new Date(attendance.today_first_clock_in))
        : null;
    const breakStartedLabel = attendance?.break_started_at
        ? new Intl.DateTimeFormat('en-PH', {
            hour: 'numeric',
            minute: '2-digit',
        }).format(new Date(attendance.break_started_at))
        : null;
    const activeDurationLabel = formatWorkedDayTimer(
        attendance?.today_worked_seconds_base,
        attendance?.active_session_started_at,
        hasOpenSession,
        timerNow,
    );
    const breakDurationLabel = isPaused && attendance?.break_started_at
        ? formatElapsedTimer(attendance.break_started_at, timerNow)
        : null;

    const startBreak = () => {
        if (processingAction) return;

        setProcessingAction('pause');
        router.post(route('staff.attendance.break'), {}, {
            preserveScroll: true,
            onFinish: () => {
                setProcessingAction(null);
                setOpen(false);
                setShowBreakConfirm(false);
            },
        });
    };

    const clockOut = () => {
        if (processingAction) return;

        setProcessingAction('clock_out');
        router.post(route('staff.logout'), { action: 'clock_out' }, {
            preserveScroll: true,
            onFinish: () => {
                setProcessingAction(null);
                setOpen(false);
            },
        });
    };

    const resumeWork = () => {
        if (processingAction) return;

        setProcessingAction('clock_in');
        router.post(route('staff.attendance.resume'), {}, {
            preserveScroll: true,
            onFinish: () => {
                setProcessingAction(null);
                setOpen(false);
            },
        });
    };

    const handlePrimaryClick = () => {
        if (processingAction) return;

        if (isPaused) {
            setOpen((current) => !current);
            return;
        }

        if (!hasOpenSession) {
            resumeWork();
            return;
        }

        setOpen((current) => !current);
    };

    return (
        <div ref={containerRef} className="relative">
            {open && (hasOpenSession || isPaused) && (
                <div className="absolute inset-x-0 bottom-[calc(100%+0.6rem)] rounded-2xl border border-clay-100 bg-white p-2 shadow-[0_20px_45px_-28px_rgba(120,79,46,0.38)]">
                    <div className={`rounded-xl border px-3 py-2.5 ${hasOpenSession ? 'border-emerald-100 bg-emerald-50/70' : 'border-amber-100 bg-amber-50/70'}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${hasOpenSession ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {hasOpenSession ? 'Clocked In' : 'On Break'}
                        </p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-stone-900">
                                {hasOpenSession ? 'Active session' : 'Break in progress'}
                            </span>
                        </div>
                        <div className="mt-2 grid gap-1.5 rounded-xl border border-white/70 bg-white/80 px-2.5 py-2">
                            {firstClockInLabel && (
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-medium text-stone-500">
                                        Clocked in at
                                    </span>
                                    <span className="text-xs font-bold text-stone-900">
                                        {firstClockInLabel}
                                    </span>
                                </div>
                            )}
                            {activeDurationLabel && (
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-medium text-stone-500">
                                        Active for
                                    </span>
                                    <span className={`rounded-full border bg-white px-2 py-0.5 font-mono text-[11px] font-bold ${hasOpenSession ? 'border-emerald-200 text-emerald-700' : 'border-amber-200 text-amber-700'}`}>
                                        {activeDurationLabel}
                                    </span>
                                </div>
                            )}
                            {isPaused && breakStartedLabel && (
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-medium text-stone-500">
                                        Break started at
                                    </span>
                                    <span className="text-xs font-bold text-stone-900">
                                        {breakStartedLabel}
                                    </span>
                                </div>
                            )}
                            {isPaused && breakDurationLabel && (
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-medium text-stone-500">
                                        On break for
                                    </span>
                                    <span className="rounded-full border border-amber-200 bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-amber-700">
                                        {breakDurationLabel}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-2 grid gap-1.5">
                        <AttendanceActionButton
                            icon={hasOpenSession ? PauseCircle : PlayCircle}
                            label={
                                hasOpenSession
                                    ? (processingAction === 'pause' ? 'Starting Break' : 'Take Break')
                                    : (processingAction === 'clock_in' ? 'Resuming Work' : 'Resume Work')
                            }
                            disabled={!!processingAction}
                            onClick={() => {
                                if (hasOpenSession) {
                                    setShowBreakConfirm(true);
                                    return;
                                }

                                resumeWork();
                            }}
                        />
                        <AttendanceActionButton
                            icon={LogOut}
                            label={processingAction === 'clock_out' ? 'Clocking Out' : 'Clock Out'}
                            disabled={!!processingAction}
                            onClick={clockOut}
                            tone="danger"
                        />
                    </div>
                </div>
            )}

            <button
                type="button"
                onClick={handlePrimaryClick}
                disabled={!!processingAction}
                className={`flex w-full items-center justify-between gap-2 rounded-xl border px-2.5 py-2 text-left transition-all ${
                    hasOpenSession
                        ? 'border-emerald-200 bg-emerald-50/80 hover:bg-emerald-50'
                        : 'border-clay-200 bg-[#FCF7F2] hover:bg-clay-50'
                } ${processingAction ? 'cursor-wait opacity-70' : ''}`}
            >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        hasOpenSession ? 'bg-emerald-100 text-emerald-700' : 'bg-clay-100 text-clay-700'
                    }`}>
                        <Clock3 size={16} strokeWidth={2.5} />
                    </div>
                    <span className="truncate text-sm font-bold text-stone-900">
                        {processingAction === 'clock_in'
                            ? (isPaused ? 'Resuming Work' : 'Clocking In')
                            : hasOpenSession
                                ? 'Clocked In'
                                : isPaused
                                    ? 'On Break'
                                    : 'Clock In'}
                    </span>
                </div>

                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-400 shadow-sm">
                    {(hasOpenSession || isPaused) ? (
                        <ChevronUp
                            size={14}
                            className={`transition-transform ${open ? '' : 'rotate-180'}`}
                        />
                    ) : (
                        <Clock3 size={14} strokeWidth={2.4} />
                    )}
                </span>
            </button>

            <ConfirmationModal
                isOpen={showBreakConfirm}
                onClose={() => setShowBreakConfirm(false)}
                onConfirm={startBreak}
                title="Take Break?"
                message="This will pause your active session and return you to Workspace only. You can resume work anytime from the same attendance control."
                icon={PauseCircle}
                iconBg="bg-amber-100 text-amber-700"
                confirmText="Take Break"
                confirmColor="bg-amber-600 hover:bg-amber-700"
                processing={processingAction === 'pause'}
            />
        </div>
    );
};

const AttendanceActionButton = ({ icon: Icon, label, onClick, disabled, tone = 'default' }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
            tone === 'danger'
                ? 'border-red-100 bg-red-50/70 text-red-700 hover:bg-red-50'
                : 'border-stone-200 bg-stone-50/80 text-stone-700 hover:bg-stone-100'
        } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
    >
        <span className="flex items-center gap-2 text-xs font-bold">
            <Icon size={14} strokeWidth={2.4} />
            {label}
        </span>
    </button>
);

const formatElapsedTimer = (startedAt, currentTimestamp) => {
    if (!startedAt) {
        return null;
    }

    const startedAtMs = new Date(startedAt).getTime();

    if (Number.isNaN(startedAtMs)) {
        return null;
    }

    const totalSeconds = Math.max(0, Math.floor((currentTimestamp - startedAtMs) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(seconds).padStart(2, '0');

    if (hours > 0) {
        return `${hours}:${paddedMinutes}:${paddedSeconds}`;
    }

    return `${minutes}:${paddedSeconds}`;
};

const formatWorkedDayTimer = (baseSeconds, activeSessionStartedAt, hasOpenSession, currentTimestamp) => {
    const safeBaseSeconds = Math.max(0, Number(baseSeconds || 0));

    if (!hasOpenSession) {
        return formatDurationFromSeconds(safeBaseSeconds);
    }

    if (!activeSessionStartedAt) {
        return formatDurationFromSeconds(safeBaseSeconds);
    }

    const activeSessionStartedAtMs = new Date(activeSessionStartedAt).getTime();

    if (Number.isNaN(activeSessionStartedAtMs)) {
        return formatDurationFromSeconds(safeBaseSeconds);
    }

    const liveSessionSeconds = Math.max(0, Math.floor((currentTimestamp - activeSessionStartedAtMs) / 1000));

    return formatDurationFromSeconds(safeBaseSeconds + liveSessionSeconds);
};

const formatDurationFromSeconds = (totalSecondsValue) => {
    const totalSeconds = Math.max(0, Math.floor(Number(totalSecondsValue || 0)));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
    }

    if (minutes > 0) {
        return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
    }

    return `${seconds}s`;
};

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
