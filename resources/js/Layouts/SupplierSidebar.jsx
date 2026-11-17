import React, { memo, useState, useCallback, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { 
    LayoutDashboard, Package, ClipboardList, 
    ChevronLeft, X, Truck 
} from 'lucide-react';
import NavItem from '@/Components/Seller/Sidebar/NavItem';
import CategoryGroup from '@/Components/Seller/Sidebar/CategoryGroup';
import SidebarResizeHandle from '@/Components/Common/SidebarResizeHandle';

export default function SupplierSidebar({
    active = 'dashboard',
    user = null,
    mobileOpen = false,
    onClose = () => {},
    isCollapsed = false,
    onToggleCollapse = () => {},
    sidebarWidth = 220,
    isDragging = false,
    isDesktop = true,
    onStartResize = () => {},
    onResetWidth = () => {}
}) {
    const [activeTooltip, setActiveTooltip] = useState(null);

    const handleTooltipShow = useCallback((e, text) => {
        if (!isCollapsed) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setActiveTooltip({
            text: text || '',
            y: rect.top + rect.height / 2,
            x: rect.right + 12
        });
    }, [isCollapsed]);

    const handleTooltipLeave = useCallback(() => {
        setActiveTooltip(null);
    }, []);

    useEffect(() => {
        setActiveTooltip(null);
    }, [isCollapsed]);

    const renderNav = (isMobile = false) => {
        const collapsedState = isMobile ? false : isCollapsed;
        return (
            <div className="flex h-full flex-col justify-between select-none">
                {/* Brand Header */}
                <div className="shrink-0">
                    <div className={`relative flex items-center border-b border-stone-200/80 transition-all duration-300 ${
                        collapsedState ? 'p-3.5 justify-center' : 'px-4 py-3.5 justify-between'
                    }`}>
                        <Link 
                            href={route('supplier.dashboard')} 
                            className="flex items-center gap-2.5 min-w-0 group"
                            onMouseEnter={(e) => handleTooltipShow(e, 'LikhangKamay Wholesale Hub')}
                            onMouseLeave={handleTooltipLeave}
                        >
                            <img
                                src="/images/logo.png"
                                alt="LikhangKamay"
                                className="h-6 w-6 object-contain shrink-0 group-hover:scale-105 transition-transform"
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = '/images/placeholder.svg';
                                }}
                            />
                            {!collapsedState && (
                                <div className="flex flex-col min-w-0">
                                    <span className="font-serif text-sm font-bold text-stone-900 leading-tight tracking-tight truncate group-hover:text-clay-800 transition-colors">
                                        LikhangKamay
                                    </span>
                                    <span className="text-[9px] font-black uppercase tracking-wider text-teal-800 truncate">
                                        B2B Supplier Hub
                                    </span>
                                </div>
                            )}
                        </Link>

                        {/* Mobile Close Button */}
                        {isMobile && (
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close navigation"
                                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>

                    {/* Navigation Links */}
                    <nav className={`flex-1 min-h-0 overflow-y-auto py-2.5 space-y-2 custom-scrollbar ${
                        collapsedState ? 'px-1.5' : 'px-2.5'
                    }`}>
                        <CategoryGroup 
                            title="Wholesale" 
                            open={true} 
                            onToggle={() => {}} 
                            isCollapsed={collapsedState}
                        >
                            <NavItem
                                href={route('supplier.dashboard')}
                                icon={LayoutDashboard}
                                active={active === 'dashboard' || active === 'overview'}
                                isCollapsed={collapsedState}
                                onClick={isMobile ? onClose : undefined}
                                onMouseEnter={(e) => handleTooltipShow(e, 'Overview')}
                                onMouseLeave={handleTooltipLeave}
                            >
                                Overview
                            </NavItem>
                            <NavItem
                                href={route('supplier.materials.index')}
                                icon={Package}
                                active={active === 'materials'}
                                isCollapsed={collapsedState}
                                onClick={isMobile ? onClose : undefined}
                                onMouseEnter={(e) => handleTooltipShow(e, 'Raw Materials')}
                                onMouseLeave={handleTooltipLeave}
                            >
                                Raw Materials
                            </NavItem>
                            <NavItem
                                href={route('supplier.orders.index')}
                                icon={ClipboardList}
                                active={active === 'orders'}
                                isCollapsed={collapsedState}
                                onClick={isMobile ? onClose : undefined}
                                onMouseEnter={(e) => handleTooltipShow(e, 'Workshop Orders')}
                                onMouseLeave={handleTooltipLeave}
                            >
                                Workshop Orders
                            </NavItem>
                        </CategoryGroup>
                    </nav>
                </div>

                {/* Sidebar Footer: Subtle Network Badge */}
                {!collapsedState ? (
                    <div className="p-3 border-t border-stone-100 bg-[#FCFAF8] shrink-0">
                        <div className="px-2.5 py-1.5 rounded-lg bg-teal-50/70 border border-teal-100/70 flex items-center gap-2">
                            <Truck size={13} className="text-teal-700 shrink-0" />
                            <span className="text-[10px] font-bold text-teal-900 leading-tight truncate">
                                Cavite B2B Network
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="p-3 border-t border-stone-100 bg-[#FCFAF8] flex justify-center shrink-0">
                        <Truck size={15} className="text-teal-600" />
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            {/* Desktop Fixed Resizable Sidebar */}
            <aside
                style={{ width: `${isCollapsed ? 64 : sidebarWidth}px` }}
                className={`hidden lg:block fixed top-0 bottom-0 left-0 z-40 bg-white border-r border-stone-200/90 shadow-2xs select-none ${
                    isDragging ? 'transition-none' : 'transition-[width] duration-300 cubic-bezier(0.4, 0, 0.2, 1)'
                }`}
            >
                {/* Floating Desktop Collapse Toggle Button on Border */}
                <button
                    type="button"
                    onClick={() => onToggleCollapse(!isCollapsed)}
                    aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    className="absolute -right-3 top-6 z-[110] w-6 h-6 bg-white border border-stone-200 rounded-full flex items-center justify-center text-stone-400 hover:text-clay-600 shadow-sm hover:shadow-md transition-[color,box-shadow,transform] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30"
                >
                    <ChevronLeft
                        size={13}
                        className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
                    />
                </button>

                {renderNav(false)}

                {/* Resize Handle */}
                <SidebarResizeHandle
                    onMouseDown={onStartResize}
                    onDoubleClick={onResetWidth}
                    isDragging={isDragging}
                    isCollapsed={isCollapsed}
                />
            </aside>

            {/* Collapsed Mode Floating Tooltip */}
            {isCollapsed && activeTooltip && (
                <div
                    style={{
                        position: 'fixed',
                        top: `${activeTooltip.y}px`,
                        left: `${activeTooltip.x}px`,
                        transform: 'translateY(-50%)',
                        zIndex: 9999,
                    }}
                    className="pointer-events-none px-2.5 py-1.5 rounded-lg bg-stone-900 text-white text-[11px] font-bold shadow-xl border border-stone-700 whitespace-nowrap animate-in fade-in zoom-in-95 duration-100"
                >
                    {activeTooltip.text}
                </div>
            )}

            {/* Mobile Off-canvas Drawer */}
            {mobileOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity duration-200"
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    {/* Drawer Content */}
                    <div className="relative flex flex-col w-64 max-w-[80vw] h-full bg-white shadow-2xl z-10 animate-in slide-in-from-left duration-200">
                        {renderNav(true)}
                    </div>
                </div>
            )}
        </>
    );
}
