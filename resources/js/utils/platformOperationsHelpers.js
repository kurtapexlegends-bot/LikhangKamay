import { 
    Palette, 
    Settings, 
    ShieldAlert, 
    Activity, 
    Globe, 
    CreditCard, 
    Shield,
    Wallet,
    ShoppingBag,
    UserCheck,
    UserX,
    Users,
    RotateCcw,
    FolderTree,
    Award,
    Trash2,
    CheckCircle2,
    Mail,
    Scale
} from 'lucide-react';

const ACTION_LABELS = {
    // Payouts & Disbursements
    'payout_disbursed': 'Payout Released',
    'payout.disbursed': 'Payout Released',
    'payout_requested': 'Payout Requested',
    'payout_failed': 'Payout Processing Failed',
    'payout_cancelled': 'Payout Cancelled',
    
    // Artisans & Verification
    'artisan_registered': 'New Shop Application',
    'artisan.registered': 'New Shop Application',
    'artisan_approved': 'Artisan Approved',
    'artisan.approved': 'Artisan Approved',
    'artisan_rejected': 'Application Revision Requested',
    'artisan.rejected': 'Application Revision Requested',
    'artisan_suspended': 'Artisan Suspended',
    
    // Catalog & Products
    'product_approved': 'Listing Approved',
    'product.approved': 'Listing Approved',
    'product_rejected': 'Listing Revision Requested',
    'product_takedown': 'Listing Suspended',
    'product.takedown': 'Listing Suspended',
    'product_restored': 'Listing Restored',
    
    // Orders & Fulfillment
    'order_placed': 'New Order Placed',
    'order.placed': 'New Order Placed',
    'order_status_changed': 'Order Status Updated',
    'order.status_updated': 'Order Status Updated',
    'order.cancelled': 'Order Cancelled',
    
    // Disputes & Resolutions
    'dispute_arbitrated': 'Dispute Resolved',
    'dispute.arbitrated': 'Dispute Resolved',
    'dispute_opened': 'Dispute Opened',
    'review_dispute_resolved': 'Dispute Resolved',
    'review_dispute_dismissed': 'Dispute Dismissed',
    
    // User Governance & Moderation
    'suspend_user': 'Account Suspended',
    'reactivate_user': 'Account Reactivated',
    'user_suspended': 'Account Suspended',
    'user_impersonation': 'Admin Impersonation',
    'content_flagged': 'Item Flagged for Review',
    'content_flag_resolved': 'Content Flag Resolved',
    'content_flag_dismissed': 'Content Flag Dismissed',
    
    // System Settings & Communication
    'BRANDING_UPDATE': 'Store Branding Updated',
    'branding_update': 'Store Branding Updated',
    'MAINTENANCE_TOGGLE': 'Store Maintenance Updated',
    'maintenance_toggle': 'Store Maintenance Updated',
    'EMAIL_DISPATCH': 'Email Notification Sent',
    'email_dispatch': 'Email Notification Sent',
    'EMAIL_TEMPLATE_SAVED': 'Email Template Saved',
    'email_template_saved': 'Email Template Saved',
    'settings_updated': 'System Settings Updated',
    'cache_cleared': 'System Cache Cleared',
    'item_restored': 'Deleted Record Restored',
    'item_permanently_deleted': 'Record Permanently Removed',
};

export const getActionIcon = (action) => {
    const act = (action || '').toLowerCase();
    if (act.includes('payout')) return Wallet;
    if (act.includes('branding') || act.includes('color')) return Palette;
    if (act.includes('setting') || act.includes('config')) return Settings;
    if (act.includes('email')) return Mail;
    if (act.includes('maintenance') || act.includes('suspended') || act.includes('takedown') || act.includes('flag')) return ShieldAlert;
    if (act.includes('cache')) return Activity;
    if (act.includes('seo')) return Globe;
    if (act.includes('payment') || act.includes('gateway')) return CreditCard;
    if (act.includes('artisan_approved') || act.includes('artisan.approved') || act.includes('artisan_accepted')) return UserCheck;
    if (act.includes('artisan_rejected') || act.includes('artisan.rejected')) return UserX;
    if (act.includes('artisan') || act.includes('user')) return Users;
    if (act.includes('product') || act.includes('catalog')) return ShoppingBag;
    if (act.includes('dispute')) return Scale;
    if (act.includes('restore') || act.includes('item_restored')) return RotateCcw;
    if (act.includes('sponsorship')) return Award;
    if (act.includes('taxonomy') || act.includes('category')) return FolderTree;
    if (act.includes('deleted') || act.includes('trash')) return Trash2;
    if (act.includes('verified') || act.includes('resolved') || act.includes('completed')) return CheckCircle2;
    return Shield;
};

export const getActionColor = (action) => {
    const act = (action || '').toLowerCase();
    if (act.includes('restored') || act.includes('approved') || act.includes('disbursed') || act.includes('enabled') || act.includes('resolved')) {
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    }
    if (act.includes('rejected') || act.includes('deleted') || act.includes('disabled') || act.includes('suspended') || act.includes('takedown')) {
        return 'text-rose-700 bg-rose-50 border-rose-200';
    }
    if (act.includes('purged') || act.includes('flagged') || act.includes('dispute') || act.includes('pending') || act.includes('warning')) {
        return 'text-amber-700 bg-amber-50 border-amber-200';
    }
    if (act.includes('updated') || act.includes('changed') || act.includes('taxonomy') || act.includes('template')) {
        return 'text-clay-700 bg-clay-50 border-clay-200';
    }
    return 'text-stone-700 bg-stone-50 border-stone-200';
};

export const formatActionLabel = (action) => {
    if (!action) return 'Activity Record';
    if (ACTION_LABELS[action]) return ACTION_LABELS[action];

    // Generic fallback: clean punctuation and title case
    return action
        .replace(/[._]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const formatCurrency = (amount) => {
    const num = Number(amount);
    if (isNaN(num)) return '₱0.00';
    return `₱${num.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

export const getHumanReadableMetadata = (metadata) => {
    if (!metadata || typeof metadata !== 'object') return [];

    const hiddenKeys = new Set([
        'subject_type',
        'subject_id',
        'diff',
        'ip_address',
        'user_agent',
        'artisan_id',
        'order_id',
        'payout_id',
        'dispute_id',
        'user_id',
        'gateway_transaction_id'
    ]);

    const items = [];

    for (const [key, rawValue] of Object.entries(metadata)) {
        // Skip hidden internal keys or empty/null values
        if (hiddenKeys.has(key)) continue;
        if (rawValue === null || rawValue === undefined || rawValue === '') continue;
        if (typeof rawValue === 'object') continue;

        let label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        let formattedValue = String(rawValue);

        // Format currencies
        if (['amount', 'net_amount', 'total_amount', 'gross_amount', 'fee'].includes(key) && !isNaN(rawValue)) {
            label = key === 'net_amount' ? 'Net Amount' : 'Amount';
            formattedValue = formatCurrency(rawValue);
        } else if (key === 'shop_name') {
            label = 'Shop';
        } else if (key === 'reference_number') {
            label = 'Reference';
        } else if (key === 'channel') {
            label = 'Channel';
            formattedValue = String(rawValue).toUpperCase();
        } else if (key === 'tracking_number') {
            label = 'Tracking #';
        } else if (typeof rawValue === 'boolean') {
            formattedValue = rawValue ? 'Yes' : 'No';
        }

        items.push({ key, label, value: formattedValue });
    }

    return items;
};
