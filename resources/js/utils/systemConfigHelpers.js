export const formatMoney = (value) => 
    `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const planTierBadgeClasses = {
    Elite: 'bg-violet-50 text-violet-700 border-violet-200',
    Premium: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    Free: 'bg-stone-100 text-stone-600 border-stone-200',
};

export const changeDirectionBadgeClasses = {
    upgrade: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    downgrade: 'bg-amber-50 text-amber-700 border-amber-100',
    change: 'bg-stone-100 text-stone-600 border-stone-200',
};
