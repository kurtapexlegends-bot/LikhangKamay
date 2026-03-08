import React, { useState } from 'react'; 
import { Link, router, usePage } from '@inertiajs/react';
import { 
    LayoutDashboard, Package, ShoppingBag, BarChart3, Box, 
    Users, Banknote, MessageCircle, Settings, X,
    ClipboardList, Warehouse, FileQuestion, Sliders, Wallet, Star, Award, Crown, Sparkles, Zap
} from 'lucide-react';
import { PlanModal } from './PlanBadge';

export default function SellerSidebar({ active, user, mobileOpen = false, onClose = () => {} }) {
    // --- MODULE TOGGLE STATES (Read from DB) ---
    // If modules_enabled is null (first time), all default to false
    const savedModules = user?.modules_enabled || {};
    
    // Update: grab the new globally shared sellerSubscription
    const { sellerSubscription } = usePage().props;

    const isElite = user?.premium_tier === 'super_premium' || user?.subscription_plan === 'super_premium';
    const isPremium = user?.premium_tier === 'premium' || user?.subscription_plan === 'premium';

    // We keep local state for instant UI updates, but sync with DB
    const [modules, setModules] = useState({
        hr: !!savedModules.hr,
        accounting: !!savedModules.accounting,
        procurement: !!savedModules.procurement,
    });

    // Show/hide the module settings panel
    const [showModulePanel, setShowModulePanel] = useState(false);
    // Show/hide the plan modal
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

    // Toggle a specific module
    const toggleModule = (moduleName) => {
        const newState = !modules[moduleName];
        
        // Optimistic UI update
        const newModules = { ...modules, [moduleName]: newState };
        setModules(newModules);
        
        // Save to Database
        router.post(route('settings.modules'), newModules, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                // Success implies DB is updated
            },
            onError: () => {
                // Revert on error (optional, but good UX)
                setModules(prev => ({ ...prev, [moduleName]: !newState }));
                console.error("Failed to save module settings");
            }
        });
    };

    // Check if any module is enabled
    const hasActiveModules = modules.hr || modules.accounting || modules.procurement;
    const activeModuleCount = [modules.hr, modules.accounting, modules.procurement].filter(Boolean).length;

    return (
        <>
            {/* MOBILE BACKDROP (Only visible when open on mobile) */}
            {mobileOpen && (
                <div 
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
                    onClick={onClose}
                />
            )}

            <aside className={`fixed inset-y-0 left-0 z-50 w-56 bg-white border-r border-clay-100 flex flex-col transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                
                {/* --- BRAND HEADER --- */}
                <div className="px-5 py-3 border-b border-gray-50 shrink-0 bg-white/50 backdrop-blur-sm relative flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <img 
                            src="/images/logo.png" 
                            alt="LikhangKamay" 
                            className="w-7 h-7 object-contain"
                        />
                        <span className="font-serif text-lg font-bold text-gray-900 tracking-tight">LikhangKamay</span>
                    </div>

                    {/* Mobile Close Button */}
                    <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                    
                    {/* --- SMALL GEAR ICON (Desktop only or right aligned) --- */}
                    <button 
                        onClick={() => setShowModulePanel(!showModulePanel)}
                        className={`hidden lg:block ml-auto p-1.5 rounded-lg transition-all relative ${showModulePanel ? 'bg-clay-600 text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-clay-600'}`}
                        title="Customize Modules"
                    >
                        <Settings size={14} />
                        {activeModuleCount > 0 && !showModulePanel && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] bg-clay-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                                {activeModuleCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* --- FLOATING POPOVER PANEL (Updated) --- */}
                {showModulePanel && (
                    <>
                        {/* Backdrop to close on click outside */}
                        <div 
                            className="fixed inset-0 z-[60]" 
                            onClick={() => setShowModulePanel(false)}
                        />
                        
                        {/* The Panel - Responsive: Pop out on Desktop, constrained on Mobile */}
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
                                    description="Manage employees, attendance, and payslips."
                                    icon={Users}
                                    enabled={modules.hr} 
                                    onToggle={() => toggleModule('hr')} 
                                    color="bg-purple-100 text-purple-600"
                                />
                                <ModuleToggle 
                                    label="Accounting" 
                                    description="Track revenue, expenses, and fund requests."
                                    icon={Wallet}
                                    enabled={modules.accounting} 
                                    onToggle={() => toggleModule('accounting')} 
                                    color="bg-blue-100 text-blue-600"
                                />
                                <ModuleToggle 
                                    label="Procurement" 
                                    description="Manage inventory, supplies, and stock requests."
                                    icon={Warehouse}
                                    enabled={modules.procurement} 
                                    onToggle={() => toggleModule('procurement')} 
                                    color="bg-amber-100 text-amber-600"
                                />
                            </div>

                            {/* Footer Tip */}
                            <div className="mt-4 pt-3 border-t border-gray-50">
                                <p className="text-[10px] text-gray-400 text-center flex items-center justify-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Changes save automatically
                                </p>
                            </div>
                        </div>
                    </>
                )}

                {/* --- PLAN BADGE & LIMITS --- */}
                <div className="px-5 py-3 border-b flex-shrink-0 border-gray-50 bg-stone-50/30">
                    <button type="button" onClick={() => setIsPlanModalOpen(true)} className="block group w-full text-left">
                        {/* Badge */}
                        <div className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${isElite ? 'bg-violet-50 border-violet-200 text-violet-800 group-hover:bg-violet-100' : isPremium ? 'bg-amber-50 border-amber-200 text-amber-800 group-hover:bg-amber-100' : 'bg-stone-100 border-stone-200 text-stone-700 group-hover:bg-stone-200'}`}>
                            {isElite ? (
                                <Sparkles size={13} className="text-violet-500 fill-violet-200" />
                            ) : isPremium ? (
                                <Crown size={13} className="text-amber-500 fill-amber-200" />
                            ) : (
                                <Zap size={13} className="text-stone-400 fill-stone-200" />
                            )}
                            <span className="tracking-wide">{isElite ? 'Elite Plan' : isPremium ? 'Premium Plan' : 'Standard Plan'}</span>
                        </div>
                        
                        {/* Limit Progress */}
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
                                    <span className="text-[9px] text-red-500 font-medium leading-tight mt-0.5">Product limit reached. Upgrade to add more.</span>
                                )}
                            </div>
                        )}
                    </button>
                </div>

                <PlanModal 
                    isOpen={isPlanModalOpen} 
                    onClose={() => setIsPlanModalOpen(false)} 
                    currentTier={isElite ? 'super_premium' : isPremium ? 'premium' : 'free'} 
                />

                {/* --- NAVIGATION (Scrollable) --- */}
                <nav className="flex-1 px-3 py-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                    <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 mt-1">Core Operations</p>
                    <NavItem href={route('dashboard')} icon={LayoutDashboard} active={active === 'overview'} onClick={onClose}>Overview</NavItem>
                    <NavItem href={route('products.index')} icon={Package} active={active === 'products'} onClick={onClose}>Products</NavItem>
                    <NavItem href={route('analytics.index')} icon={BarChart3} active={active === 'analytics'} onClick={onClose}>Analytics</NavItem>
                    
                    <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 mt-5">CRM</p>
                    <NavItem href={route('orders.index')} icon={ShoppingBag} active={active === 'orders'} onClick={onClose}>Orders</NavItem>
                    <NavItem href={route('chat.index')} icon={MessageCircle} active={active === 'chat'} onClick={onClose}>Messages</NavItem>
                    <NavItem href={route('reviews.index')} icon={Star} active={active === 'reviews'} onClick={onClose}>Reviews</NavItem>
                    
                    <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 mt-5">Shop Appearance</p>
                    <NavItem href={route('shop.settings')} icon={Sliders} active={active === 'settings'} onClick={onClose}>Shop Settings</NavItem>

                    <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 mt-5">Marketing</p>
                    <NavItem href={route('seller.sponsorships')} icon={Award} active={active === 'sponsorships'} onClick={onClose}>Sponsorships</NavItem>

                    <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 mt-5">Creative Tools</p>
                    <NavItem href={route('3d.index')} icon={Box} active={active === '3d'} onClick={onClose}>3D Manager</NavItem>

                    {/* --- OPTIONAL MODULES (Shown when enabled) --- */}
                    <div className={`transition-all duration-500 ease-in-out overflow-hidden ${hasActiveModules ? 'max-h-96 opacity-100 mt-5' : 'max-h-0 opacity-0'}`}>
                        <p className="px-3 text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-2">Active Modules</p>
                        <div className="space-y-0.5 bg-clay-50/50 rounded-xl p-1.5 border border-clay-100/50">
                            
                            {/* HR Module */}
                            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${modules.hr ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                                <NavItem href={route('hr.index')} icon={Users} active={active === 'hr'} onClick={onClose}>HR</NavItem>
                            </div>

                                {/* Accounting Module */}
                            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${modules.accounting ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                                <NavItem href={route('accounting.index')} icon={Wallet} active={active === 'accounting'} onClick={onClose}>Accounting</NavItem>
                            </div>

                            {/* Procurement Module (with sub-items) */}
                            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${modules.procurement ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                                <p className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                    <ClipboardList size={11} /> Procurement
                                </p>
                                <div className="pl-2 space-y-0.5">
                                    <NavItem href={route('procurement.index')} icon={Warehouse} active={active === 'procurement'} compact onClick={onClose}>Inventory</NavItem>

                                    <NavItem href={route('stock-requests.index')} icon={FileQuestion} active={active === 'stock-requests'} compact onClick={onClose}>Stock Requests</NavItem>
                                </div>
                            </div>
                        </div>
                    </div>
                </nav>
            </aside>
        </>
    );
}

// Module Toggle Switch (Updated)
const ModuleToggle = ({ label, description, enabled, onToggle, icon: Icon, color }) => (
    <div 
        onClick={onToggle}
        className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 border ${enabled ? 'bg-clay-50 border-clay-100' : 'bg-white border-transparent hover:bg-gray-50'}`}
    >
        {/* Icon Box */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${enabled ? color : 'bg-gray-100 text-gray-400'}`}>
            {Icon && <Icon size={16} />}
        </div>

        <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
                <span className={`text-xs font-bold transition-colors ${enabled ? 'text-gray-900' : 'text-gray-500'}`}>
                    {label}
                </span>
                
                {/* Switch */}
                <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-300 ease-in-out flex-shrink-0 relative ${enabled ? 'bg-clay-600' : 'bg-gray-200'}`}>
                    <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${enabled ? 'translate-x-3.5' : 'translate-x-0'}`}></div>
                </div>
            </div>
            <p className="text-[10px] text-gray-400 leading-tight pr-2">{description}</p>
        </div>
    </div>
);

// Compact NavItem
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