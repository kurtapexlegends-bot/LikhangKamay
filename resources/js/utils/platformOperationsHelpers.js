import { 
    Palette, 
    Settings, 
    ShieldAlert, 
    Activity, 
    Globe, 
    CreditCard, 
    Shield 
} from 'lucide-react';

export const getActionIcon = (action) => {
    if (action.includes('branding') || action.includes('color')) return Palette;
    if (action.includes('setting') || action.includes('config')) return Settings;
    if (action.includes('maintenance')) return ShieldAlert;
    if (action.includes('cache')) return Activity;
    if (action.includes('seo')) return Globe;
    if (action.includes('payment') || action.includes('gateway')) return CreditCard;
    return Shield;
};

export const getActionColor = (action) => {
    if (action.includes('purged') || action.includes('deleted')) return 'text-amber-600 bg-amber-50 border-amber-100';
    if (action.includes('updated') || action.includes('changed')) return 'text-clay-600 bg-clay-50 border-clay-100';
    if (action.includes('enabled')) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (action.includes('disabled')) return 'text-rose-600 bg-rose-50 border-rose-100';
    return 'text-stone-600 bg-stone-50 border-stone-100';
};
