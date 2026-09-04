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
    CheckCircle2
} from 'lucide-react';

export const getActionIcon = (action) => {
    const act = (action || '').toLowerCase();
    if (act.includes('payout')) return Wallet;
    if (act.includes('branding') || act.includes('color')) return Palette;
    if (act.includes('setting') || act.includes('config')) return Settings;
    if (act.includes('maintenance') || act.includes('suspended') || act.includes('takedown') || act.includes('flag')) return ShieldAlert;
    if (act.includes('cache')) return Activity;
    if (act.includes('seo')) return Globe;
    if (act.includes('payment') || act.includes('gateway')) return CreditCard;
    if (act.includes('artisan_approved') || act.includes('artisan_accepted')) return UserCheck;
    if (act.includes('artisan_rejected')) return UserX;
    if (act.includes('artisan') || act.includes('user')) return Users;
    if (act.includes('product') || act.includes('catalog')) return ShoppingBag;
    if (act.includes('dispute') || act.includes('restore') || act.includes('item_restored')) return RotateCcw;
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
    if (act.includes('updated') || act.includes('changed') || act.includes('taxonomy')) {
        return 'text-clay-700 bg-clay-50 border-clay-200';
    }
    return 'text-stone-700 bg-stone-50 border-stone-200';
};

export const formatActionLabel = (action) => {
    if (!action) return 'Action';
    return action
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
};
