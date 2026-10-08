import React from 'react';
import { 
    Search, User, Package, ShoppingCart, Box, 
    ClipboardList, Star, Award, ShoppingBag, FolderTree, Users, 
    TrendingUp, BarChart2, ShieldAlert, RotateCcw, Shield, 
    LayoutDashboard, MessageSquare, Settings, MapPin, 
    Clock, Tag, Mail, AlertCircle
} from 'lucide-react';

export const getSafeRoute = (name, params = {}) => {
    try {
        return route(name, params);
    } catch {
        return '#';
    }
};

export function getGlobalSearchCommands(effectiveScope, visibleModules = [], userRole) {
    if (effectiveScope === 'admin') {
        return [
            { label: 'Go to User Manager', cmd: '> users', url: getSafeRoute('admin.users.manager'), icon: Users, color: 'text-indigo-600 bg-indigo-50' },
            { label: 'Go to Artisan Applications', cmd: '> applications', url: getSafeRoute('admin.users.manager', { tab: 'approvals' }), icon: Award, color: 'text-amber-600 bg-amber-50' },
            { label: 'Go to Product Categories', cmd: '> categories', url: getSafeRoute('admin.settings.index', { tab: 'taxonomy' }), icon: FolderTree, color: 'text-rose-600 bg-rose-50' },
            { label: 'Go to Payouts & Fund Releases', cmd: '> payouts', url: getSafeRoute('admin.payouts.index'), icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Go to Email Studio & Templates', cmd: '> email', url: getSafeRoute('admin.settings.index', { tab: 'email' }), icon: Mail, color: 'text-sky-600 bg-sky-50' },
            { label: 'Go to Platform Revenue & Monetization', cmd: '> revenue', url: getSafeRoute('admin.settings.index', { tab: 'monetization' }), icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Go to Insights & Analytics', cmd: '> insights', url: getSafeRoute('admin.insights'), icon: BarChart2, color: 'text-purple-600 bg-purple-50' },
            { label: 'Go to Platform Operations & Audit', cmd: '> operations', url: getSafeRoute('admin.operations'), icon: Shield, color: 'text-clay-600 bg-clay-50' },
            { label: 'Go to Safety & Moderation Queue', cmd: '> moderation', url: getSafeRoute('admin.compliance', { tab: 'flags' }), icon: ShieldAlert, color: 'text-red-600 bg-red-50' },
            { label: 'Go to Order Disputes & Returns', cmd: '> disputes', url: getSafeRoute('admin.disputes.index'), icon: RotateCcw, color: 'text-rose-600 bg-rose-50' },
            { label: 'Go to Product Catalog Moderation', cmd: '> catalog', url: getSafeRoute('admin.catalog.index', { tab: 'moderation' }), icon: ShoppingBag, color: 'text-indigo-600 bg-indigo-50' },
            { label: 'Go to Sponsorship Manager', cmd: '> sponsorships', url: getSafeRoute('admin.catalog.index', { tab: 'sponsorships' }), icon: Star, color: 'text-amber-600 bg-amber-50' },
            { label: 'Go to Review Disputes Queue', cmd: '> review-disputes', url: getSafeRoute('admin.compliance', { tab: 'disputes' }), icon: MessageSquare, color: 'text-orange-600 bg-orange-50' },
            { label: 'Go to Trash & Restoration', cmd: '> trash', url: getSafeRoute('admin.compliance', { tab: 'trash' }), icon: AlertCircle, color: 'text-stone-600 bg-stone-100' },
            { label: 'Go to System Settings', cmd: '> settings', url: getSafeRoute('admin.settings.index'), icon: Settings, color: 'text-stone-600 bg-stone-50' },
            { label: 'Go to Admin Dashboard', cmd: '> dashboard', url: getSafeRoute('admin.dashboard'), icon: LayoutDashboard, color: 'text-stone-600 bg-stone-50' },
        ];
    }

    if (effectiveScope === 'seller') {
        return [
            { label: 'Go to Product Catalog', cmd: '> products', url: getSafeRoute('products.index'), icon: Package, color: 'text-rose-600 bg-rose-50', module: 'products' },
            { label: 'Go to Marketing Discounts', cmd: '> discounts', url: getSafeRoute('discounts.index'), icon: Tag, color: 'text-amber-600 bg-amber-50', module: 'discounts' },
            { label: 'Go to 3D Model Manager', cmd: '> 3d', url: getSafeRoute('3d.index'), icon: Box, color: 'text-indigo-600 bg-indigo-50', module: '3d' },
            { label: 'Go to Order Manager', cmd: '> orders', url: getSafeRoute('orders.index'), icon: ShoppingBag, color: 'text-emerald-600 bg-emerald-50', module: 'orders' },
            { label: 'Go to Materials Inventory & Supplies', cmd: '> inventory', url: getSafeRoute('procurement.index'), icon: Box, color: 'text-blue-600 bg-blue-50', module: 'procurement' },
            { label: 'Go to Stock Requests Queue', cmd: '> stock-requests', url: getSafeRoute('stock-requests.index'), icon: ClipboardList, color: 'text-clay-600 bg-clay-50', module: 'stock_requests' },
            { label: 'Go to Customer Reviews & Feedback', cmd: '> reviews', url: getSafeRoute('reviews.index'), icon: Star, color: 'text-amber-600 bg-amber-50', module: 'reviews' },
            { label: 'Go to Team Messages & Channels', cmd: '> team-messages', url: getSafeRoute('team-messages.index'), icon: MessageSquare, color: 'text-sky-600 bg-sky-50', module: 'team_messages' },
            { label: 'Go to Team Requests', cmd: '> approvals', url: getSafeRoute('seller.approvals.index'), icon: Shield, color: 'text-clay-600 bg-clay-50', module: 'approvals' },
            { label: 'Go to Featured Product Items', cmd: '> featured', url: getSafeRoute('seller.sponsorships'), icon: Award, color: 'text-indigo-600 bg-indigo-50', module: 'sponsorships', ownerOnly: true },
            { label: 'Go to Supply Hub', cmd: '> supply-hub', url: getSafeRoute('seller.supply-hub.index'), icon: Box, color: 'text-blue-600 bg-blue-50', module: 'supply_hub' },
            { label: 'Go to HR Employee Directory', cmd: '> hr', url: getSafeRoute('hr.index'), icon: Users, color: 'text-purple-600 bg-purple-50', module: 'hr' },
            { label: 'Go to Attendance & Shift Review', cmd: '> attendance', url: getSafeRoute('hr.index', { tab: 'timecard_audit' }), icon: Clock, color: 'text-purple-600 bg-purple-50', module: 'hr' },
            { label: 'Go to Payroll Runs & Ledger', cmd: '> payroll', url: getSafeRoute('hr.index', { tab: 'payroll' }), icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50', module: 'accounting' },
            { label: 'Go to Accounting & Financial Release', cmd: '> accounting', url: getSafeRoute('accounting.index'), icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50', module: 'accounting' },
            { label: 'Go to Performance Analytics', cmd: '> analytics', url: getSafeRoute('analytics.index'), icon: BarChart2, color: 'text-stone-600 bg-stone-50', module: 'analytics' },
            { label: 'Go to Shop Settings & Storefront', cmd: '> settings', url: getSafeRoute('shop.settings'), icon: Settings, color: 'text-stone-600 bg-stone-50', ownerOnly: true },
            { label: 'Go to Activity History & Audit Log', cmd: '> audit-log', url: getSafeRoute('audit-log.index'), icon: Shield, color: 'text-stone-600 bg-stone-50', ownerOnly: true },
            { label: 'Go to Subscription & Plan Quota', cmd: '> subscription', url: getSafeRoute('seller.subscription'), icon: Award, color: 'text-amber-600 bg-amber-50', ownerOnly: true },
        ].filter(cmd => {
            if (cmd.ownerOnly && userRole !== 'artisan') return false;
            if (cmd.module && !visibleModules.includes(cmd.module)) return false;
            return true;
        });
    }

    return [];
}

export const getResultIcon = (type) => {
    switch (type?.toLowerCase()) {
        case 'user': return <User size={15} />;
        case 'artisan application': return <Award size={15} />;
        case 'product': return <Package size={15} />;
        case 'discount': return <Tag size={15} />;
        case '3d model': return <Box size={15} />;
        case 'order': return <ShoppingCart size={15} />;
        case 'supply':
        case 'inventory': return <Box size={15} />;
        case 'stock request': return <ClipboardList size={15} />;
        case 'review': return <Star size={15} />;
        case 'sponsorship': return <Award size={15} />;
        case 'payout': return <TrendingUp size={15} />;
        case 'email template': return <Mail size={15} />;
        case 'category': return <FolderTree size={15} />;
        case 'moderation': return <ShieldAlert size={15} />;
        case 'dispute':
        case 'review dispute': return <RotateCcw size={15} />;
        case 'employee': return <Users size={15} />;
        case 'payroll': return <TrendingUp size={15} />;
        case 'team channel': return <MessageSquare size={15} />;
        case 'setting': return <Settings size={15} />;
        case 'workplace location': return <MapPin size={15} />;
        case 'activity log':
        case 'staff audit': return <Shield size={15} />;
        case 'module': return <LayoutDashboard size={15} />;
        default: return <Search size={15} />;
    }
};
